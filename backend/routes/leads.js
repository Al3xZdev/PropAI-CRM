// Leads Routes - Multi-tenant con Prisma
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { requireAuth } = require('./auth');
const { sanitizeLead, validateLead, sanitizeString, isValidUUID } = require('../utils/validation');
const { calculateScore } = require('../services/leadScoringService');
const permissionsService = require('../services/permissionsService');
const { logAuditEvent } = require('../middleware/auditLogger');
const logger = require('../services/logger');

// Helper para logging de auditoría — mapea argumentos a logAuditEvent
async function auditLog(req, action, resource, resourceId, success, details = null) {
  if (!req.userId) return
  await logAuditEvent({
    tenantId: req.tenantId,
    userId: req.userId,
    userEmail: req.user?.email,
    userName: req.user?.name,
    userRole: req.user?.role,
    action: action.toLowerCase(),
    resource,
    resourceId,
    details,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
    success,
    errorMessage: success ? null : (details?.error || null)
  }).catch(err => logger.error({ err }, 'audit log error'))
}

// Apply auth middleware to all routes
router.use(requireAuth);

// RBAC: Only managers and admins can create/update/delete leads
router.post('/', async (req, res) => {
  try {
    const leadData = sanitizeLead(req.body);
    const validation = validateLead(leadData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const lead = await prisma.lead.create({
      data: {
        ...leadData,
        id: uuidv4(),
        tenantId: req.tenantId,
        assignedTo: leadData.assignedTo || req.userId,
      },
      include: { property: true, assignedUser: { select: { id: true, name: true, email: true } } }
    });

    await auditLog(req, 'CREATE', 'lead', lead.id, true, { name: leadData.name, email: leadData.email });

    res.status(201).json(lead);
  } catch (error) {
    await auditLog(req, 'CREATE', 'lead', null, false, { error: error.message });
    logger.error({ err: error }, 'creating lead');
    res.status(500).json({ error: 'Error al crear lead' });
  }
});

/**
 * GET /api/leads
 * Get leads for the current user (filtered by role)
 */
router.get('/', async (req, res) => {
  try {
    const { propertyInterest, status, channel } = req.query;
    
    const where = { tenantId: req.tenantId };
    
    // AGENTS can only see their assigned leads
    const hasFullRead = await permissionsService.hasPermission(req.userId, 'leads', 'read');
    const userRole = req.user?.role;
    
    // If user is NOT admin/manager AND does NOT have full read permission, filter by assignedTo
    if (userRole === 'agent' || (!hasFullRead && userRole !== 'admin' && userRole !== 'manager')) {
      where.assignedTo = req.userId;
    }
    
    if (propertyInterest) where.propertyInterest = propertyInterest;
    if (status) where.status = status;
    if (channel) where.channel = channel;
    
    const leads = await prisma.lead.findMany({
      where,
      include: {
        property: {
          select: { id: true, title: true, propertyType: true }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Add computed automation fields and scoring
    const leadsWithAutomation = leads.map(lead => {
      const hasFollowUps = lead.automationStartedAt !== null;
      let automationDay = 0;
      if (lead.automationStartedAt) {
        const daysSinceStart = Math.floor((Date.now() - new Date(lead.automationStartedAt).getTime()) / (1000 * 60 * 60 * 24));
        automationDay = Math.min(daysSinceStart, 30); // Cap at 30 days
      }
      
      return {
        ...lead,
        inAutomation: hasFollowUps,
        automationDay,
        automationPaused: lead.automationPaused,
        scoring: calculateScore(lead)
      };
    });
    
    res.json({ leads: leadsWithAutomation });
  } catch (error) {
    logger.error({ err: error }, 'fetching leads');
    res.status(500).json({ error: 'Error al obtener leads' });
  }
});

/**
 * GET /api/leads/stats/summary
 * Get lead statistics for the dashboard (filtered by role)
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userRole = req.user?.role;
    
    // Build where clause based on role
    let baseWhere = { tenantId };
    let leadFilter = { tenantId };
    
    // Agents only see their own leads
    if (userRole === 'agent') {
      baseWhere.assignedTo = req.userId;
      leadFilter.assignedTo = req.userId;
    }
    
    // Get counts by status
    const [total, nuevos, contactados, responded, visitados, realizados, perdidos] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({ where: { ...baseWhere, status: 'nuevo' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'contactado' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'respondio' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'visita_agendada' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'visita_realizada' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'perdido' } })
    ]);
    
    // Get counts by channel
    const byChannel = await prisma.lead.groupBy({
      by: ['channel'],
      where: baseWhere,
      _count: true
    });
    
    // Get recent leads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentLeads = await prisma.lead.count({
      where: {
        ...leadFilter,
        createdAt: { gte: sevenDaysAgo }
      }
    });
    
    res.json({
      total,
      nuevos,
      contactados,
      responded,
      visitados,
      realizados,
      perdidos,
      recentLeads,
      byChannel: byChannel.reduce((acc, item) => {
        acc[item.channel || 'unknown'] = item._count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error({ err: error }, 'fetching leads stats');
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/leads/:id
 * Get a single lead
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: {
        property: true,
        conversations: {
          include: {
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 50
            }
          }
        },
        followUps: {
          orderBy: { day: 'asc' }
        }
      }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    
    res.json({ lead });
  } catch (error) {
    logger.error({ err: error }, 'fetching lead');
    res.status(500).json({ error: 'Error al obtener el lead' });
  }
});
/**
 * PUT /api/leads/:id
 * Update a lead - managers and admins only
 */
router.put('/:id', async (req, res) => {
  try {
    // Verify lead belongs to tenant
    const existing = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    const { name, email, phone, channel, status, propertyInterest, propertyId, propertyTitle, source, notes } = req.body;

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(channel && { channel }),
        ...(status && { status }),
        ...(propertyInterest !== undefined && { propertyInterest }),
        ...(propertyId !== undefined && { propertyId }),
        ...(propertyTitle !== undefined && { propertyTitle }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        lastContact: status === 'contactado' || status === 'respondio' ? new Date() : undefined
      }
    });
    
    res.json({ success: true, lead: updatedLead });
  } catch (error) {
    logger.error({ err: error }, 'updating lead');
    res.status(500).json({ error: 'Error al actualizar el lead' });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead - managers and admins only
 */
router.delete('/:id', async (req, res) => {
  try {
    // Verify lead belongs to tenant
    const existing = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    await prisma.lead.delete({
      where: { id: req.params.id }
    });
    
    await auditLog(req, 'DELETE', 'lead', req.params.id, true, { name: existing.name, email: existing.email });
    
    res.json({ success: true, message: 'Lead eliminado' });
  } catch (error) {
    await auditLog(req, 'DELETE', 'lead', req.params.id, false, { error: error.message });
    logger.error({ err: error }, 'deleting lead');
    res.status(500).json({ error: 'Error al eliminar el lead' });
  }
});

/**
 * POST /api/leads/:id/followups
 * Add a follow-up to a lead
 */
router.post('/:id/followups', async (req, res) => {
  try {
    const { day, channel, message } = req.body;
    
    if (!day || !channel || !message) {
      return res.status(400).json({ error: 'Día, canal y mensaje son requeridos' });
    }

    // Verify lead belongs to tenant
    const existing = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId: req.params.id,
        day,
        channel,
        message,
        automated: false
      }
    });
    
    res.status(201).json({ success: true, followUp });
  } catch (error) {
    logger.error({ err: error }, 'adding follow-up');
    res.status(500).json({ error: 'Error al agregar follow-up' });
  }
});

/**
 * POST /api/leads/:id/start-automation
 * Start automation for a lead
 */
router.post('/:id/start-automation', async (req, res) => {
  try {
    const { sequenceId } = req.body;

    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    const leadSequence = await prisma.leadSequence.create({
      data: {
        leadId: req.params.id,
        sequenceId: sequenceId || null,
        currentStep: 0
      }
    });

    await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        inAutomation: true,
        automationPaused: false,
        automationStartedAt: new Date()
      }
    });
    
    res.json({ success: true, message: 'Automatización iniciada' });
  } catch (error) {
    logger.error({ err: error }, 'starting automation');
    res.status(500).json({ error: 'Error al iniciar automatización' });
  }
});

