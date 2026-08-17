const express = require('express');
const router = express.Router();
const { prisma } = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

function getMonthRange(month) {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));
  return { start, end };
}

function mapCommission(c) {
  return {
    id: c.id,
    leadId: c.leadId,
    leadName: c.lead?.name || '',
    agentId: c.agentId,
    agentName: c.agent?.name || '',
    propertyTitle: c.propertyTitle,
    propertyPrice: Number(c.propertyPrice),
    percentage: Number(c.percentage),
    amount: Number(c.amount),
    status: c.status,
    notes: c.notes,
    createdAt: c.createdAt,
    paidAt: c.paidAt
  };
}

async function createCommissionNotifications(commission, tenantId) {
  // Las comisiones son tema del dueño del negocio: notificar SOLO a roles
  // administrativos (admin/manager/supervisor/superadmin), nunca a agentes.
  const agent = await prisma.user.findUnique({
    where: { id: commission.agentId },
    select: { id: true, name: true }
  });

  if (!agent) {
    console.warn(`[commissions] Agente ${commission.agentId} no existe, no se notifica`);
    return;
  }

  const admins = await prisma.user.findMany({
    where: { tenantId, role: { not: 'agent' }, isActive: true },
    select: { id: true }
  });

  if (admins.length === 0) {
    console.warn('[commissions] No hay roles administrativos activos, no se notifica');
    return;
  }

  const propertyTitle = commission.propertyTitle || 'una propiedad';
  const description = `Se registró una comisión de $${Number(commission.amount).toLocaleString()} para ${agent.name} en ${propertyTitle}`;

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        tenantId,
        userId: admin.id,
        type: 'commission_pending',
        title: 'Nueva comisión pendiente',
        description,
        leadId: commission.leadId
      }
    });
  }
}

async function checkOverdueCommissions(tenantId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const overdueCount = await prisma.commission.count({
    where: {
      tenantId,
      status: 'pending',
      createdAt: { lt: sevenDaysAgo }
    }
  });

  if (overdueCount === 0) return;

  const admins = await prisma.user.findMany({
    where: { tenantId, role: { not: 'agent' }, isActive: true },
    select: { id: true }
  });

  for (const admin of admins) {
    // Dedupe: no crear si ya existe una notificación 'commission_overdue' no leída para este usuario
    const existing = await prisma.notification.findFirst({
      where: {
        tenantId,
        userId: admin.id,
        type: 'commission_overdue',
        read: false
      }
    });

    if (existing) continue;

    const description = `Tenés ${overdueCount} comisión(es) pendiente(s) con más de 7 días de antigüedad.`;

    await prisma.notification.create({
      data: {
        tenantId,
        userId: admin.id,
        type: 'commission_overdue',
        title: 'Comisiones vencidas',
        description
      }
    });
  }
}

