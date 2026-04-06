// Automation Service - Follow-up Sequences Management
// Handles sequences, message generation, and simulated sending

const { v4: uuidv4 } = require('uuid');

// In-memory storage for sequences and message logs
const sequences = [];
const messageLogs = [];

// Default sequence template
const DEFAULT_SEQUENCE = {
  id: 'default-real-estate',
  name: 'Secuencia Real Estate',
  description: 'Secuencia estándar para nuevos leads en bienes raíces',
  isActive: true,
  createdAt: new Date().toISOString(),
  steps: [
    {
      id: uuidv4(),
      day: 1,
      label: 'Bienvenida',
      channels: ['email', 'whatsapp'],
      templates: {
        email: {
          subject: '¡Bienvenido! Gracias por tu interés',
          body: 'Hola {{name}},\n\nGracias por contactarnos sobre {{propertyTitle}}. Mi nombre es {{agentName}} y seré tu asesor dedicado.\n\n¿Te gustaría agendar una llamada para conhecer más sobre esta propiedad?\n\nSaludos cordiales,\n{{agentName}}'
        },
        whatsapp: {
          message: '¡Hola {{name}}! 👋 Soy {{agentName}} de la inmobiliaria. Vi que te interesa {{propertyTitle}}. ¿Te parece si hablamos mañana para contarte más detalles? 🏠'
        }
      }
    },
    {
      id: uuidv4(),
      day: 3,
      label: 'Información de la propiedad',
      channels: ['whatsapp', 'email'],
      templates: {
        whatsapp: {
          message: '¡Hola {{name}}! 🌟 Te cuento que {{propertyTitle}} tiene {{bedrooms}} habitaciones, {{bathrooms}} baños y {{area}}m². El precio es {{price}}. ¿Te gustaría ver fotos o un video tour?'
        },
        email: {
          subject: 'Detalles de {{propertyTitle}}',
          body: 'Hola {{name}},\n\nAdjunto los detalles de {{propertyTitle}}:\n\n📍 Dirección: {{address}}\n💰 Precio: {{price}}\n📐 Superficie: {{area}}m²\n🛏️ Habitaciones: {{bedrooms}}\n🛁 Baños: {{bathrooms}}\n\nTengo fotos y un video tour disponible. ¿Cuándo podemos coordinar una visita?\n\n¡Quedo atento!\n{{agentName}}'
        }
      }
    },
    {
      id: uuidv4(),
      day: 7,
      label: 'Seguimiento',
      channels: ['whatsapp', 'instagram'],
      templates: {
        whatsapp: {
          message: '¡Hey {{name}}! 👀 Solo quería saber si viste el video tour que te envié. {{propertyTitle}} está generando mucho interés. ¿Te animás a visitarla esta semana?'
        },
        instagram: {
          message: '¡{{name}}! Vi que viste nuestro reels de {{propertyTitle}}. ¿Qué te pareció? 🏡 Si te gustó, puedo agendarte una visita. Dime por aquí o por DM 📱'
        }
      }
    },
    {
      id: uuidv4(),
      day: 14,
      label: 'Último contacto',
      channels: ['whatsapp', 'email'],
      templates: {
        whatsapp: {
          message: 'Hola {{name}} 👋 Quiero saber tu opinión sobre {{propertyTitle}}. Es una oportunidad increíble. Si no es para vos, tal vez conoces a alguien que le interese. ¿Qué decís?'
        },
        email: {
          subject: 'Oferta especial - {{propertyTitle}}',
          body: 'Hola {{name}},\n\nSolo quiero recordarte que {{propertyTitle}} sigue disponible. Tenemos una promoción especial para visitas este fin de semana.\n\n¿Conocés a alguien que pueda estar interesado? Tu recomendación cuenta.\n\nSaludos,\n{{agentName}}'
        }
      }
    }
  ]
};

// Initialize with default sequence if empty
if (sequences.length === 0) {
  sequences.push({ ...DEFAULT_SEQUENCE, id: uuidv4() });
}

/**
 * Get all sequences
 */
