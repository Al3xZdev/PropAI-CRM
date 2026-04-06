const express = require('express');
const router = express.Router();

const {
  getAllSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  deleteSequence,
  addStepToSequence,
  updateStep,
  deleteStep,
  getStepsForLead,
  logMessage,
  getMessageLogs,
  getLogsForLead
} = require('../services/automation');

const {
  generateMessagesForStep,
  generateAlternativeMessages,
  generateFollowUpPlan
} = require('../services/messageGenerator');

// ==========================================
// SEQUENCES CRUD
// ==========================================

// Get all sequences
router.get('/sequences', (req, res) => {
  try {
    const sequences = getAllSequences();
    res.json({ success: true, sequences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single sequence
router.get('/sequences/:id', (req, res) => {
  try {
    const sequence = getSequenceById(req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    res.json({ success: true, sequence });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new sequence
router.post('/sequences', (req, res) => {
  try {
    const sequence = createSequence(req.body);
    res.json({ success: true, sequence });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sequence
router.put('/sequences/:id', (req, res) => {
  try {
    const sequence = updateSequence(req.params.id, req.body);
    if (!sequence) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    res.json({ success: true, sequence });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete sequence
router.delete('/sequences/:id', (req, res) => {
  try {
    const deleted = deleteSequence(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// STEPS
// ==========================================

// Add step to sequence
router.post('/sequences/:id/steps', (req, res) => {
  try {
    const step = addStepToSequence(req.params.id, req.body);
    if (!step) {
      return res.status(404).json({ error: 'Secuencia no encontrada' });
    }
    res.json({ success: true, step });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update step
router.put('/sequences/:id/steps/:stepId', (req, res) => {
  try {
    const step = updateStep(req.params.id, req.params.stepId, req.body);
    if (!step) {
      return res.status(404).json({ error: 'Paso o secuencia no encontrado' });
    }
    res.json({ success: true, step });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete step
router.delete('/sequences/:id/steps/:stepId', (req, res) => {
  try {
    const deleted = deleteStep(req.params.id, req.params.stepId);
    if (!deleted) {
      return res.status(404).json({ error: 'Paso o secuencia no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MESSAGE GENERATION
// ==========================================

// Generate messages for a step and lead
router.post('/generate-messages', (req, res) => {
  try {
    const { step, lead, agentInfo } = req.body;
    
    if (!step || !lead) {
      return res.status(400).json({ error: 'Se requiere step y lead' });
    }
    
    const messages = generateMessagesForStep(step, lead, agentInfo);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate alternative messages
router.post('/generate-alternatives', (req, res) => {
  try {
    const { step, lead, agentInfo } = req.body;
    
    if (!step || !lead) {
      return res.status(400).json({ error: 'Se requiere step y lead' });
    }
    
    const alternatives = generateAlternativeMessages(step, lead, agentInfo);
    res.json({ success: true, alternatives });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate complete follow-up plan for a lead
router.post('/followup-plan', (req, res) => {
  try {
    const { lead, sequenceId, agentInfo } = req.body;
    
    if (!lead) {
      return res.status(400).json({ error: 'Se requiere lead' });
    }
    
    const sequences = getAllSequences();
    const sequence = sequenceId 
      ? getSequenceById(sequenceId) 
      : sequences.find(s => s.isActive);
    
    if (!sequence) {
      return res.status(404).json({ error: 'No se encontró una secuencia activa' });
    }
    
    const plan = generateFollowUpPlan(lead, sequence, agentInfo);
    res.json({ success: true, plan, sequenceName: sequence.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SEND MESSAGE (Simulated)
// ==========================================

// Send a single message (simulated)
router.post('/send', (req, res) => {
  try {
    const { lead, channel, message, stepId, sequenceId, metadata } = req.body;
    
    if (!lead || !channel || !message) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Simulate sending delay
    const simulatedDelay = Math.random() * 1000 + 500; // 0.5-1.5 seconds
    
    setTimeout(() => {
      // Log the message
      const log = logMessage({
        leadId: lead.id,
        leadName: lead.name,
        sequenceId: sequenceId || 'default',
        stepId: stepId || 'manual',
        channel,
        message: typeof message === 'object' ? JSON.stringify(message) : message,
        metadata
      });
      
      console.log(`📤 Mensaje simulado enviado a ${lead.name} via ${channel}`);
    }, simulatedDelay);
    
    // Return success immediately (simulated)
    res.json({
      success: true,
      simulated: true,
      message: `Mensaje enviado via ${channel}`,
      lead: {
        id: lead.id,
        name: lead.name
      },
      channel
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send follow-up for a lead (all due messages)
router.post('/send-followup/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { agentInfo } = req.body;
    
    // Get lead from leads data
    const leads = require('./leads');
    let lead;
    
    // Mock lead if not found in DB
    const mockLead = {
      id: leadId,
      name: 'Cliente de Prueba',
      email: 'test@test.com',
      phone: '+5491112345678',
      propertyTitle: 'Propiedad de prueba',
      createdAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      simulated: true,
      sent: [],
      message: 'Mensajes enviados (simulación)'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MESSAGE LOGS
// ==========================================

// Get all message logs
router.get('/logs', (req, res) => {
  try {
    const { leadId, channel, limit } = req.query;
    const logs = getMessageLogs({
      leadId,
      channel,
      limit: limit ? parseInt(limit) : undefined
    });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a specific lead
router.get('/logs/:leadId', (req, res) => {
  try {
    const logs = getLogsForLead(req.params.leadId);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ACTIVE SEQUENCE & STEPS FOR LEADS
// ==========================================

// Get steps for a specific lead (shows what needs to be sent)
router.get('/lead/:leadId/steps', (req, res) => {
  try {
    // This would normally fetch the lead from the leads table
    // For now, return steps from the active sequence
    const sequences = getAllSequences();
    const activeSequence = sequences.find(s => s.isActive);
    
    if (!activeSequence) {
      return res.json({ success: true, steps: [], message: 'No hay secuencia activa' });
    }
    
    res.json({
      success: true,
      sequence: {
        id: activeSequence.id,
        name: activeSequence.name
      },
      steps: activeSequence.steps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
