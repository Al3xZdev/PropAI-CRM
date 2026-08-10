// Email Service - Resend Integration
const { Resend } = require('resend');

let resend = null;

// Initialize Resend with API key
const initializeResend = (apiKey) => {
  if (apiKey && apiKey.startsWith('re_')) {
    resend = new Resend(apiKey);
    console.log('✅ Resend initialized successfully');
  } else {
    console.warn('⚠️ Invalid Resend API key');
  }
};

/**
 * Send an email using Resend
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.from - Sender email (must be verified in Resend)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email plain text content
 * @param {string} options.leadId - Associated lead ID
 * @param {string} options.tenantId - Tenant ID for logging
 */
const sendEmail = async ({ to, from, subject, html, text, leadId, tenantId }) => {
  if (!resend) {
    console.error('❌ Resend no está inicializado. Verificá que el API key sea válido.');
    throw new Error('Resend not initialized. Please provide a valid API key.');
  }

  console.log(`📧 Intentando enviar email a: ${to}`);
  console.log(`📧 Asunto: ${subject}`);
  
  try {
    const result = await resend.emails.send({
      from: from || 'onboarding@resend.dev', // Default sender (works for testing)
      to: to,
      subject: subject,
      html: html,
      text: text,
      // Store metadata for webhook processing
      metadata: {
        leadId: leadId,
        tenantId: tenantId
      }
    });
if (result.error) {
      console.error('❌ Error de Resend:', result.error);
      return {
        success: false,
        error: result.error.message || 'Error de Resend'
      };
    }
    
    console.log('✅ Email enviado exitosamente:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
      data: result.data
    };
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send a templated email (for CRM workflows)
 */
const sendTemplatedEmail = async ({ to, templateName, data, leadId, tenantId }) => {
  const templates = {
    welcome: {
      subject: '¡Bienvenido a nuestra inmobiliaria!',
      html: (d) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e293b;">¡Hola ${d.name || 'there'}!</h1>
          <p style="color: #475569; font-size: 16px;">Gracias por contactarnos. Estamos muy felices de ayudarte a encontrar tu propiedad ideal.</p>
          <p style="color: #475569;">Un agente se pondrán en contacto contigo muy pronto.</p>
          <br/>
          <p style="color: #64748b;">Saludos cordiales,<br/>El equipo de la inmobiliaria</p>
        </div>
      `
    },
    followup: {
      subject: 'Seguimiento - ¿Aún interesados en propiedades?',
      html: (d) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e293b;">Hola ${d.name || 'there'}!</h1>
          <p style="color: #475569;">Queríamos hacer seguimiento sobre tu interés en nuestras propiedades.</p>
          <p style="color: #475569;">¿Hay algo en lo que podamos ayudarte?</p>
          <br/>
          <p style="color: #64748b;">Saludos,<br/>El equipo</p>
        </div>
      `
    },
    property_update: {
      subject: 'Nueva propiedad que puede interesarte',
      html: (d) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e293b;">¡Nueva propiedad disponible!</h1>
          <p style="color: #475569;">Hola ${d.name || 'there'}, tenemos una propiedad que puede interesarte:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #334155; margin: 0;">${d.propertyTitle || 'Propiedad'}</h2>
            <p style="color: #64748b;">${d.propertyDescription || ''}</p>
            <p style="color: #059669; font-weight: bold; font-size: 18px;">${d.propertyPrice || ''}</p>
          </div>
          <p style="color: #475569;">Contáctanos para más información.</p>
        </div>
      `
    }
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  return sendEmail({
    to,
    subject: template.subject,
    html: template.html(data),
    text: template.html(data).replace(/<[^>]*>/g, ''), // Strip HTML for text version
    leadId,
    tenantId
  });
};

/**
 * Verify email domain in Resend (for sending from custom domain)
 */
const verifyDomain = async (domain) => {
  if (!resend) {
    throw new Error('Resend not initialized');
  }

  try {
    const result = await resend.domains.create({ domain });
    return result;
  } catch (error) {
    console.error('Error verifying domain:', error.message);
    throw error;
  }
};

module.exports = {
  initializeResend,
  sendEmail,
  sendTemplatedEmail,
  verifyDomain
};