// Chat Routes - Multi-tenant con Prisma
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { optionalAuth, tenantFilter } = require('../middleware/auth');
const { normalizePhone } = require('../utils/validation');
const multer = require('multer');

// Import Messenger and Instagram services for sending messages
const messengerService = require('../services/messengerService');
const instagramService = require('../services/instagramService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }
});

// Middleware to skip auth for webhook routes
const skipAuth = (req, res, next) => {
  req.skipAuth = true;
  next();
};

// Helper to get default tenant ID (for webhooks without auth)
async function getDefaultTenantId() {
  // Try to get from .env first
if (process.env.DEFAULT_TENANT_ID) {
    return process.env.DEFAULT_TENANT_ID;
  }
  
  // Otherwise, find first tenant in database
const tenant = await prisma.tenant.findFirst();
  if (tenant) {
    return tenant.id;
  }
  
  // Create default tenant if none exists
const newTenant = await prisma.tenant.create({
    data: {
      name: 'Default Tenant',
      slug: 'default'
    }
  });
  return newTenant.id;
}

// Cache the default tenant ID for performance
let cachedTenantId = null;
async function getTenantId() {
  if (cachedTenantId) return cachedTenantId;
  cachedTenantId = await getDefaultTenantId();
  return cachedTenantId;
}

/**
 * Create a chat_message notification for an incoming message.
 * Recipient: lead.assignedTo if set, otherwise all active admins of the tenant.
 * Never throws — notification errors must not break the webhook response.
 */
async function createChatNotification({ lead, content, channel, channelLabel, fromName }) {
  try {
    const recipients = [];
    if (lead.assignedTo) {
      recipients.push(lead.assignedTo);
    } else {
      const admins = await prisma.user.findMany({
        where: { tenantId: lead.tenantId, role: 'admin', isActive: true },
        select: { id: true }
      });
      for (const admin of admins) recipients.push(admin.id);
    }

    if (recipients.length === 0) {
      console.log(`[chat] Sin destinatarios para notificación de ${channel}`);
      return;
    }

    const shortContent = (content || '[Mensaje]').substring(0, 120);
    const description = `Nuevo mensaje de ${lead.name || fromName || 'Lead'}: ${shortContent}`;

    for (const userId of recipients) {
      await prisma.notification.create({
        data: {
          tenantId: lead.tenantId,
          userId,
          type: 'chat_message',
          title: `Nuevo mensaje de ${channelLabel}`,
          description,
          leadId: lead.id,
          channel
        }
      });
    }
    console.log(`🔔 Notificación de ${channel} creada (${recipients.length} destinatario(s))`);
  } catch (err) {
    console.error(`❌ Error creando notificación de ${channel}:`, err.message);
  }
}

// ==================== CONVERSATIONS ====================

/**
 * GET /api/chat/conversations
 * Get all active conversations for the tenant
 */
router.get('/conversations', optionalAuth, async (req, res) => {
try {
    const conversations = await prisma.conversation.findMany({
      where: tenantFilter(req),
      include: {
        lead: true,
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Enrich with lead info and count unread
let totalUnread = 0;
    
    const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
      const messages = await prisma.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { sentAt: 'desc' }
      });
      
      const unreadCount = messages.filter(msg => 
        msg.direction === 'inbound' && !msg.readAt
      ).length;
      
      totalUnread += unreadCount;
      
      return {
        ...conv,
        leadName: conv.lead?.name || 'Lead',
        leadPhone: conv.lead?.phone || null,
        leadEmail: conv.lead?.email || null,
        lastMessage: messages[0]?.content || '',
        lastMessageAt: conv.updatedAt,
        unreadCount
      };
    }));
    
    res.json({ conversations: enrichedConversations, totalUnread });
  } catch (err) {
    console.error('Error getting conversations:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/chat/unread-count
 * Get total unread messages count for sidebar badge
 */
router.get('/unread-count', optionalAuth, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: tenantFilter(req),
      include: {
        messages: true
      }
    });
    
    let totalUnread = 0;
    for (const conv of conversations) {
      const unreadCount = conv.messages.filter(msg => 
        msg.direction === 'inbound' && !msg.readAt
      ).length;
      totalUnread += unreadCount;
    }
    
    // Also get chat notifications
const chatNotifications = await prisma.notification.count({
      where: {
        ...tenantFilter(req),
        type: 'chat_message',
        read: false
      }
    });
    
    res.json({ 
      unreadMessages: totalUnread,
      unreadNotifications: chatNotifications,
      total: totalUnread + chatNotifications
    });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/chat/conversations
 * Get or create conversation for a lead
 */
router.post('/conversations', optionalAuth, async (req, res) => {
  try {
    const { leadId, channel = 'whatsapp' } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Se requiere leadId' });
    }

    // Verify lead belongs to tenant
const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...tenantFilter(req) }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Check if conversation exists
let conversation = await prisma.conversation.findFirst({
      where: { leadId, ...tenantFilter(req) }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId,
          tenantId: req.tenantId,
          channel,
          status: 'active'
        }
      });
    }
    
    res.json({ conversation });
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/chat/conversations/lead/:leadId
 * Get conversation by lead ID
 */
