// Automation Service - Cron job para ejecutar secuencias automáticamente
const { sendEmail } = require('./emailService');
const whatsappService = require('./whatsappService');
const instagramService = require('./instagramService');
const messengerService = require('./messengerService');

// Configuración del cron job
const CHECK_INTERVAL = 60 * 1000; // Cada 1 minuto (en producción podría ser más frecuente)

// Almacenar referencia al intervalo
let cronInterval = null;

/**
 * Iniciar el servicio de automatización
 */
function startAutomationService(prisma) {
  console.log('🚀 Iniciando servicio de automatización...');
  
  // Ejecutar inmediatamente al iniciar
  processAutomation(prisma);
  
  // Luego ejecutar periódicamente
  cronInterval = setInterval(() => {
    processAutomation(prisma);
  }, CHECK_INTERVAL);
  
  console.log(`✅ Servicio de automatización activo (verificación cada ${CHECK_INTERVAL/1000} segundos)`);
}

/**
 * Detener el servicio de automatización
 */
function stopAutomationService() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('🛑 Servicio de automatización detenido');
  }
}

/**
 * Procesar todas las automatizaciones pendientes
 */
async function processAutomation(prisma) {
  try {
    // Obtener todas las secuencias activas (no pausadas)
const allSequences = await prisma.sequence.findMany({
      where: {
        isActive: true,
        isPaused: false
      }
    });
    
    // Filtrar secuencias que tienen tenantId válido
const sequences = allSequences.filter(s => s.tenantId);
    
    for (const sequence of sequences) {
      await processSequence(prisma, sequence);
    }
  } catch (error) {
    console.error('❌ Error en proceso de automatización:', error.message);
  }
}

/**
 * Procesar una secuencia específica
 */
async function processSequence(prisma, sequence) {
  try {
    // Obtener los leads en esta secuencia
const leadSequences = await prisma.leadSequence.findMany({
      where: {
        sequenceId: sequence.id,
        completedAt: null // Solo leads activos en la secuencia
      },
      include: {
        lead: true
      }
    });
const steps = typeof sequence.steps === 'string' 
      ? JSON.parse(sequence.steps) 
      : sequence.steps;
    
    if (!Array.isArray(steps) || steps.length === 0) {
      return; // No hay pasos definidos
    }
for (const leadSequence of leadSequences) {
      await processLeadSequence(prisma, leadSequence, sequence, steps);
    }
  } catch (error) {
    console.error(`❌ Error procesando secuencia ${sequence.id}:`, error.message);
  }
}

/**
 * Procesar la secuencia de un lead específico
 */
async function processLeadSequence(prisma, leadSequence, sequence, steps) {
  const lead = leadSequence.lead;
  const currentStep = leadSequence.currentStep;
  const startedAt = new Date(leadSequence.startedAt);
  
  // Verificar si la secuencia está en pausa para este lead
if (lead.automationPaused) {
    return;
  }
  
  // El canal de la secuencia es único (whatsapp, instagram, messenger, email)
const channel = sequence.channel;
  
  // Calcular qué paso debe ejecutarse ahora
const now = new Date();
  const daysSinceStart = Math.floor((now - startedAt) / (1000 * 60 * 60 * 24));
  
  // El paso a ejecutar es el primer paso cuyo día ya pasó y no se ha enviado
let stepToExecute = null;
  
  for (let i = currentStep; i < steps.length; i++) {
    const step = steps[i];
    const day = step.day || i + 1;
    
    if (daysSinceStart >= day) {
      // Ya pasó el tiempo para este paso, verificar si ya se envió
const followUpCount = await prisma.followUp.count({
        where: {
          leadId: lead.id,
          day: day
        }
      });
      
      if (followUpCount === 0 && step.message && step.message.trim().length > 0) {
        stepToExecute = { step, day };
        break;
      }
    } else {
      // Este paso es para el futuro, no hacer nada
      break;
    }
  }
if (!stepToExecute) {
    console.log(`⏳ [${sequence.name}] Lead ${lead.name}: No hay mensajes para enviar aún (currentStep: ${currentStep}, diasPasados: ${daysSinceStart})`);
    return; // No hay nada que enviar
  }
const { step, day } = stepToExecute;
  
  // El mensaje ahora está en el campo 'message' del paso
let message = step.message || '';
  
  // Reemplazar variables en el mensaje
  message = replaceVariables(message, lead);
  
  // Enviar el mensaje
const result = await sendMessage(prisma, lead, channel, message, sequence.name);
  
  if (result.success) {
    // Registrar el follow-up enviado
    await prisma.followUp.create({
      data: {
        leadId: lead.id,
        day: day,
        channel: channel,
        message: message,
        automated: true,
        sentAt:
new Date(),
        whatsappMessageId: result.messageId || null
      }
    });
    
    // Actualizar el paso actual del lead
    await prisma.leadSequence.update({
      where: { id: leadSequence.id },
      data: { currentStep: currentStep + 1 }
    });
    
    // Actualizar lastContact del lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContact:
new Date() }
    });
    
    // Crear notificación
    await prisma.notification.create({
      data: {
        tenantId: lead.tenantId,
        userId: leadSequence.userId || leadSequence.userId,
        type: 'message_sent',
        title: 'Mensaje automatizado enviado',
        description: `Día ${day}: Mensaje enviado a ${lead.name} por ${channel}`,
        leadId: lead.id,
        channel: channel
      }
    });
    
    console.log(`✅ Enviado: Lead ${lead.name} - Día ${day} - Canal ${channel}`);
    
    // Verificar si la secuencia terminó