router.get('/detail', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'Formato de mes inválido. Use YYYY-MM.' });
    }

    const { start, end } = getMonthRange(month);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const agentId = req.query.agentId;

    if (agentId && !UUID_REGEX.test(agentId)) {
      return res.status(400).json({ error: 'Formato de UUID inválido para agentId' });
    }

    const where = {
      tenantId: req.tenantId,
      createdAt: { gte: start, lte: end }
    };
    if (agentId) where.agentId = agentId;

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: { lead: { select: { name: true } }, agent: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.commission.count({ where })
    ]);

    res.json({
      commissions: commissions.map(mapCommission),
      total,
      page,
      limit
    });
  } catch (error) {
    console.warn('Error in GET /commissions/detail:', error);
    res.status(500).json({ error: 'Error al obtener detalle de comisiones' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const configs = await prisma.agentCommissionConfig.findMany({
      where: { tenantId: req.tenantId },
      include: { agent: { select: { name: true, email: true } } }
    });

    res.json(configs.map(c => ({
      id: c.id,
      agentId: c.agentId,
      agentName: c.agent?.name || '',
      agentEmail: c.agent?.email || '',
      percentage: Number(c.percentage),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    })));
  } catch (error) {
    console.warn('Error in GET /commissions/config:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
});

router.post('/config', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  try {
    const { agentId, percentage } = req.body;

    if (!agentId || percentage === undefined || percentage === null) {
      return res.status(400).json({ error: 'agentId y percentage son requeridos' });
    }

    const agent = await prisma.user.findFirst({
      where: { id: agentId, tenantId: req.tenantId }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agente no encontrado' });
    }

    const config = await prisma.agentCommissionConfig.create({
      data: {
        tenantId: req.tenantId,
        agentId,
        percentage: parseFloat(percentage)
      },
      include: { agent: { select: { name: true, email: true } } }
    });

    res.status(201).json({
      id: config.id,
      agentId: config.agentId,
      agentName: config.agent?.name || '',
      agentEmail: config.agent?.email || '',
      percentage: Number(config.percentage),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe una configuración para este agente' });
    }
    console.warn('Error in POST /commissions/config:', error);
    res.status(500).json({ error: 'Error al crear configuración' });
  }
});

router.delete('/config/:agentId', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  try {
    const config = await prisma.agentCommissionConfig.findUnique({
      where: {
        tenantId_agentId: {
          tenantId: req.tenantId,
          agentId: req.params.agentId
        }
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    await prisma.agentCommissionConfig.delete({
      where: { id: config.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.warn('Error in DELETE /commissions/config/:agentId:', error);
    res.status(500).json({ error: 'Error al eliminar configuración' });
  }
});

router.put('/config/:agentId', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  try {
    const { percentage } = req.body;

    if (percentage === undefined || percentage === null) {
      return res.status(400).json({ error: 'percentage es requerido' });
    }

    const config = await prisma.agentCommissionConfig.findUnique({
      where: {
        tenantId_agentId: {
          tenantId: req.tenantId,
          agentId: req.params.agentId
        }
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    const updated = await prisma.agentCommissionConfig.update({
      where: { id: config.id },
      data: { percentage: parseFloat(percentage) },
      include: { agent: { select: { name: true, email: true } } }
    });

    res.json({
      id: updated.id,
      agentId: updated.agentId,
      agentName: updated.agent?.name || '',
      agentEmail: updated.agent?.email || '',
      percentage: Number(updated.percentage),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    console.warn('Error in PUT /commissions/config/:agentId:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

router.get('/', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'Formato de mes inválido. Use YYYY-MM.' });
    }

    const { start, end } = getMonthRange(month);

    const commissions = await prisma.commission.findMany({
      where: {
        tenantId: req.tenantId,
        createdAt: { gte: start, lte: end }
      },
      include: { agent: { select: { name: true, email: true } } }
    });

    const agentMap = new Map();
    for (const c of commissions) {
      const agentId = c.agentId;
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agentId,
          agentName: c.agent?.name || '',
          agentEmail: c.agent?.email || '',
          closures: 0,
          pending: 0,
          paid: 0,
          total: 0
        });
      }
      const entry = agentMap.get(agentId);
      entry.closures++;
      const amount = Number(c.amount);
      entry.total += amount;
      if (c.status === 'pending') entry.pending += amount;
      if (c.status === 'paid') entry.paid += amount;
    }

    const agents = Array.from(agentMap.values());
    const totalGenerated = agents.reduce((s, a) => s + a.total, 0);
    const totalPending = agents.reduce((s, a) => s + a.pending, 0);
    const totalPaid = agents.reduce((s, a) => s + a.paid, 0);
    const totalClosures = agents.reduce((s, a) => s + a.closures, 0);

    checkOverdueCommissions(req.tenantId).catch(err => {
      console.warn('Error in overdue check:', err);
    });

    res.json({ totalGenerated, totalPending, totalPaid, totalClosures, agents });
  } catch (error) {
    console.warn('Error in GET /commissions:', error);
    res.status(500).json({ error: 'Error al obtener resumen de comisiones' });
  }
});

router.post('/', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  try {
    const { agentId, leadId, amount, percentage, propertyTitle, propertyPrice, notes } = req.body;

    if (!agentId || !leadId || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'agentId, leadId y amount son requeridos' });
    }

    const [agent, lead] = await Promise.all([
      prisma.user.findFirst({ where: { id: agentId, tenantId: req.tenantId } }),
      prisma.lead.findFirst({ where: { id: leadId, tenantId: req.tenantId } })
    ]);

    if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    let finalPercentage = percentage;
    if (finalPercentage === undefined || finalPercentage === null) {
      const config = await prisma.agentCommissionConfig.findUnique({
        where: { tenantId_agentId: { tenantId: req.tenantId, agentId } }
      });
      finalPercentage = config?.percentage || 3.0;
    }

    const commission = await prisma.commission.create({
      data: {
        tenantId: req.tenantId,
        leadId,
        agentId,
        propertyTitle: propertyTitle || null,
        propertyPrice: propertyPrice ? parseFloat(propertyPrice) : 0,
        percentage: parseFloat(finalPercentage),
        amount: parseFloat(amount),
        notes: notes || null,
        status: 'pending'
      }
    });

    createCommissionNotifications(commission, req.tenantId).catch(err => {
      console.warn('Error creating commission notifications:', err);
    });

    res.status(201).json({
      id: commission.id,
      leadId: commission.leadId,
      agentId: commission.agentId,
      propertyTitle: commission.propertyTitle,
      propertyPrice: Number(commission.propertyPrice),
      percentage: Number(commission.percentage),
      amount: Number(commission.amount),
      notes: commission.notes,
      status: commission.status,
      createdAt: commission.createdAt,
      paidAt: commission.paidAt
    });
  } catch (error) {
    console.warn('Error in POST /commissions:', error);
    res.status(500).json({ error: 'Error al crear comisión' });
  }
});

router.put('/:id', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }

  try {
    const commission = await prisma.commission.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!commission) {
      return res.status(404).json({ error: 'Comisión no encontrada' });
    }

    const { amount, notes, status } = req.body;

    if (commission.status === 'paid' && amount !== undefined && Number(amount) !== Number(commission.amount)) {
      return res.status(400).json({ error: 'No se puede modificar el monto de una comisión pagada' });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'paid' && commission.status !== 'paid') {
        updateData.paidAt = new Date();
      }
    }

    const updated = await prisma.commission.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      id: updated.id,
      leadId: updated.leadId,
      agentId: updated.agentId,
      propertyTitle: updated.propertyTitle,
      propertyPrice: Number(updated.propertyPrice),
      percentage: Number(updated.percentage),
      amount: Number(updated.amount),
      notes: updated.notes,
      status: updated.status,
      createdAt: updated.createdAt,
      paidAt: updated.paidAt,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    console.warn('Error in PUT /commissions/:id:', error);
    res.status(500).json({ error: 'Error al actualizar comisión' });
  }
});

module.exports = { router, createCommissionNotifications };