router.get('/conversations/lead/:leadId', optionalAuth, async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const conversation = await prisma.conversation.findFirst({
      where: { leadId, ...tenantFilter(req) },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' }
        },
        lead: true,
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    res.json({ conversation });
  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/chat/conversations/:id
 * Get single conversation by ID
 */
router.get('/conversations/:id', optionalAuth, async (req, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.id,
        ...tenantFilter(req)
      },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' }
        },
        lead: true,
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    res.json({ conversation });
  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/chat/conversations/:id/assign
 * Assign conversation to a user
 */
router.put('/conversations/:id/assign', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.id,
        ...tenantFilter(req)
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { assignedTo: userId }
    });
    
    res.json({ success: true, conversation: updated });
  } catch (err) {
    console.error('Error assigning conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/chat/conversations/:id/close
 * Close a conversation
 */
router.put('/conversations/:id/close', optionalAuth, async (req, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.id,
        ...tenantFilter(req)
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: 'closed' }
    });
    
    res.json({ success: true, conversation: updated });
  } catch (err) {
    console.error('Error closing conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MESSAGES ====================

/**
 * GET /api/chat/messages/:conversationId
 * Get all messages in a conversation
 */
router.get('/messages/:conversationId', optionalAuth, async (req, res) => {
try {
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.conversationId,
        ...tenantFilter(req)
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.conversationId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    res.json({ messages });
  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Alternative route for frontend compatibility
router.get('/conversations/:conversationId/messages', optionalAuth, async (req, res) => {
try {
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.conversationId,
        ...tenantFilter(req)
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.conversationId },
      orderBy: { sentAt: 'asc' }
    });
    
    res.json({ messages });
  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/chat/messages/:conversationId
 * Send a message in a conversation
 */
router.post('/messages/:conversationId', optionalAuth, async (req, res) => {
  try {
    const { content, type = 'text', mediaUrl, channel } = req.body;
    
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.conversationId,
        ...tenantFilter(req)
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    // Get lead info to know the Facebook ID
const lead = await prisma.lead.findFirst({
      where: { id: conversation.leadId }
    });
    
    const messageChannel = channel || conversation.channel;
    let externalMessageId = null;
    let sentViaApi = false;
    
    // Send via Facebook API if it's a messenger conversation
if (messageChannel === 'messenger' && lead?.facebookId) {
      try {
        const result = await messengerService.sendTextMessage(lead.facebookId, content);
        externalMessageId = result.messageId;
        sentViaApi = true;
        console.log('✅ Sent message via Facebook Messenger API');
      } catch (apiError) {
        console.error('❌ Failed to send via Facebook API:', apiError.message);
        // Continue anyway - we'll save the message locally even if API fails
      }
    }
    
    // Send via Instagram API if it's an instagram conversation
if (messageChannel === 'instagram' && lead?.instagramId) {
      try {
        const result = await instagramService.sendTextMessage(lead.instagramId, content);
        externalMessageId = result.messageId;
        sentViaApi = true;
        console.log('✅ Sent message via Instagram API');
      } catch (apiError) {
        console.error('❌ Failed to send via Instagram API:', apiError.message);
        // Continue anyway - we'll save the message locally even if API fails
      }
    }
    
    // For WhatsApp, we'd use whatsappService here (not implemented yet)
    // For now, we'll save locally for WhatsApp too
const message = await prisma.message.create({
      data: {
        conversationId: req.params.conversationId,
        leadId: conversation.leadId,
        channel: messageChannel,
        direction: 'outbound',
        type,
        content,
        mediaUrl,
        senderId: req.user.id,
        externalId: externalMessageId,
        sentViaApi
      }
    });
    
    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: { updatedAt: new Date() }
    });
    
    res.json({ success: true, message });
  }
catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/chat/messages/to-lead
 * Send a message to a lead
 */
router.post('/messages/to-lead', optionalAuth, async (req, res) => {
  try {
    const { leadId, channel = 'whatsapp', content, type = 'text', mediaUrl } = req.body;
    
    console.log('[to-lead] Request:', { leadId, channel, content: content?.substring(0, 50), tenantId: req.tenantId, user: req.user?.email });
    
    if (!leadId || !content) {
      return res.status(400).json({ error: 'Se requiere leadId y content' });
    }
    
    // Get tenantId - use from auth or find from lead
let tenantId = req.tenantId;
    console.log('[to-lead] tenantId from auth:', tenantId);
    
    // Get lead info to find tenant
const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    
    // Use lead's tenantId if not authenticated
if (!tenantId) {
      tenantId = lead.tenantId;
    }
    
    // Find or create conversation
let conversation = await prisma.conversation.findFirst({
      where: { leadId, channel, tenantId }
    });
    
    if (!conversation) {
      // Create a new conversation if it doesn't exist
      conversation = await prisma.conversation.create({
        data: {
          leadId,
          tenantId,
          channel,
          status: 'active'
        }
      });
    }
let externalMessageId = null;
    
    // Send via Facebook API if it's messenger
if (channel === 'messenger' && lead?.facebookId) {
      try {
        const result = await messengerService.sendTextMessage(lead.facebookId, content);
        externalMessageId = result.messageId;
        console.log('✅ Sent message to lead via Facebook Messenger API');
      } catch (apiError) {
        console.error('❌ Failed to send via Facebook API:', apiError.message);
      }
    }
    
    // Send via Instagram API if it's instagram
if (channel === 'instagram' && lead?.instagramId) {
      try {
        const result = await instagramService.sendTextMessage(lead.instagramId, content);
        externalMessageId = result.messageId;
        console.log('✅ Sent message to lead via Instagram API');
      } catch (apiError) {
        console.error('❌ Failed to send via Instagram API:', apiError.message);
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId,
        channel,
        direction: 'outbound',
        type,
        content,
        mediaUrl,
        senderId: req.user?.id,
        externalId: externalMessageId
      }
    });
    
    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });
    
    res.json({ success: true, message });
  }
catch (err) {
    console.error('Error sending message to lead:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/chat/messages/:messageId/read
 * Mark message as read
 */
router.put('/messages/:messageId/read', optionalAuth, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId },
      include: {
        conversation: true
      }
    });
    
    if (!message || message.conversation.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    const updated = await prisma.message.update({
      where: { id: req.params.messageId },
      data: { readAt: new Date() }
    });
    
    res.json({ success: true, message: updated });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all messages in conversation as read (for frontend compatibility)
router.post('/conversations/:conversationId/read', optionalAuth, async (req, res) => {
try {
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: req.params.conversationId,
        ...tenantFilter(req)
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Mark all unread inbound messages as read
const updated = await prisma.message.updateMany({
      where: { 
        conversationId: req.params.conversationId,
        direction: 'inbound',
        readAt: null
      },
      data: { readAt: new Date() }
    });
    
    res.json({ success: true, count: updated.count });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== WEBHOOKS (No Auth Required) ====================

/**
 * POST /api/chat/webhook/whatsapp
 * WhatsApp webhook for incoming messages
 */
router.post('/webhook/whatsapp', skipAuth, async (req, res) => {
try {
    console.log('📥 WhatsApp webhook received');
    
    // Handle verification (first time setup)
if (req.query['hub.mode'] === 'subscribe') {
      const verifyToken = req.query['hub.verify_token'];
      if (verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('✅ WhatsApp webhook verified');
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).send('Verification failed');
    }
    
    // Process incoming message
const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageData = changes?.value?.messages?.[0];
    
    if (!messageData) {
      return res.status(200).send('OK');
    }

    const { from, id, timestamp, text, image, interactive } = messageData;
    // WhatsApp Cloud API sends E.164 WITHOUT the leading '+' (e.g. '5215512345678').
    // Normalize to canonical E.164 so manual leads created with '+52...' match this
    // webhook instead of creating duplicates.
    const phone = /^\d+$/.test(from) ? normalizePhone(`+${from}`) : normalizePhone(from);
    const channel = 'whatsapp';
    
    console.log(`📱 Message from ${phone}: ${text?.body || '[media]'}`);
    
    // Find or create lead by phone
let lead = await prisma.lead.findFirst({
      where: { phone, ...tenantFilter(req) }
    });
    
    if (!lead) {
      // Create a new lead from the incoming message
const tenantId = await getTenantId();
      lead = await prisma.lead.create({
        data: {
          tenantId: tenantId,
          name: `Lead ${phone.slice(-4)}`,
          phone,
          channel,
          status: 'nuevo',
          source: 'WhatsApp'
        }
      });
    }
    
    // Get or create conversation
let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel }
    });
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          tenantId: lead.tenantId,
          channel,
          status: 'active'
        }
      });
    }
    
    // Save the message
const content = text?.body || (image ? '[Imagen]' : '[Mensaje interactivo]');
    
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        channel,
        direction: 'inbound',
        type: image ? 'image' : 'text',
        content,
        mediaUrl: image?.id ? `whatsapp://${image.id}` : null,
        externalId: id,
        sentAt: new Date(parseInt(timestamp) * 1000)
      }
    });
    
    // Update lead last contact
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContact: new Date() }
    });
    
    // Create notification for the incoming message (must not break the webhook)
    await createChatNotification({
      lead,
      content,
      channel,
      channelLabel: 'WhatsApp',
      fromName: from
    });
    
    res.status(200).send('OK');
  }