/**
 * POST /api/leads/:id/pause-automation
 * Pause automation for a lead
 */
router.post('/:id/pause-automation', async (req, res) => {
  try {
    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        automationPaused: true,
        automationExitReason: 'paused_by_user'
      }
    });
    
    res.json({ success: true, message: 'Automatización pausada' });
  } catch (error) {
    logger.error({ err: error }, 'pausing automation');
    res.status(500).json({ error: 'Error al pausar automatización' });
  }
});

/**
 * PUT /api/leads/:id/status
 * Update lead status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const validStatuses = ['nuevo', 'contactado', 'respondio', 'visita_agendada', 'visita_realizada', 'cerrado', 'perdido'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Estado inválido',
        validStatuses
      });
    }
    
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Guardar historial de cambio de estado
    await prisma.leadStatusHistory.create({
      data: {
        leadId: lead.id,
        tenantId: lead.tenantId,
        userId: req.user?.id || null,
        previousStatus: lead.status,
        newStatus: status,
        reason: reason || null
      }
    });
    
    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { 
        status,
        lastContact: ['contactado', 'respondio', 'visita_agendada', 'visita_realizada', 'cerrado'].includes(status) ? new Date() : undefined
      }
    });
    
    res.json({ success: true, lead: updatedLead });
  } catch (error) {
    logger.error({ err: error }, 'updating status');
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

/**
 * Get lead timeline/history
 */
router.get('/:id/timeline', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        followUps: { orderBy: { scheduledAt: 'desc' } },
        conversations: { 
          include: { 
            messages: { orderBy: { sentAt: 'asc' } } 
          } 
        }
      }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    
    // Build timeline from follow-ups (map to frontend format)
    const timeline = lead.followUps.map(f => {
      const label = f.type === 'automated' ? 'Mensaje automático' :
                    f.type === 'automated_failed' ? 'Mensaje automático (falló)' :
                    f.type === 'manual' ? 'Mensaje manual' :
                    f.type || 'Seguimiento';
      return {
        id: f.id,
        type: 'followup',
        subtype: f.type,
        label,
        description: f.note || '',
        message: f.note || '',
        status: f.completedAt ? 'sent' : 'pending',
        channel: lead.channel || 'whatsapp',
        sentAt: f.createdAt,
        scheduledAt: f.scheduledAt
      };
    });
    
    // Add conversation messages to timeline
    lead.conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        timeline.push({
          id: msg.id,
          type: 'message',
          status: msg.direction === 'inbound' ? 'received' : 'sent',
          label: msg.direction === 'inbound' ? 'Respuesta recibida' : 'Mensaje enviado',
          description: msg.content || '',
          message: msg.content || '',
          channel: msg.channel,
          sentAt: msg.sentAt
        });
      });
    });
    
    // Sort by date
    timeline.sort((a, b) => new Date(b.sentAt || b.scheduledAt || 0) - new Date(a.sentAt || a.scheduledAt || 0));
    
    res.json({ timeline });
  } catch (error) {
    logger.error({ err: error }, 'getting timeline');
    res.status(500).json({ error: 'Error al obtener timeline' });
  }
});

module.exports = router;