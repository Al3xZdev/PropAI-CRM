// Message Generator Service - AI-powered message generation (simulated)
// Generates personalized messages for each channel and lead

const { v4: uuidv4 } = require('uuid');

/**
 * Format currency for messages
 */
function formatCurrency(amount) {
  if (!amount) return 'consultar';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Replace template variables with actual values
 */
function replaceVariables(template, data) {
  let result = template;
  
  const variables = {
    '{{name}}': data.name || 'Cliente',
    '{{propertyTitle}}': data.propertyTitle || 'la propiedad de tu interés',
    '{{propertyAddress}}': data.propertyAddress || '',
    '{{address}}': data.address || '',
    '{{price}}': formatCurrency(data.price),
    '{{area}}': data.area || '',
    '{{bedrooms}}': data.bedrooms || '',
    '{{bathrooms}}': data.bathrooms || '',
    '{{agentName}}': data.agentName || 'tu asesor',
    '{{agentPhone}}': data.agentPhone || '',
    '{{companyName}}': data.companyName || 'Inmobiliaria',
    '{{day}}': data.day || ''
  };
  
  Object.entries(variables).forEach(([key, value]) => {
    result = result.split(key).join(value);
  });
  
  return result;
}

/**
 * Generate messages for a specific step and channel
 */
function generateMessagesForStep(step, lead, agentInfo = {}) {
  const data = {
    name: lead.name?.split(' ')[0] || 'Cliente', // First name only
    fullName: lead.name || 'Cliente',
    propertyTitle: lead.propertyTitle || lead.propertyInterest || 'nuestra propiedad',
    propertyAddress: lead.propertyAddress || lead.address || '',
    address: lead.address || '',
    price: lead.price || lead.propertyPrice || '',
    area: lead.area || '',
    bedrooms: lead.bedrooms || '',
    bathrooms: lead.bathrooms || '',
    agentName: agentInfo.name || 'Tu Asesor',
    agentPhone: agentInfo.phone || '',
    companyName: agentInfo.company || 'Inmobiliaria',
    day: step.day || 1
  };
  
  const messages = {};
  
  step.channels.forEach(channel => {
    if (step.templates && step.templates[channel]) {
      const template = step.templates[channel];
      
      if (channel === 'email') {
        messages[channel] = {
          subject: replaceVariables(template.subject || '', data),
          body: replaceVariables(template.body || '', data),
          to: lead.email,
          from: agentInfo.email || 'noreply@inmobiliaria.com'
        };
      } else {
        // WhatsApp, Instagram, Messenger
        messages[channel] = {
          message: replaceVariables(template.message || '', data),
          to: channel === 'whatsapp' ? lead.phone : (lead.instagram || lead.email)
        };
      }
    }
  });
  
  return messages;
}

/**
 * Generate alternative messages (AI variations)
 */
function generateAlternativeMessages(step, lead, agentInfo = {}) {
  const variations = [];
  
  // Generate 2 alternative variations for each main channel
  const mainChannel = step.channels.includes('whatsapp') ? 'whatsapp' : 
                      step.channels.includes('email') ? 'email' : 
                      step.channels[0];
  
  // Alternative styles
  const styles = [
    { tone: 'formal', emoji: false },
    { tone: 'friendly', emoji: true },
    { tone: 'urgent', emoji: true }
  ];
  
  styles.forEach((style, index) => {
    if (index === 0) return; // Skip first (it's the main)
    
    let message = '';
    
    if (mainChannel === 'whatsapp' || mainChannel === 'instagram' || mainChannel === 'messenger') {
      const templates = getChannelTemplates(mainChannel, step.day);
      const baseTemplate = templates[index % templates.length];
      message = replaceVariables(baseTemplate, {
        name: lead.name?.split(' ')[0] || 'Cliente',
        propertyTitle: lead.propertyTitle || 'esta propiedad',
        agentName: agentInfo.name || 'tu asesor'
      });
      
      if (!style.emoji) {
        message = message.replace(/[^\w\s.,!?¿¡]/gi, '').trim();
      }
    }
    
    variations.push({
      channel: mainChannel,
      style: style.tone,
      message: message
    });
  });
  
  return variations;
}

/**
 * Get base templates for channels
 */
function getChannelTemplates(channel, day) {
  const templates = {
    whatsapp: {
      1: [
        '¡Hola {{name}}! 👋 Soy {{agentName}}. Vi que te interesa {{propertyTitle}}. ¿Te gustaría agendar una visita mañana?',
        '¡Hola {{name}}! Gracias por tu interés en {{propertyTitle}}. Soy {{agentName}} y me encantaría darte más información. ¿Cuándo estás disponible?'
      ],
      3: [
        '¡Hola {{name}}! 🌟 {{propertyTitle}} sigue disponible. ¿Pudiste ver las fotos? Tiene TODO lo que buscas.',
        '{{name}}, ¿qué te pareció {{propertyTitle}}? Tiene una ubicación increíble. ¿Te animás a visitarla?'
      ],
      7: [
        '¡Hey {{name}}! 👀 Solo quería saber si te gustó {{propertyTitle}}. Está generando mucho interés.',
        '¡Hola! {{name}}, ¿tuviste chance de pensar lo de {{propertyTitle}}? La oportunidad está difícil. 😮'
      ],
      14: [
        '{{name}} 👋 Quiero saber tu opinión sobre {{propertyTitle}}. ¿Conocés a alguien interesado? Tu recomendación cuenta.',
        '¡Último momento! {{propertyTitle}} tiene varios interesados. {{name}}, ¿te gustaría visitarla este finde?'
      ]
    },
    instagram: {
      1: [
        '¡Hola {{name}}! Vimos que te gustó nuestro contenido de {{propertyTitle}}. ¿Te gustaría saber más?',
        '{{name}}, gracias por seguirnos! 🏡 Tenemos {{propertyTitle}} que te puede interesar. Escríbeme DM.'
      ],
      3: [
        '¡{{name}}! Aquí te dejo más info de {{propertyTitle}}. El video tour quedó increíble. Dale una mirada 👀',
        '¡{{name}}! Te envío los detalles de {{propertyTitle}}. Tiene vistas espectaculares 🌅 DM me si tenés dudas.'
      ],
      7: [
        '¡Hey {{name}}! 👋 ¿Qué te pareció el reels de {{propertyTitle}}? 🏡 Quedó hermoso!',
        '{{name}}, ¿viste nuestro último post de {{propertyTitle}}? Te juro que es mejor en persona 😍'
      ],
      14: [
        '¡{{name}}! Último empujón 🏃 {{propertyTitle}} está para alguien especial. ¿Sos vos?',
        '{{name}} la semana pasada nos escribiste por {{propertyTitle}}. ¿Ya la fuiste a ver?'
      ]
    },
    email: {
      1: [
        {
          subject: '¡Bienvenido{{name}}! Aquí tienes toda la info',
          body: 'Hola {{name}},\n\nGracias por tu interés en {{propertyTitle}}. Te envío los detalles completos.\n\nEstate atento a mi próximo mensaje con más información.\n\n¡Saludos!'
        }
      ],
      3: [
        {
          subject: '{{propertyTitle}} - Información detallada',
          body: 'Hola {{name}},\n\nAquí tienes todos los detalles de {{propertyTitle}}:\n\n- Ubicación privilegiada\n- Excelente distribución\n- Acabados de primera\n\n¿Te gustaría programar una visita?\n\nSaludos'
        }
      ],
      7: [
        {
          subject: '¿Qué te pareció {{propertyTitle}}?',
          body: 'Hola {{name}},\n\nQuiero saber tu opinión sobre {{propertyTitle}}. ¿Tuviste chance de verla?\n\nQuedo a tu disposición.\n\nSaludos'
        }
      ],
      14: [
        {
          subject: 'Oferta especial - Últimos días',
          body: 'Hola {{name}},\n\nEsta semana tenemos una promoción especial para {{propertyTitle}}.\n\nQuedan pocas oportunidades. ¿Te animás?\n\nSaludos'
        }
      ]
    },
    messenger: {
      1: [
        '¡Hola {{name}}! 👋 Gracias por escribirnos por Messenger. Te cuento todo sobre {{propertyTitle}}.',
        '{{name}}, ¡qué bueno que nos contactaste! 🏡 Soy {{agentName}} y te ayudo con {{propertyTitle}}.'
      ],
      3: [
        '¡{{name}}! Te envié las fotos de {{propertyTitle}} por aquí. Mirálas y decime qué te parecen 👀',
        '¿Viste {{propertyTitle}}? Es una belleza. Si tenés dudas, preguntame lo que quieras!'
      ],
      7: [
        '¡Hola de nuevo {{name}}! 👋 ¿Qué tal? ¿Te gustó {{propertyTitle}}?',
        '{{name}}, no te pierdas {{propertyTitle}}. Está en una zona increíble. ¿Te sumo a la lista de interesados?'
      ],
      14: [
        '¡{{name}}! Última oportunidad 🏃 {{propertyTitle}} tiene compromisos pendientes. ¿Te interesa?',
        '{{name}}, te escribe {{agentName}}. {{propertyTitle}} tuvo visitas esta semana. ¿Querés asegurar tu lugar?'
      ]
    }
  };
  
  return templates[channel]?.[day] || templates[channel]?.[1] || ['Mensaje de seguimiento'];
}

/**
 * Generate a complete follow-up plan for a lead
 */
function generateFollowUpPlan(lead, sequence, agentInfo = {}) {
  if (!sequence || !sequence.steps) return [];
  
  return sequence.steps.map(step => {
    const scheduledDate = new Date(lead.createdAt);
    scheduledDate.setDate(scheduledDate.getDate() + step.day);
    
    const messages = generateMessagesForStep(step, lead, agentInfo);
    
    return {
      stepId: step.id,
      day: step.day,
      label: step.label,
      channels: step.channels,
      scheduledDate: scheduledDate.toISOString(),
      messages,
      isDue: new Date() >= scheduledDate,
      isPast: new Date() > scheduledDate
    };
  });
}

module.exports = {
  replaceVariables,
  generateMessagesForStep,
  generateAlternativeMessages,
  generateFollowUpPlan,
  formatCurrency
};
