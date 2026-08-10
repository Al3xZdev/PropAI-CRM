// WhatsApp Cloud API Service
const fetch = require('node-fetch');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load .env from the SAME place as server.js does
// server.js uses: path.join(__dirname, '..', '.env') which is /DemoRealState/.env
const envPath = path.join(__dirname, '..', '..', '.env');

let envLoaded = false;

// Try parent .env (DemoRealState/.env)
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env from parent folder:', envPath);
  envLoaded = true;
} 
// Fallback to backend .env
else {
const backendEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
    console.log('✅ Loaded .env from backend folder:', backendEnvPath);
    envLoaded = true;
  }
}

if (!envLoaded) {
  console.log('⚠️ No .env file found at:', envPath);
}

// Debug: show what was loaded
console.log('📋 Env vars loaded:', {
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'SET' : 'NOT SET',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? 'SET' : 'NOT SET'
});

// Get credentials from environment
const getWhatsAppCredentials = () => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!phoneNumberId || !accessToken) {
    console.error('❌ WhatsApp credentials not configured!');
    console.error('   WHATSAPP_PHONE_NUMBER_ID:', phoneNumberId || 'MISSING');
    console.error('   WHATSAPP_ACCESS_TOKEN:', accessToken ? 'SET but maybe expired' : 'MISSING');
  }
  
  return {
    phoneNumberId: phoneNumberId || '',
    accessToken: accessToken || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsapp_my_secret_token'
  };
};

const WHATSAPP_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Verify webhook token (for initial verification)
const verifyWebhook = (mode, token, challenge) => {
  const { webhookVerifyToken } = getWhatsAppCredentials();
  
  console.log('📋 Webhook verification attempt:');
  console.log('  - Received token:', token);
  console.log('  - Expected token:', webhookVerifyToken);
  console.log('  - Mode:', mode);
  console.log('  - Challenge:', challenge);
  
  if (token === webhookVerifyToken) {
    console.log('✅ WhatsApp webhook verified');
    return challenge;
  }
  console.log('❌ WhatsApp webhook verification failed - tokens do not match');
  return null;
};

// Send text message
const sendTextMessage = async (to, text) => {
  const { phoneNumberId, accessToken } = getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: {
      body: text
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log('✅ WhatsApp message sent:', data);
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      to
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

// Send image message
const sendImageMessage = async (to, imageUrl, caption = '') => {
  const { phoneNumberId, accessToken } = getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'image',
    image: {
      link: imageUrl,
      caption: caption
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send image');
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      to
    };
  } catch (error) {
    console.error('Error sending WhatsApp image:', error);
    throw error;
  }
};

// Send video message
const sendVideoMessage = async (to, videoUrl, caption = '') => {
  const { phoneNumberId, accessToken } = getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'video',
    video: {
      link: videoUrl,
      caption: caption
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send video');
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      to
    };
  } catch (error) {
    console.error('Error sending WhatsApp video:', error);
    throw error;
  }
};

// Send document message
const sendDocumentMessage = async (to, documentUrl, caption = '') => {
  const { phoneNumberId, accessToken } = getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'document',
    document: {
      link: documentUrl,
      caption: caption
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send document');
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      to
    };
  } catch (error) {
    console.error('Error sending WhatsApp document:', error);
    throw error;
  }
};

// Send template message (for initiating conversations)
const sendTemplateMessage = async (to, templateName, components = []) => {
  const { phoneNumberId, accessToken } = getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'es_MX'
      },
      components: components
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send template');
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      to
    };
  } catch (error) {
    console.error('Error sending WhatsApp template:', error);
    throw error;
  }
};

// Parse incoming webhook message
const parseWebhookMessage = (body) => {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Check if it's a message
if (!value?.messages || !value.messages[0]) {
      return null;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    // Extract media info - might be image, audio, video, or document
let mediaUrl = null;
    let mediaType = null;
    let mediaId = null;

    if (message.image) {
      mediaId = message.image.id || message.image.link;
      mediaType = 'image';
      // If it's a link, use it directly; otherwise we'll need to fetch
if (message.image.link) {
        mediaUrl = message.image.link;
      }
    } else if (message.video) {
      mediaId = message.video.id || message.video.link;
      mediaType = 'video';
      if (message.video.link) {
        mediaUrl = message.video.link;
      }
    } else if (message.audio) {
      mediaId = message.audio.id;
      mediaType = 'audio';
    } else if (message.document) {
      mediaId = message.document.id || message.document.link;
      mediaType = 'document';
      if (message.document.link) {
        mediaUrl = message.document.link;
      }
    }

    return {
      messageId: message.id,
      from: message.from, // phone number
      name: contact?.profile?.name || 'Unknown',
      type: message.type,
      timestamp: message.timestamp,
      content: message.text?.body || null,
      mediaId,
      mediaUrl, // direct URL if available
      mediaType,
      image: mediaType === 'image' ? mediaId : null,
      audio: mediaType === 'audio' ? mediaId : null,
      document: mediaType === 'document' ? mediaId : null
    };
  }
catch (error) {
    console.error('Error parsing webhook:', error);
    return null;
  }
};

// Mark message as read
const markMessageAsRead = async (messageId) => {
  const { phoneNumberId, accessToken } = getWhatsAppCredentials();
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  
  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Get message status updates
const getMessageStatus = async (messageId) => {
  const { accessToken } = getWhatsAppCredentials();
  
  if (!accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `${BASE_URL}/${messageId}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting message status:', error);
    throw error;
  }
};

// Test connection
const testConnection = async () => {
  const { accessToken, phoneNumberId } = getWhatsAppCredentials();
  
  if (!accessToken || !phoneNumberId) {
    return { connected: false, error: 'Missing credentials' };
  }

  try {
    // Try to get the phone number info
const url = `${BASE_URL}/${phoneNumberId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      return { 
        connected: true, 
        phoneNumberId: data.phone_number_id,
        verifiedNumber: data.verified_name 
      };
    } else {
      return { connected: false, error: data.error?.message };
    }
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

module.exports = {
  verifyWebhook,
  sendTextMessage,
  sendImageMessage,
  sendVideoMessage,
  sendDocumentMessage,
  sendTemplateMessage,
  parseWebhookMessage,
  markMessageAsRead,
  getMessageStatus,
  testConnection,
  getWhatsAppCredentials
};
