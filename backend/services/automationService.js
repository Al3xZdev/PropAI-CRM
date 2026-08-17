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

  // Chequeo de follow-ups vencidos/próximos (no debe romper el procesamiento de secuencias)
  await checkFollowUpNotifications(prisma).catch(err => {
    console.error('❌ Error en chequeo de follow-ups:', err.message);
  });
}

/**
 * Notificar follow-ups vencidos o próximos a vencer (24h).
 * Destinatario: lead.assignedTo si existe, si no followUp.createdBy.
 * Dedupe: no crear si ya existe notificación 'followup_due' no leída para el mismo userId + leadId.
 */
async function checkFollowUpNotifications(prisma) {
  const now = new Date();
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const followUps = await prisma.followUp.findMany({
    where: {
      completedAt: null,
      scheduledAt: { lte: cutoff }
    },
    include: {
      lead: { select: { id: true, name: true, assignedTo: true } }
    }
  });

  for (const followUp of followUps) {
    const recipient = followUp.lead?.assignedTo || followUp.createdBy;
    if (!recipient || recipient === 'system') continue;

    const existing = await prisma.notification.findFirst({
      where: {
        tenantId: followUp.tenantId,
        userId: recipient,
        type: 'followup_due',
        leadId: followUp.leadId,
        read: false
      }
    });
    if (existing) continue;

    const isOverdue = followUp.scheduledAt < now;
    const formattedDate = followUp.scheduledAt.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const leadName = followUp.lead?.name || 'Lead';

    await prisma.notification.create({
      data: {
        tenantId: followUp.tenantId,
        userId: recipient,
        type: 'followup_due',
        title: isOverdue ? 'Tarea vencida' : 'Tarea próxima a vencer',
        description: `${leadName}: ${followUp.note || 'Seguimiento'} (${formattedDate})`,
        leadId: followUp.leadId,
        channel: 'followup'
      }
    });
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
      // Ya pasó el tiempo para este paso. El dedupe por "día" no es posible
      // (FollowUp no tiene campo day); la fuente de verdad es currentStep,
      // y el envío se deduplica por nota del mensaje más abajo.
      if (step.message && step.message.trim().length > 0) {
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
  
  // Dedupe: si este mensaje ya fue registrado como follow-up, avanzar sin reenviar
  const alreadySent = await prisma.followUp.count({
    where: { leadId: lead.id, note: message }
  });
  if (alreadySent > 0) {
    await prisma.leadSequence.update({
      where: { id: leadSequence.id },
      data: { currentStep: currentStep + 1 }
    });
    console.log(`⏭️ [${sequence.name}] Lead ${lead.name}: mensaje del día ${day} ya registrado, se avanza al siguiente paso`);
    return;
  }
  
  // Enviar el mensaje
const result = await sendMessage(prisma, lead, channel, message, sequence.name);
  
  if (result.success) {
    // Registrar el follow-up enviado
    await prisma.followUp.create({
      data: {
        tenantId: lead.tenantId,
        leadId: lead.id,
        createdBy: 'system',
        type: 'automation',
        note: message,
        scheduledAt: new Date(),
        completedAt: new Date()
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
    
    // Crear notificación (solo si hay un destinatario real: userId del leadSequence o agente asignado)
    const messageSentUserId = leadSequence.userId || lead.assignedTo || null;
    if (messageSentUserId) {
      await prisma.notification.create({
        data: {
          tenantId: lead.tenantId,
          userId: messageSentUserId,
          type: 'message_sent',
          title: 'Mensaje automatizado enviado',
          description: `Día ${day}: Mensaje enviado a ${lead.name} por ${channel}`,
          leadId: lead.id,
          channel: channel
        }
      });
    }
    
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
      
      // Notificar secuencia completada (solo si hay destinatario)
      if (messageSentUserId) {
        await prisma.notification.create({
          data: {
            tenantId: lead.tenantId,
            userId: messageSentUserId,
            type: 'sequence_completed',
            title: 'Secuencia completada',
            description: `${lead.name} completó la secuencia "${sequence.name}"`,
            leadId: lead.id
          }
        });
      }
      
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