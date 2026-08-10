// Email Routes - Multi-tenant con Prisma + Resend
const express = require('express');
const router = express.Router();

// Importar db correctamente
let prisma;
try {
  const db = require('../services/db');
  prisma = db.prisma || db;
} catch (e) {
  console.error('Error importing db:', e);
}

const { requireAuth } = require('./auth');
const { sendEmail, sendTemplatedEmail } = require('../services/emailService');

// Apply auth to all routes
router.use(requireAuth);

/**
 * POST /api/emails/send
 * Send an email to a lead
 */
router.post('/send', async (req, res) => {
try {
    const { leadId, to, subject, body, html, template } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Faltan datos requeridos: to, subject, body' });
    }

    // Get lead info if leadId provided
let leadName = '';
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, tenantId: req.tenantId }
      });
      if (lead) {
        leadName = lead.name;
      }
    }

    // Send email via Resend
const result = await sendEmail({
      to,
      subject,
      html: html || body.replace(/\n/g, '<br>'),
      text: body,
      leadId,
      tenantId: req.tenantId
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Save email to database
const email = await prisma.email.create({
      data: {
        tenantId: req.tenantId,
        leadId: leadId || null,
        userId: req.userId,
        direction: 'sent',
        from: 'onboarding@resend.dev', // Default sender
        to,
        subject,
        body,
        html: html || body.replace(/\n/g, '<br>'),
        messageId: result.messageId,
        status: 'sent',
        channel: 'email'
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        tenantId: req.tenantId,
        userId: req.userId,
        type: 'email_sent',
        title: 'Email enviado',
        description: `Email enviado a ${to}`,
        leadId: leadId || null,
        channel: 'email'
      }
    });

    res.status(201).json({ success: true, email, messageId: result.messageId });
  }
catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/send-template
 * Send a templated email
 */
router.post('/send-template', async (req, res) => {
  try {
    const { leadId, to, template, data } = req.body;

    if (!to || !template) {
      return res.status(400).json({ error: 'Faltan datos requeridos: to, template' });
    }

    // Get lead info
let leadName = '';
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, tenantId: req.tenantId }
      });
      if (lead) {
        leadName = lead.name;
      }
    }

    // Send templated email
const result = await sendTemplatedEmail({
      to,
      templateName: template,
      data: { ...data, name: leadName },
      leadId,
      tenantId: req.tenantId
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Save email
const email = await prisma.email.create({
      data: {
        tenantId: req.tenantId,
        leadId: leadId || null,
        userId: req.userId,
        direction: 'sent',
        from: 'onboarding@resend.dev',
        to,
        subject: `Email template: ${template}`,
        body: `Template: ${template}`,
        messageId: result.messageId,
        status: 'sent',
        channel: 'email'
      }
    });

    res.status(201).json({ success: true, email });
  } catch (err) {
    console.error('Error sending templated email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails
 * Get all emails for the tenant
 */
router.get('/', async (req, res) => {
  try {
    const { leadId, direction, limit = 50, offset = 0 } = req.query;

    const where = { tenantId: req.tenantId };
    if (leadId) where.leadId = leadId;
    if (direction) where.direction = direction;

    const emails = await prisma.email.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        lead: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    const total = await prisma.email.count({ where });

    res.json({ emails, total });
  } catch (err) {
    console.error('Error getting emails:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/:id
 * Get single email by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const email = await prisma.email.findFirst({
      where: { id, tenantId: req.tenantId },
      include: {
        lead: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email no encontrado' });
    }

    res.json(email);
  } catch (err) {
    console.error('Error getting email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/lead/:leadId
 * Get emails for a specific lead (for chat/conversation view)
 */
router.get('/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    // Verify lead belongs to tenant
const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    const emails = await prisma.email.findMany({
      where: {
        tenantId: req.tenantId,
        leadId
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        direction: true,
        from: true,
        to: true,
        subject: true,
        body: true,
        createdAt: true,
        status: true
      }
    });

    res.json({ emails, lead: { id: lead.id, name: lead.name, email: lead.email } });
  } catch (err) {
    console.error('Error getting lead emails:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/webhook
 * Handle incoming emails from Resend (for received emails)
 * NOTE: This requires configuring Resend to send inbound emails to this endpoint
 */
router.post('/webhook', async (req, res) => {
  try {
    const { from, to, subject, html, text, messageId } = req.body;

    // Find lead by email address
const lead = await prisma.lead.findFirst({
      where: {
        tenantId: req.tenantId,
        email: from
      }
    });

    // Save received email
const email = await prisma.email.create({
      data: {
        tenantId: req.tenantId,
        leadId: lead?.id || null,
        userId: req.userId, // System user or default
        direction: 'received',
        from,
        to,
        subject: subject || '(Sin asunto)',
        body: text || html || '',
        html,
        messageId,
        status: 'delivered',
        channel: 'email'
      }
    });

    // Create notification for received email
if (lead) {
      await prisma.notification.create({
        data: {
          tenantId: req.tenantId,
          userId: req.userId,
          type: 'email_received',
          title: 'Email recibido',
          description: `Email de ${from} sobre "${subject || '(Sin asunto)'}"`,
          leadId: lead.id,
          channel: 'email'
        }
      });
    }

    res.status(201).json({ success: true, emailId: email.id });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/emails/:id
 * Delete an email
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
const existing = await prisma.email.findFirst({
      where: { id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Email no encontrado' });
    }

    await prisma.email.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/manual-response
 * Manually add a response from a lead (when they reply to your email in their inbox)
 */
router.post('/manual-response', async (req, res) => {
  try {
    const { leadId, subject, body } = req.body;

    if (!leadId || !subject || !body) {
      return res.status(400).json({ error: 'Faltan datos requeridos: leadId, subject, body' });
    }

    // Get lead info
const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Create the received email record
const email = await prisma.email.create({
      data: {
        tenantId: req.tenantId,
        leadId,
        userId: req.userId,
        direction: 'received',
        from: lead.email || 'unknown@email.com',
        to: 'onboarding@resend.dev', // Placeholder
        subject,
        body,
        html: body.replace(/\n/g, '<br>'),
        status: 'delivered',
        channel: 'email'
      }
    });

    // Create notification for new response
    await prisma.notification.create({
      data: {
        tenantId: req.tenantId,
        userId: req.userId,
        type: 'email_received',
        title: 'Respuesta de email',
        description: `${lead.name} respondió al email: "${subject}"`,
        leadId,
        channel: 'email'
      }
    });

    res.status(201).json({ success: true, email });
  }
catch (err) {
    console.error('Error adding manual response:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;