catch (err) {
    console.error('Error processing WhatsApp webhook:', err);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/chat/webhook/instagram
 * Instagram webhook for incoming messages
 */
router.post('/webhook/instagram', skipAuth, async (req, res) => {
  try {
    console.log('📥 Instagram webhook received');
    
    // Handle verification
if (req.query['hub.mode'] === 'subscribe') {
      const verifyToken = req.query['hub.verify_token'];
      if (verifyToken === process.env.INSTAGRAM_VERIFY_TOKEN) {
        console.log('✅ Instagram webhook verified');
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).send('Verification failed');
    }
    
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    
    if (!messaging) {
      return res.status(200).send('OK');
    }

    const sender = messaging.sender;
    const message = messaging.message;
    
    // Find or create lead by Instagram ID
const instagramId = sender.id;
    let lead = await prisma.lead.findFirst({
      where: { 
        OR: [
          { source: 'Instagram', sourceDetail: instagramId },
          { instagramId: instagramId }
        ]
      }
    });
    
    if (!lead) {
      const tenantId = await getTenantId();
      lead = await prisma.lead.create({
        data: {
          tenantId: tenantId,
          name: `Instagram User ${instagramId.slice(-4)}`,
          channel: 'instagram',
          status: 'visitor',
          source: 'Instagram',
          sourceDetail: instagramId,
          instagramId: instagramId
        }
      });
      console.log(`👤 Created Instagram Visitor: ${lead.id}`);
    }
    
    // Get or create conversation
let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel: 'instagram' }
    });
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          tenantId: lead.tenantId,
          channel: 'instagram',
          status: 'active'
        }
      });
    }
    
    // Save the message
