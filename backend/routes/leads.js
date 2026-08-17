// Leads Routes - Multi-tenant con Prisma
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { requireAuth } = require('./auth');
const { sanitizeLead, validateLead, sanitizeString, isValidUUID, normalizePhone } = require('../utils/validation');
const { calculateScore } = require('../services/leadScoringService');
const permissionsService = require('../services/permissionsService');
const { createCommissionForClosedLead } = require('../services/commissionService');
const { ensurePropertyInPrisma } = require('../services/propertySyncService');

// Apply auth middleware to all routes
router.use(requireAuth);

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
    console.error('Error fetching leads:', error);
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
    console.error('Error fetching leads stats:', error);
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
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Error al obtener el lead' });
  }
});

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', async (req, res) => {
  try {
    // Validate input
    const validation = validateLead(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Datos de lead inválidos',
        details: validation.errors 
      });
    }
    
    // Sanitize input
    const cleanLead = sanitizeLead(req.body);
    
    const { name, email, phone, channel, propertyInterest, propertyId, propertyTitle, source, notes } = cleanLead;

    // Validar propertyId si se proporciona
    // Si la propiedad solo existe en el JSON, la sincronizamos a Prisma
    // para que la FK de Lead.propertyId no falle.
    let validPropertyId = null;
    if (propertyId && isValidUUID(propertyId)) {
      const synced = await ensurePropertyInPrisma(propertyId, req.tenantId);
      if (synced) {
        validPropertyId = propertyId;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId: req.tenantId,
        name,
        email,
        phone,
        channel: channel || 'formulario',
        propertyInterest,
        propertyId: validPropertyId,
        propertyTitle,
        source: source || 'Manual',
        notes,
        status: 'nuevo'
      }
    });
    
    console.log(`✅ Lead created: ${name}`);
    
    res.status(201).json({ success: true, lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Error al crear el lead' });
  }
});

/**
 * PUT /api/leads/:id
 * Update a lead
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

    // Si se vincula una propiedad que solo existe en el JSON, la sincronizamos
    // a Prisma primero para que la FK no falle.
    let finalPropertyId = propertyId;
    if (propertyId) {
      const synced = await ensurePropertyInPrisma(propertyId, req.tenantId);
      if (!synced) {
        return res.status(400).json({ error: 'La propiedad seleccionada no existe' });
      }
      finalPropertyId = propertyId;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone: normalizePhone(phone) }),
        ...(channel && { channel }),
        ...(status && { status }),
        ...(propertyInterest !== undefined && { propertyInterest }),
        ...(propertyId !== undefined && { propertyId: finalPropertyId }),
        ...(propertyTitle !== undefined && { propertyTitle }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        lastContact: status === 'contactado' || status === 'respondio' ? new Date() : undefined
      }
    });
    
    res.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Error al actualizar el lead' });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead
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
    
    res.json({ success: true, message: 'Lead eliminado' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Error al eliminar el lead' });
  }
});

/**
 * POST /api/leads/:id/followups
 * Add a follow-up to a lead
 */
router.post('/:id/followups', async (req, res) => {
  try {
    const { type, note, message, scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'La fecha programada es requerida' });
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
        tenantId: req.tenantId,
        leadId: req.params.id,
        createdBy: req.userId,
        type: type || 'manual',
        note: note || message || null,
        scheduledAt: new Date(scheduledAt)
      }
    });
    
    res.status(201).json({ success: true, followUp });
  } catch (error) {
    console.error('Error adding follow-up:', error);
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
    console.error('Error starting automation:', error);
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
    console.error('Error pausing automation:', error);
    res.status(500).json({ error: 'Error al pausar automatización' });
  }
});

/**
 * POST /api/leads/:id/automation/pause
 * Pause automation for a lead (alias for /:id/pause-automation)
 */
router.post('/:id/automation/pause', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    await prisma.lead.update({
      where: { id: req.params.id },
      data: { automationPaused: true, automationExitReason: 'paused_by_user' }
    });
    res.json({ success: true, message: 'Automatización pausada' });
  } catch (error) {
    console.error('Error pausing automation:', error);
    res.status(500).json({ error: 'Error al pausar automatización' });
  }
});

/**
 * POST /api/leads/:id/automation/resume
 * Resume automation for a lead
 */
router.post('/:id/automation/resume', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    await prisma.lead.update({
      where: { id: req.params.id },
      data: { automationPaused: false }
    });
    res.json({ success: true, message: 'Automatización reanudada' });
  } catch (error) {
    console.error('Error resuming automation:', error);
    res.status(500).json({ error: 'Error al reanudar automatización' });
  }
});

/**
 * POST /api/leads/:id/automation/stop
 * Stop automation for a lead
 */
router.post('/:id/automation/stop', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        inAutomation: false,
        automationPaused: false,
        automationExitedAt: new Date(),
        automationExitReason: 'stopped_by_user'
      }
    });
    res.json({ success: true, message: 'Automatización detenida' });
  } catch (error) {
    console.error('Error stopping automation:', error);
    res.status(500).json({ error: 'Error al detener automatización' });
  }
});

/**
 * POST /api/leads/:id/stop-automation
 * Stop automation for a lead
 */
router.post('/:id/stop-automation', async (req, res) => {
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
        inAutomation: false,
        automationPaused: false,
        automationExitedAt: new Date(),
        automationExitReason: 'stopped_by_user'
      }
    });
    
    // Also delete any lead sequences
    await prisma.leadSequence.deleteMany({
      where: { leadId: req.params.id }
    });
    
    res.json({ success: true, message: 'Automatización detenida' });
  } catch (error) {
    console.error('Error stopping automation:', error);
    res.status(500).json({ error: 'Error al detener automatización' });
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
    
    // Estados que implican que el lead respondió o cerró: sale de la automatización
    const isResponded = ['respondio', 'visita_agendada', 'visita_realizada', 'cerrado', 'perdido'].includes(status);
    
    const updatedLead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { 
        status,
        lastContact: ['contactado', 'respondio', 'visita_agendada', 'visita_realizada', 'cerrado'].includes(status) ? new Date() : undefined,
        ...(isResponded ? {
          inAutomation: false,
          automationPaused: false,
          automationExitedAt: new Date(),
          automationExitReason: 'lead_responded'
        } : {})
      }
    });

    const responseData = { success: true, lead: updatedLead };

    if (status === 'cerrado') {
      try {
        const commissionResult = await createCommissionForClosedLead(updatedLead, req.tenantId);
        responseData.commissionCreated = commissionResult.created;
        if (commissionResult.created) {
          responseData.commission = commissionResult.commission;
        } else {
          responseData.commissionReason = commissionResult.reason;
        }
      } catch (err) {
        console.warn('Error creating commission for closed lead:', err);
        responseData.commissionCreated = false;
        responseData.commissionReason = 'error';
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error updating status:', error);
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
    console.error('Error getting timeline:', error);
    res.status(500).json({ error: 'Error al obtener timeline' });
  }
});

module.exports = router;