function getAllSequences() {
  return sequences.filter(s => !s.isDeleted);
}

/**
 * Get sequence by ID
 */
function getSequenceById(id) {
  return sequences.find(s => s.id === id);
}

/**
 * Create a new sequence
 */
function createSequence(data) {
  const sequence = {
    id: uuidv4(),
    name: data.name || 'Nueva Secuencia',
    description: data.description || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    steps: data.steps || []
  };
  sequences.push(sequence);
  return sequence;
}

/**
 * Update a sequence
 */
function updateSequence(id, updates) {
  const index = sequences.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  sequences[index] = {
    ...sequences[index],
    ...updates,
    id // Ensure ID doesn't change
  };
  return sequences[index];
}

/**
 * Delete a sequence
 */
function deleteSequence(id) {
  const index = sequences.findIndex(s => s.id === id);
  if (index === -1) return false;
  
  sequences[index].isDeleted = true;
  return true;
}

/**
 * Add a step to a sequence
 */
function addStepToSequence(sequenceId, stepData) {
  const sequence = getSequenceById(sequenceId);
  if (!sequence) return null;
  
  const step = {
    id: uuidv4(),
    day: stepData.day || 1,
    label: stepData.label || `Día ${stepData.day}`,
    channels: stepData.channels || [],
    templates: stepData.templates || {
      whatsapp: { message: '' },
      email: { subject: '', body: '' },
      instagram: { message: '' },
      messenger: { message: '' }
    }
  };
  
  sequence.steps.push(step);
  sequence.steps.sort((a, b) => a.day - b.day);
  
  return step;
}

/**
 * Update a step in a sequence
 */
function updateStep(sequenceId, stepId, updates) {
  const sequence = getSequenceById(sequenceId);
  if (!sequence) return null;
  
  const stepIndex = sequence.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return null;
  
  sequence.steps[stepIndex] = {
    ...sequence.steps[stepIndex],
    ...updates
  };
  
  return sequence.steps[stepIndex];
}

/**
 * Delete a step from a sequence
 */
function deleteStep(sequenceId, stepId) {
  const sequence = getSequenceById(sequenceId);
  if (!sequence) return false;
  
  const stepIndex = sequence.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return false;
  
  sequence.steps.splice(stepIndex, 1);
  return true;
}

/**
 * Get steps that need to be sent for a lead
 */
function getStepsForLead(lead) {
  const sequence = sequences.find(s => s.isActive);
  if (!sequence) return [];
  
  const now = new Date();
  const leadCreated = new Date(lead.createdAt);
  const daysSinceCreated = Math.floor((now - leadCreated) / (1000 * 60 * 60 * 24));
  
  return sequence.steps.map(step => {
    const isDue = daysSinceCreated >= step.day;
    const alreadySent = lead.followUps?.some(f => f.day === step.day);
    
    return {
      ...step,
      isDue,
      isPast: step.day < daysSinceCreated,
      alreadySent,
      shouldSend: isDue && !alreadySent
    };
  });
}

/**
 * Log a sent message
 */
function logMessage(data) {
  const log = {
    id: uuidv4(),
    leadId: data.leadId,
    leadName: data.leadName,
    sequenceId: data.sequenceId,
    stepId: data.stepId,
    channel: data.channel,
    message: data.message,
    sentAt: new Date().toISOString(),
    status: 'sent', // sent, failed, pending
    metadata: data.metadata || {}
  };
  
  messageLogs.push(log);
  return log;
}

/**
 * Get message logs
 */
function getMessageLogs(filters = {}) {
  let logs = [...messageLogs];
  
  if (filters.leadId) {
    logs = logs.filter(l => l.leadId === filters.leadId);
  }
  
  if (filters.channel) {
    logs = logs.filter(l => l.channel === filters.channel);
  }
  
  if (filters.limit) {
    logs = logs.slice(-filters.limit);
  }
  
  return logs.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

/**
 * Get logs for a specific lead
 */
function getLogsForLead(leadId) {
  return messageLogs
    .filter(l => l.leadId === leadId)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

module.exports = {
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
};