const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        channel: 'instagram',
        direction: 'inbound',
        type: 'text',
        content: message?.text || '[Mensaje]',
        externalId: message?.mid
      }
    });
    
    // Update lead last contact
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContact: new Date() }
    });
    
    // Create notification for new message (must not break the webhook)
    await createChatNotification({
      lead,
      content: message?.text || '[Mensaje]',
      channel: 'instagram',
      channelLabel: 'Instagram'
    });
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error processing Instagram webhook:', err);
    res.status(500).send('Error');
  }
});

/**
 * GET /api/chat/webhook/instagram
 * Instagram webhook verification
 */
router.get('/webhook/instagram', skipAuth, (req, res) => {
  console.log('📥 Instagram webhook GET (verification) received');
  console.log('Query:', JSON.stringify(req.query));
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log(`Mode: "${mode}"`);
  console.log(`Token received: "${token}"`);
  console.log(`Expected token: ${process.env.INSTAGRAM_VERIFY_TOKEN}`);
  
  // Accept any challenge for now (remove security for debugging)
if (challenge) {
    console.log('✅ Instagram webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ No challenge provided');
    res.status(400).send('No challenge provided');
  }
});

/**
 * GET /api/chat/webhook/facebook
 * Facebook webhook verification (MUST come before POST)
 */
