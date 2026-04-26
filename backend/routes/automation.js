// Automation Routes - Multi-tenant con Prisma
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { requireAuth } = require('./auth');
const { generateMessagesForStep, generateAlternativeMessages, generateFollowUpPlan } = require('../services/messageGenerator');

// =============================================================================
// UTILITY: Replace variables in message templates
// =============================================================================
async function replaceMessageVariables(message, leadId) {
  // Get lead with property and user relations
  const lead = await prisma.lead.findFirst({
    where: { id: leadId },
    include: {
      property: true,
      assignedUser: { select: { name: true } }
    }
  });

  if (!lead) return message;

  const firstName = lead.name?.split(' ')[0] || '';
  const propertyTitle = lead.propertyTitle || lead.propertyInterest || (lead.property?.title || '');
  const propertyPrice = lead.property?.price ? Number(lead.property.price).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '';
  const propertyAddress = lead.property?.address || '';
  const agentName = lead.assignedUser?.name || lead.assignedTo || 'Tu Asesor';
  
  const today = new Date().toLocaleDateString('es-AR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return message
    // Nombre variations
    .replace(/{{nombre}}/g, firstName)
    .replace(/{{name}}/g, firstName)
    // Propiedad
    .replace(/{{propiedad}}/g, propertyTitle)
    .replace(/{{propertyTitle}}/g, propertyTitle)
    .replace(/{{property}}/g, propertyTitle)
    // Precio
    .replace(/{{precio}}/g, propertyPrice)
    .replace(/{{price}}/g, propertyPrice)
    // Agente
    .replace(/{{agente}}/g, agentName)
    .replace(/{{agentName}}/g, agentName)
    .replace(/{{agente}}/g, agentName)
    // Dirección
    .replace(/{{direccion}}/g, propertyAddress)
    .replace(/{{address}}/g, propertyAddress)
    // Fecha
    .replace(/{{fecha}}/g, today)
    .replace(/{{date}}/g, today);
}

// =============================================================================
// ROUTES
// =============================================================================

// Apply auth to all routes
router.use(requireAuth);

// ==========================================
// SEQUENCES CRUD
// ==========================================

/**
 * GET /api/automation/sequences
 * Get all sequences for the tenant
 */
router.get('/sequences', async (req, res) => {
  try {
    const sequences = await prisma.sequence.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, sequences });
  } catch (error) {
    console.error('Error getting sequences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automation/sequences/:id
 * Get single sequence
 */
router.get('/sequences/:id', async (req, res) => {
  try {
    const sequence = await prisma.sequence.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: {
        leadSequences: {
          include: {
            lead: true
          }
        }
      }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    res.json({ success: true, sequence });
  } catch (error) {
    console.error('Error getting sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/sequences
 * Create new sequence - SOLO UN CANAL POR SECUENCIA
 */
router.post('/sequences', async (req, res) => {
  try {
    const { name, description, steps, isActive, channel } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Validar que el canal sea uno de los válidos
    const validChannels = ['whatsapp', 'instagram', 'messenger', 'email'];
    if (!channel || !validChannels.includes(channel)) {
      return res.status(400).json({ 
        error: 'El canal es requerido y debe ser uno de: whatsapp, instagram, messenger, email',
        validChannels
      });
    }

    const sequence = await prisma.sequence.create({
      data: {
        tenantId: req.tenantId,
        name,
        description,
        channel, // Ahora es obligatorio
        steps: steps || [],
        isActive: isActive !== false,
        isPaused: false
      }
    });
    
    res.status(201).json({ success: true, sequence });
  } catch (error) {
    console.error('Error creating sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/automation/sequences/:id
 * Update sequence
 */
router.put('/sequences/:id', async (req, res) => {
  try {
    const { name, description, steps, isActive, isPaused } = req.body;
    
    const existing = await prisma.sequence.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }

    const sequence = await prisma.sequence.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(steps && { steps }),
        ...(isActive !== undefined && { isActive }),
        ...(isPaused !== undefined && { isPaused })
      }
});
    
    res.json({ success: true, sequences });
  } catch (error) {
    console.error('Error getting sequences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automation/check-lead/:leadId
 * Check if lead is in any active sequence
 */
router.get('/check-lead/:leadId', requireAuth, async (req, res) => {
  try {
    const leadId = req.params.leadId;
    
    const leadSequences = await prisma.leadSequence.findMany({
      where: {
        leadId,
        completedAt: null
      },
      include: {
        sequence: true
      }
    });

    const activeSequences = leadSequences.filter(ls => 
      !ls.completedAt && ls.sequence.isActive && !ls.sequence.isPaused
    );

    if (activeSequences.length > 0) {
      return res.json({
        inSequence: true,
        sequences: activeSequences.map(s => ({
          id: s.sequence.id,
          name: s.sequence.name,
          channel: s.sequence.channel,
          currentStep: s.currentStep,
          startedAt: s.startedAt
        }))
      });
    }

    res.json({ inSequence: false, sequences: [] });
  } catch (error) {
    console.error('Error checking lead sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automation/sequences/:id
 * Get single sequence
 */
router.delete('/sequences/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.sequence.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }

    // Delete all leadSequence records for this sequence
    await prisma.leadSequence.deleteMany({
      where: { sequenceId: req.params.id }
    });

    // Update leads that were in this sequence
    const leadsInSeq = await prisma.leadSequence.findMany({
      where: { sequenceId: req.params.id },
      select: { leadId: true }
    });
    const leadIds = leadsInSeq.map(ls => ls.leadId);
    if (leadIds.length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { inAutomation: false, automationStartedAt: null }
      });
    }

    await prisma.sequence.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true, message: 'Secuencia eliminada' });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LEAD SEQUENCES
// ==========================================

/**
 * GET /api/automation/lead-sequences/:leadId
 * Get sequences for a lead
 */
router.get('/lead-sequences/:leadId', async (req, res) => {
  try {
    const leadSequences = await prisma.leadSequence.findMany({
      where: {
        leadId: req.params.leadId,
        lead: { tenantId: req.tenantId }
      },
      include: {
        sequence: true
      }
    });
    
    res.json({ success: true, leadSequences });
  } catch (error) {
    console.error('Error getting lead sequences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/lead-sequences
 * Add lead to sequence
 */
router.post('/lead-sequences', async (req, res) => {
  try {
    const { leadId, sequenceId } = req.body;
    
    if (!leadId || !sequenceId) {
      return res.status(400).json({ error: 'Lead y secuencia son requeridos' });
    }

    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Verify sequence belongs to tenant
    const sequence = await prisma.sequence.findFirst({
      where: { id: sequenceId, tenantId: req.tenantId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }

    // Check if already in sequence
    const existing = await prisma.leadSequence.findUnique({
      where: { leadId_sequenceId: { leadId, sequenceId } }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'El lead ya está en esta secuencia' });
    }

    const leadSequence = await prisma.leadSequence.create({
      data: {
        leadId,
        sequenceId,
        currentStep: 0
      }
    });

    // Update lead automation status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        inAutomation: true,
        automationPaused: false,
        automationStartedAt: new Date()
      }
    });
    
    res.status(201).json({ success: true, leadSequence });
  } catch (error) {
    console.error('Error adding lead to sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/automation/lead-sequences/:id
 * Remove lead from sequence
 */
router.delete('/lead-sequences/:id', async (req, res) => {
  try {
    const leadSequence = await prisma.leadSequence.findFirst({
      where: { 
        id: req.params.id,
        lead: { tenantId: req.tenantId }
      }
    });
    
    if (!leadSequence) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    await prisma.leadSequence.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true, message: 'Lead removido de la secuencia' });
  } catch (error) {
    console.error('Error removing lead from sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MESSAGE GENERATION
// ==========================================

/**
 * POST /api/automation/generate-messages
 * Generate messages for a sequence step
 */
router.post('/generate-messages', async (req, res) => {
  try {
    const { lead, step, property } = req.body;
    
    const messages = generateMessagesForStep(lead, step, property);
    const alternatives = generateAlternativeMessages(lead, step);
    
    res.json({ 
      success: true, 
      messages,
      alternatives 
    });
  } catch (error) {
    console.error('Error generating messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/generate-followup-plan
 * Generate follow-up plan for a lead
 */
router.post('/generate-followup-plan', async (req, res) => {
  try {
    const { lead, property, channels } = req.body;
    
    const plan = generateFollowUpPlan(lead, property, channels);
    
    res.json({ 
      success: true, 
      plan 
    });
  } catch (error) {
    console.error('Error generating follow-up plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LOGS
// ==========================================

/**
 * GET /api/automation/logs
 * Get automation logs
 */
router.get('/logs', requireAuth, async (req, res) => {
  try {
    // Get logs from leads that have automation history
    const leadsWithAutomation = await prisma.lead.findMany({
      where: { 
        tenantId: req.tenantId,
        automationStartedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        automationStartedAt: true,
        automationExitedAt: true,
        automationExitReason: true,
        followUps: {
          select: {
            id: true,
            day: true,
            channel: true,
            message: true,
            sentAt: true
          }
        }
      }
    });
    
    // Transform to log format
    const logs = [];
    leadsWithAutomation.forEach(lead => {
      lead.followUps.forEach(followUp => {
        logs.push({
          id: followUp.id,
          leadId: lead.id,
          leadName: lead.name,
          channel: followUp.channel,
          message: followUp.message,
          day: followUp.day,
          sentAt: followUp.sentAt
        });
      });
    });
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/generate-alternatives
 * Generate alternative messages for a step
 */
router.post('/generate-alternatives', requireAuth, async (req, res) => {
  try {
    const { step, lead } = req.body;
    
    const alternatives = generateAlternativeMessages(step, lead);
    
    res.json({ 
      success: true, 
      alternatives 
    });
  } catch (error) {
    console.error('Error generating alternatives:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/send
 * Send a message using real messaging services
 */
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { lead, channel, message, stepId, sequenceId } = req.body;
    
    // Get lead ID - accept either leadId or lead object
    const leadId = lead?.id || req.body.leadId;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead no especificado' });
    }
    
    // Verify lead belongs to tenant
    const leadData = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });
    
    if (!leadData) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    
    // Import messaging services
    const whatsappService = require('../services/whatsappService');
    const instagramService = require('../services/instagramService');
    const messengerService = require('../services/messengerService');
    const { sendEmail } = require('../services/emailService');
    
    let result = { success: false, error: 'Canal no soportado' };
    
    // Send based on channel
    if (channel === 'whatsapp') {
      if (!leadData.phone) {
        return res.status(400).json({ error: 'Lead sin número de teléfono' });
      }
      const phone = leadData.phone.replace(/\D/g, '');
      result = await whatsappService.sendTextMessage(phone, message);
      
    } else if (channel === 'instagram') {
      const instagramId = leadData.instagramId || leadData.sourceDetail;
      if (!instagramId) {
        return res.status(400).json({ error: 'Lead sin Instagram ID' });
      }
      result = await instagramService.sendTextMessage(instagramId, message);
      
    } else if (channel === 'messenger') {
      const facebookId = leadData.facebookId || leadData.sourceDetail;
      if (!facebookId) {
        return res.status(400).json({ error: 'Lead sin Facebook ID' });
      }
      result = await messengerService.sendTextMessage(facebookId, message);
      
    } else if (channel === 'email') {
      if (!leadData.email) {
        return res.status(400).json({ error: 'Lead sin email' });
      }
      result = await sendEmail({
        to: leadData.email,
        subject: 'Seguimiento de tu interés',
        text: message,
        html: message.replace(/\n/g, '<br>'),
        leadId: leadData.id,
        tenantId: leadData.tenantId
      });
    }
    
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Error al enviar mensaje' });
    }
    
    // Create a follow-up record
    const followUp = await prisma.followUp.create({
      data: {
        leadId: leadData.id,
        day: stepId || 1,
        channel,
        message,
        automated: true,
        sentAt: new Date(),
        whatsappMessageId: result.messageId || null
      }
    });
    
    // Update lead last contact
    await prisma.lead.update({
      where: { id: leadData.id },
      data: { lastContact: new Date() }
    });
    
    res.json({ 
      success: true, 
      message: `Mensaje enviado por ${channel}`,
      followUp,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/automation/sequences/:id/leads
 * Get leads in a sequence with their step progress
 */
router.get('/sequences/:id/leads', requireAuth, async (req, res) => {
  try {
    const sequence = await prisma.sequence.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }

    // Parse steps from sequence
    const steps = typeof sequence.steps === 'string'
      ? JSON.parse(sequence.steps)
      : (sequence.steps || []);

    const leadSequences = await prisma.leadSequence.findMany({
      where: {
        sequenceId: req.params.id,
        lead: { tenantId: req.tenantId }
      },
      include: {
        lead: {
          include: {
            property: { select: { title: true, price: true, address: true } }
          }
        }
      }
    });

    // Map leads with their progress info
    const leads = leadSequences.map(ls => {
      const currentStepIndex = ls.currentStep || 0;
      const currentStep = steps[currentStepIndex] || null;
      const nextStep = steps[currentStepIndex + 1] || null;
      const totalSteps = steps.length;

      return {
        ...ls.lead,
        // Progress info
        currentStep: ls.currentStep,
        currentDay: currentStep?.day || 1,
        currentStepLabel: currentStep?.name || currentStep?.label || `Día ${currentStep?.day || 1}`,
        currentStepMessage: currentStep?.message || '',
        nextStepDay: nextStep?.day || null,
        nextStepLabel: nextStep?.name || nextStep?.label || null,
        totalSteps,
        // Channel of the sequence (not the lead's acquisition channel)
        sequenceChannel: sequence.channel,
        // Metadata
        startedAt: ls.startedAt,
        pausedAt: ls.pausedAt,
        completedAt: ls.completedAt
      };
    });

    res.json({
      success: true,
      leadIds: leadSequences.map(ls => ls.leadId),
      leads,
      sequence: {
        id: sequence.id,
        name: sequence.name,
        channel: sequence.channel,
        isActive: sequence.isActive,
        isPaused: sequence.isPaused,
        steps
      }
    });
  } catch (error) {
    console.error('Error getting leads in sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/sequences/:id/leads
 * Add multiple leads to a sequence
 */
router.post('/sequences/:id/leads', requireAuth, async (req, res) => {
  try {
    const { leadIds } = req.body;
    const sequenceId = req.params.id;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Se requieren leadIds (array)' });
    }
    
    // Verify sequence belongs to tenant
    const sequence = await prisma.sequence.findFirst({
      where: { id: sequenceId, tenantId: req.tenantId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    
    // Verify all leads belong to tenant
    const leads = await prisma.lead.findMany({
      where: { 
        id: { in: leadIds },
        tenantId: req.tenantId 
      }
    });
    
    if (leads.length !== leadIds.length) {
      return res.status(400).json({ error: 'Algunos leads no existen o no pertenecen a tu tenant' });
    }
    
    // ===== RESTRICCIÓN: Verificar que los leads no estén en otras secuencias =====
    const leadsInOtherSequences = await prisma.leadSequence.findMany({
      where: {
        leadId: { in: leadIds },
        completedAt: null, // Solo secuencias activas (no completadas)
        sequenceId: { not: sequenceId } // Excluir la secuencia actual
      },
      include: {
        sequence: { select: { name: true } }
      }
    });
    
    if (leadsInOtherSequences.length > 0) {
      const conflictLeads = leadsInOtherSequences.map(ls => {
        const lead = leads.find(l => l.id === ls.leadId);
        return `${lead?.name || ls.leadId} (en secuencia "${ls.sequence.name}")`;
      }).join(', ');
      
      return res.status(400).json({ 
        error: `Los siguientes leads ya están en otras secuencias y no pueden ser agregados hasta que terminen o salgan: ${conflictLeads}`
      });
    }
    // ===== FIN RESTRICCIÓN =====
    
    // Get existing lead sequences to avoid duplicates (en la misma secuencia)
    const existing = await prisma.leadSequence.findMany({
      where: {
        sequenceId,
        leadId: { in: leadIds }
      }
    });
    
    const existingLeadIds = existing.map(e => e.leadId);
    const newLeadIds = leadIds.filter(id => !existingLeadIds.includes(id));
    
    // Create new lead sequences (use individual creates to handle optional fields)
    if (newLeadIds.length > 0) {
      for (const leadId of newLeadIds) {
        await prisma.leadSequence.create({
          data: {
            leadId,
            sequenceId,
            userId: req.user?.id || null,
            currentStep: 0
          }
        });
      }
      
      // Update leads to mark them as in automation
      await prisma.lead.updateMany({
        where: { id: { in: newLeadIds } },
        data: { 
          inAutomation: true,
          automationStartedAt: new Date()
        }
      });
    }
    
    const addedCount = newLeadIds.length;
    const alreadyInCount = leadIds.length - addedCount;
    
    res.json({ 
      success: true, 
      message: `${addedCount} lead(s) agregado(s) a la secuencia. ${alreadyInCount} ya estaban en la secuencia.`,
      addedCount,
      alreadyInCount
    });
  } catch (error) {
    console.error('Error adding leads to sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/automation/sequences/:id/leads/:leadId
 * Remove a lead from a sequence
 */
router.delete('/sequences/:id/leads/:leadId', requireAuth, async (req, res) => {
  try {
    const { id: sequenceId, leadId } = req.params;

    // Verify sequence belongs to tenant
    const sequence = await prisma.sequence.findFirst({
      where: { id: sequenceId, tenantId: req.tenantId }
    });

    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }

    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Delete the leadSequence record
    const deleted = await prisma.leadSequence.deleteMany({
      where: {
        leadId,
        sequenceId
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'El lead no está en esta secuencia' });
    }

    // Check if lead is in any other sequences
    const otherSequences = await prisma.leadSequence.count({
      where: { leadId }
    });

    // If not in any sequence, update lead status
    if (otherSequences === 0) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          inAutomation: false,
          automationStartedAt: null
        }
      });
    }

    res.json({ success: true, message: 'Lead removido de la secuencia' });
  } catch (error) {
    console.error('Error removing lead from sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/sequences/:id/start
 * Add lead to sequence AND send first message immediately
 */
router.post('/sequences/:id/start', requireAuth, async (req, res) => {
  try {
    const { leadId } = req.body;
    
    // Get sequence
    const sequence = await prisma.sequence.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    
    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Check if lead is already in ANOTHER active sequence (different from current one)
    // If the lead is in THIS sequence (added but not started), we update it — that's fine
    const existingLeadSeqs = await prisma.leadSequence.findMany({
      where: {
        leadId,
        completedAt: null,
        sequenceId: { not: req.params.id }
      },
      include: {
        sequence: true
      }
    });

    const activeOtherSeq = existingLeadSeqs.find(ls =>
      !ls.completedAt && ls.sequence.isActive && !ls.sequence.isPaused
    );

    if (activeOtherSeq) {
      return res.status(400).json({
        error: `El lead ya está en la secuencia activa "${activeOtherSeq.sequence.name}". No puede estar en más de una secuencia a la vez.`
      });
    }

    // Verify lead has the required data for this channel
    if (sequence.channel === 'whatsapp' && !lead.phone) {
      return res.status(400).json({ error: 'El lead no tiene número de WhatsApp' });
    }
    if (sequence.channel === 'instagram' && !lead.instagramId && !lead.sourceDetail) {
      return res.status(400).json({ error: 'El lead no tiene Instagram vinculado' });
    }
    if (sequence.channel === 'messenger' && !lead.facebookId && !lead.sourceDetail) {
      return res.status(400).json({ error: 'El lead no tiene Facebook vinculado' });
    }
    if (sequence.channel === 'email' && !lead.email) {
      return res.status(400).json({ error: 'El lead no tiene email' });
    }

    // Parse steps
    const steps = typeof sequence.steps === 'string' 
      ? JSON.parse(sequence.steps) 
      : sequence.steps || [];
    
    const firstStep = steps.find(s => s.day === 1) || steps[0];
    
    if (!firstStep || !firstStep.message) {
      return res.status(400).json({ error: 'La secuencia no tiene un mensaje para el día 1' });
    }

    // Import messaging services
    const whatsappService = require('../services/whatsappService');
    const instagramService = require('../services/instagramService');
    const messengerService = require('../services/messengerService');
    const { sendEmail } = require('../services/emailService');

    // Replace variables in message
    let message = await replaceMessageVariables(firstStep.message, lead.id);

    // Send message based on channel
    let result = { success: false, error: 'Canal no soportado' };
    const channel = sequence.channel;

    if (channel === 'whatsapp') {
      const phone = lead.phone.replace(/\D/g, '');
      result = await whatsappService.sendTextMessage(phone, message);
    } else if (channel === 'instagram') {
      const instagramId = lead.instagramId || lead.sourceDetail;
      result = await instagramService.sendTextMessage(instagramId, message);
    } else if (channel === 'messenger') {
      const facebookId = lead.facebookId || lead.sourceDetail;
      result = await messengerService.sendTextMessage(facebookId, message);
    } else if (channel === 'email') {
      result = await sendEmail({
        to: lead.email,
        subject: firstStep.label || 'Bienvenido',
        text: message,
        html: message.replace(/\n/g, '<br>'),
        leadId: lead.id,
        tenantId: lead.tenantId
      });
    }

    // If message send fails, log but continue — sequence is still registered
    if (!result.success) {
      console.warn(`Send failed for lead ${leadId} via ${channel}: ${result.error} — sequence will still be registered`);
    }

    // Create or update lead sequence (upsert in case it was already added via /leads endpoint)
    const leadSequence = await prisma.leadSequence.upsert({
      where: {
        leadId_sequenceId: { leadId, sequenceId: req.params.id }
      },
      create: {
        leadId,
        sequenceId: req.params.id,
        userId: req.user?.id || null,
        currentStep: 1,
        startedAt: new Date()
      },
      update: {
        currentStep: 1,
        startedAt: new Date(),
        completedAt: null
      }
    });

    // Create follow-up record with correct schema fields
    await prisma.followUp.create({
      data: {
        tenantId: req.tenantId,
        leadId,
        type: result.success ? 'automated' : 'automated_failed',
        note: message,
        scheduledAt: new Date(),
        completedAt: result.success ? new Date() : null
      }
    });

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        inAutomation: true,
        automationPaused: false,
        automationStartedAt: new Date(),
        lastContact: result.success ? new Date() : undefined
      }
    });

    res.json({
      success: true,
      message: result.success
        ? `Secuencia iniciada. El lead recibió el mensaje del día 1 por ${channel}.`
        : 'Secuencia iniciada (envío de mensaje falló, se reintentará más tarde).',
      leadSequence,
      sent: result.success,
      messageId: result.messageId
    });

    // Create notification
    if (result.success) {
      await prisma.notification.create({
        data: {
          tenantId: req.tenantId,
          userId: req.user?.id || null,
          type: 'message_sent',
          title: 'Secuencia iniciada',
          description: `El lead ${lead.name} recibió el mensaje del día 1 por ${channel}`,
          leadId: lead.id,
          channel: channel
        }
      });
    }

    console.log(`🚀 Secuencia "${sequence.name}" iniciada para ${lead.name} — Día 1 enviado: ${result.success} por ${channel}`);
  } catch (error) {
    console.error('Error starting sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/sequences/:id/execute
 * Execute a sequence for a lead
 */
router.post('/sequences/:id/execute', requireAuth, async (req, res) => {
  try {
    const { leadId } = req.body;
    
    // Get sequence
    const sequence = await prisma.sequence.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    
    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    
    // Add lead to sequence
    const leadSequence = await prisma.leadSequence.upsert({
      where: {
        leadId_sequenceId: { leadId, sequenceId: req.params.id }
      },
      create: {
        leadId,
        sequenceId: req.params.id,
        currentStep: 0
      },
      update: {
        currentStep: 0
      }
    });
    
    // Update lead automation status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        inAutomation: true,
        automationPaused: false,
        automationStartedAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Secuencia iniciada para el lead',
      leadSequence 
    });
  } catch (error) {
    console.error('Error executing sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/sequences/:id/pause
 * Pause a sequence
 */
router.post('/sequences/:id/pause', requireAuth, async (req, res) => {
  try {
    const { leadId } = req.body;
    
    // Update sequence
    const sequence = await prisma.sequence.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    
    if (leadId) {
      // Pause for specific lead
      await prisma.lead.update({
        where: { id: leadId },
        data: { automationPaused: true }
      });
    } else {
      // Pause sequence globally
      await prisma.sequence.update({
        where: { id: req.params.id },
        data: { isPaused: true }
      });
    }
    
    res.json({ success: true, message: 'Secuencia pausada' });
  } catch (error) {
    console.error('Error pausing sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/sequences/:id/resume
 * Resume a sequence
 */
router.post('/sequences/:id/resume', requireAuth, async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (leadId) {
      // Resume for specific lead
      await prisma.lead.update({
        where: { id: leadId },
        data: { automationPaused: false }
      });
    } else {
      // Resume sequence globally
      await prisma.sequence.update({
        where: { id: req.params.id },
        data: { isPaused: false }
      });
    }
    
    res.json({ success: true, message: 'Secuencia reanudada' });
  } catch (error) {
    console.error('Error resuming sequence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/leads/:id/automation/start
 * Start automation for a lead - VALIDAR QUE NO ESTÉ EN OTRA SECUENCIA ACTIVA
 */
router.post('/leads/:id/start-automation', requireAuth, async (req, res) => {
  try {
    const { sequenceId } = req.body;
    
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Obtener la secuencia para verificar el canal
    const sequence = await prisma.sequence.findFirst({
      where: { id: sequenceId, tenantId: req.tenantId }
    });

    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }

    // VALIDACIÓN 1: Verificar que el lead tenga datos para el canal de la secuencia
    if (sequence.channel === 'whatsapp' && !lead.phone) {
      return res.status(400).json({ error: 'El lead no tiene número de WhatsApp' });
    }
    if (sequence.channel === 'instagram' && !lead.instagramId && !lead.sourceDetail) {
      return res.status(400).json({ error: 'El lead no tiene Instagram vinculado' });
    }
    if (sequence.channel === 'messenger' && !lead.facebookId && !lead.sourceDetail) {
      return res.status(400).json({ error: 'El lead no tiene Facebook vinculado' });
    }
    if (sequence.channel === 'email' && !lead.email) {
      return res.status(400).json({ error: 'El lead no tiene email' });
    }

    // VALIDACIÓN 2: Verificar que el lead no esté ya en otra secuencia activa
    const existingSequences = await prisma.leadSequence.findMany({
      where: {
        leadId: req.params.id,
        completedAt: null // No completada
      },
      include: {
        sequence: true
      }
    });

    // Filtrar secuencias que aún están activas (no completadas, no pausadas por el lead)
    const activeSequences = existingSequences.filter(ls => 
      !ls.completedAt && ls.sequence.isActive && !ls.sequence.isPaused
    );

    if (activeSequences.length > 0) {
      const activeList = activeSequences.map(s => s.sequence.name).join(', ');
      return res.status(400).json({ 
        error: `El lead ya está en la secuencia activa: ${activeList}. No puede estar en más de una secuencia activa.`,
        activeSequences: activeSequences.map(s => ({ id: s.sequence.id, name: s.sequence.name }))
      });
    }

    const leadSequence = await prisma.leadSequence.create({
      data: {
        leadId: req.params.id,
        sequenceId: sequenceId || null,
        userId: req.user?.id,
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
    
    res.json({ success: true, message: 'Automatización iniciada', leadSequence });
  } catch (error) {
    console.error('Error starting automation:', error);
    res.status(500).json({ error: 'Error al iniciar automatización' });
  }
});

/**
 * POST /api/leads/:id/automation/pause
 * Pause automation for a lead
 */
router.post('/leads/:id/automation/pause', requireAuth, async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
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
 * POST /api/leads/:id/automation/resume
 * Resume automation for a lead
 */
router.post('/leads/:id/automation/resume', requireAuth, async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        automationPaused: false
      }
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
router.post('/leads/:id/automation/stop', requireAuth, async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
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
    
    // Delete lead sequences
    await prisma.leadSequence.deleteMany({
      where: { leadId: req.params.id }
    });
    
    res.json({ success: true, message: 'Automatización detenida' });
  } catch (error) {
    console.error('Error stopping automation:', error);
    res.status(500).json({ error: 'Error al detener automatización' });
  }
});

module.exports = router;