if (currentStep + 1 >= steps.length) {
      await prisma.leadSequence.update({
        where: { id: leadSequence.id },
        data: { 
          completedAt: new Date(),
          currentStep: steps.length
        }
      });
      
      // Marcar lead como fuera de automatización
      await prisma.lead.update({
        where: { id: lead.id },
        data: { 
          inAutomation: false,
          automationExitedAt:
new Date(),
          automationExitReason: 'sequence_completed'
        }
      });
      
      // Notificar secuencia completada
      await prisma.notification.create({
        data: {
          tenantId: lead.tenantId,
          userId: leadSequence.userId,
          type: 'sequence_completed',
          title: 'Secuencia completada',
          description: `${lead.name} completó la secuencia "${sequence.name}"`,
          leadId: lead.id
        }
      });
      
      console.log(`🎉 Secuencia completada para ${lead.name}`);
    }
  }
}

/**
 * Reemplazar variables en el mensaje
 */
function replaceVariables(message, lead) {
  if (!message) return '';
  
  return message
    .replace(/{{name}}/gi, lead.name || '')
    .replace(/{{lead_name}}/gi, lead.name || '')
    .replace(/{name}/gi, lead.name || '')
    .replace(/{lead_name}/gi, lead.name || '')
    .replace(/{{propertyTitle}}/gi, lead.propertyTitle || '')
    .replace(/{{property}}/gi, lead.propertyTitle || '')
    .replace(/{{phone}}/gi, lead.phone || '')
    .replace(/{{email}}/gi, lead.email || '')
    .replace(/{{agentName}}/gi, 'Tu Asesor'); // Valor por defecto
}

/**
 * Enviar mensaje según el canal
 */
async function sendMessage(prisma, lead, channel, message, sequenceName) {
  try {
    if (channel === 'whatsapp') {
      if (!lead.phone) {
        console.log(`⚠️ Lead sin teléfono para WhatsApp: ${lead.name}`);
        return { success: false, error: 'Lead sin teléfono' };
      }
      
      // Normalizar teléfono
const phone = lead.phone.replace(/\D/g, '');
      console.log(`📱 WhatsApp: Enviando a ${phone}: ${message.substring(0, 50)}...`);
      
      const result = await whatsappService.sendTextMessage(phone, message);
      
      if (result.success) {
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`❌ Error WhatsApp:`, result.error);
        return { success: false, error: result.error };
      }
      
    } else if (channel === 'instagram') {
      if (!lead.instagramId && !lead.sourceDetail) {
        console.log(`⚠️ Lead sin Instagram ID: ${lead.name}`);
        return { success: false, error: 'Lead sin Instagram ID' };
      }
      
      const instagramId = lead.instagramId || lead.sourceDetail;
      console.log(`📸 Instagram: Enviando a ${instagramId}: ${message.substring(0, 50)}...`);
      
      const result = await instagramService.sendTextMessage(instagramId, message);
      
      if (result.success) {
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`❌ Error Instagram:`, result.error);
        return { success: false, error: result.error };
      }
      
    } else if (channel === 'messenger') {
      if (!lead.facebookId && !lead.sourceDetail) {
        console.log(`⚠️ Lead sin Facebook ID: ${lead.name}`);
        return { success: false, error: 'Lead sin Facebook ID' };
      }
      
      const facebookId = lead.facebookId || lead.sourceDetail;
      console.log(`💬 Messenger: Enviando a ${facebookId}: ${message.substring(0, 50)}...`);
      
      const result = await messengerService.sendTextMessage(facebookId, message);
      
      if (result.success) {
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`❌ Error Messenger:`, result.error);
        return { success: false, error: result.error };
      }
      
    } else if (channel === 'email') {
      if (!lead.email) {
        return { success: false, error: 'Lead sin email' };
      }
      
      // Enviar email vía Resend
const result = await sendEmail({
        to: lead.email,
        subject: `Seguimiento - ${sequenceName}`,
        text: message,
        html: message.replace(/\n/g, '<br>'),
        leadId: lead.id,
        tenantId: lead.tenantId
      });
      
      return result;
      
    } else {
      console.log(`⚠️ Canal no implementado: ${channel}`);
      return { success: false, error: `Canal ${channel} no implementado` };
    }
  } catch (error) {
    console.error(`❌ Error enviando mensaje por ${channel}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener estado del servicio (para debugging/monitoring)
 */
function getStatus() {
  return {
    active: cronInterval !== null,
    checkInterval: CHECK_INTERVAL
  };
}

module.exports = {
  startAutomationService,
  stopAutomationService,
  getStatus,
  processAutomation // Exportar para testing manual
};