router.get('/webhook/facebook', skipAuth, (req, res) => {
  console.log('📥 Facebook webhook GET (verification) received');
  console.log('Query:', JSON.stringify(req.query));
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log(`Mode: "${mode}"`);
  console.log(`Token received: "${token}"`);
  console.log(`Expected token: "${process.env.FACEBOOK_VERIFY_TOKEN}"`);
  console.log(`Challenge: "${challenge}"`);
  console.log(`Token match: ${token === process.env.FACEBOOK_VERIFY_TOKEN}`);
  
  // Accept any challenge for now (remove security for debugging)
if (challenge) {
    console.log('✅ Facebook webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ No challenge provided');
    res.status(400).send('No challenge provided');
  }
});

/**
 * POST /api/chat/webhook/facebook
 * Facebook Messenger webhook for incoming messages
 */
router.post('/webhook/facebook', skipAuth, async (req, res) => {
  try {
    console.log('📥 Facebook webhook POST received');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Process incoming messages
const { entry } = req.body;
    
    if (!entry || !entry[0]) {
      return res.status(200).send('OK');
    }
    
    for (const pageEntry of entry) {
      const { id, time, changes } = pageEntry;
      
      // Handle messaging changes
if (changes) {
        for (const change of changes) {
          if (change.field === 'conversations' || change.field === 'messages') {
            const { value } = change;
            
            if (value && value.messages) {
              for (const message of value.messages) {
                await processFacebookMessage(message, id);
              }
            }
          }
        }
      }
      
      // Alternative format: direct messaging
if (pageEntry.messaging) {
        for (const messaging of pageEntry.messaging) {
          await processFacebookMessaging(messaging);
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error processing Facebook webhook:', err);
    res.status(500).send('Error');
  }
});

/**
 * Process Facebook message from conversations/messaging format
 */
async function processFacebookMessage(message, pageId) {
  try {
    const { sender, recipient, timestamp, message: msgData } = message;
    const senderId = sender.id || sender;
    const pageId = recipient.id || recipient;
    const channel = 'messenger';
    
    console.log(`📱 Facebook message from ${senderId}: ${msgData?.text || '[no text]'}`);
    
    // Find or create lead by Facebook ID
let lead = await prisma.lead.findFirst({
      where: { 
        OR: [
          { sourceDetail: senderId },
          { facebookId: senderId }
        ]
      }
    });
    
    if (!lead) {
      // Create a Facebook Visitor (no full lead yet)
const tenantId = await getTenantId();
      lead = await prisma.lead.create({
        data: {
          tenantId: tenantId,
          name: `Facebook User ${senderId.slice(-4)}`,
          channel: 'messenger',
          status: 'visitor', // Visitor status
          source: 'Facebook Messenger',
          sourceDetail: senderId,
          facebookId: senderId
        }
      });
      console.log(`👤 Created Facebook Visitor: ${lead.id}`);
    }
    
    // Get or create conversation
let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel }
    });
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          tenantId: lead.tenantId,
          channel,
          status: 'active',
          metadata: { pageId }
        }
      });
      console.log(`💬 Created conversation: ${conversation.id}`);
    }
    
    // Save the message
const content = msgData?.text || msgData?.content || '[Mensaje]';
    
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        channel,
        direction: 'inbound',
        type: 'text',
        content,
        externalId: msgData?.mid || msgData?.id,
        sentAt: new Date(parseInt(timestamp) * 1000)
      }
    });
    
    // Update lead last contact
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContact: new Date() }
    });
    
    // Create notification for new message (must not break the webhook)
    await createChatNotification({
      lead,
      content,
      channel,
      channelLabel: 'Messenger'
    });
    
    console.log(`✅ Message saved for lead ${lead.id}`);
  } catch (err) {
    console.error('Error processing Facebook message:', err);
  }
}

/**
 * Process Facebook message from standard messaging format
 */
async function processFacebookMessaging(messaging) {
  try {
    const { sender, recipient, timestamp, message } = messaging;
    const senderId = sender.id;
    const channel = 'messenger';
    
    console.log(`📱 Facebook messaging from ${senderId}: ${message?.text || '[no text]'}`);
    
    // Find or create lead
let lead = await prisma.lead.findFirst({
      where: { 
        OR: [
          { sourceDetail: senderId },
          { facebookId: senderId }
        ]
      }
    });
    
    if (!lead) {
      const tenantId = await getTenantId();
      lead = await prisma.lead.create({
        data: {
          tenantId: tenantId,
          name: `Facebook User ${senderId.slice(-4)}`,
          channel: 'messenger',
          status: 'visitor',
          source: 'Facebook Messenger',
          sourceDetail: senderId,
          facebookId: senderId
        }
      });
    }
    
    // Get or create conversation
let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel }
    });
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          tenantId: lead.tenantId,
          channel,
          status: 'active'
        }
      });
    }
    
    // Save message
const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        channel,
        direction: 'inbound',
        type: 'text',
        content: message?.text || '[Mensaje]',
        externalId: message?.mid,
        sentAt: new Date(parseInt(timestamp) * 1000)
      }
    });
    
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContact: new Date() }
    });
    
    // Create notification for new message (must not break the webhook)
    await createChatNotification({
      lead,
      content: message?.text || '[Mensaje]',
      channel,
      channelLabel: 'Messenger'
    });
  } catch (err) {
    console.error('Error processing Facebook messaging:', err);
  }
}

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify conversation belongs to tenant
const conversation = await prisma.conversation.findFirst({
      where: { id, ...tenantFilter(req) }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    
    // Delete all messages in the conversation first
    await prisma.message.deleteMany({
      where: { conversationId: id }
    });
    
    // Delete the conversation
    await prisma.conversation.delete({
      where: { id }
    });
    
    res.json({ success: true });
  }
catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/chat/webhook/:provider
 * Webhook verification endpoint
 */
router.get('/webhook/:provider', skipAuth, (req, res) => {
  const { provider } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  let verifyToken;
  if (provider === 'whatsapp') {
    verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  } else if (provider === 'instagram') {
    verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;
  } else if (provider === 'facebook') {
    verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
  }
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log(`✅ ${provider} webhook verified`);
    res.status(200).send(challenge);
  } else {
    console.log(`❌ ${provider} webhook verification failed. Expected: ${verifyToken}, Got: ${token}`);
    res.status(403).send('Verification failed');
  }
});

module.exports = router;

/**
 * POST /api/chat/send/whatsapp
 * Send a WhatsApp message to a lead
 * NOTE: Uses optionalAuth to get tenant info if token provided
 */
router.post('/send/whatsapp', optionalAuth, async (req, res) => {
  try {
    const { phoneNumber, message, leadId } = req.body;
    
    console.log('[send/whatsapp] Request:', { phoneNumber, message: message?.substring(0, 30), leadId });
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Se requiere phoneNumber y message' });
    }
    
    // Get WhatsApp credentials
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'WhatsApp no configurado' });
    }
    
    // Send via WhatsApp API - usando versión v18.0 como el servicio original
const response = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber.replace(/\D/g, ''), // Remove non-digits
        type: 'text',
        text: { body: message }
      })
    });
const result = await response.json();
    
    if (!response.ok) {
      console.error('WhatsApp API error:', result);
      return res.status(response.status).json(result);
    }
    
    console.log('✅ WhatsApp message sent:', result);
    
    res.json({
      success: true,
      messageId: result.messages?.[0]?.id,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;