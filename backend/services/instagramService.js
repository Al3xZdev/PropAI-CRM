// Instagram Messaging API Service
const fetch = require('node-fetch');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load .env from the SAME place as server.js
const envPath = path.join(__dirname, '..', '.env');

let envLoaded = false;

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  envLoaded = true;
}

const INSTAGRAM_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${INSTAGRAM_API_VERSION}`;

// Get credentials from environment
const getInstagramCredentials = () => {
  const instagramId = process.env.INSTAGRAM_BUSINESS_USER_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  return {
    instagramId: instagramId || '',
    accessToken: accessToken || ''
  };
};

// Send text message via Instagram DM
const sendTextMessage = async (recipientInstagramId, text) => {
  const { instagramId, accessToken } = getInstagramCredentials();
  
  if (!instagramId || !accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${BASE_URL}/${instagramId}/messages`;

  const body = {
    messaging_product: 'instagram',
    to: recipientInstagramId,
    message: {
      text: text
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instagram API error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log('✅ Instagram message sent to', recipientInstagramId, '- Message ID:', data.message_id);
    return {
      success: true,
      messageId: data.message_id,
      recipientId: recipientInstagramId
    };
  } catch (error) {
    console.error('❌ Error sending Instagram message:', error.message);
    throw error;
  }
};

// Send image via Instagram DM
const sendImage = async (recipientInstagramId, imageUrl, caption = '') => {
  const { instagramId, accessToken } = getInstagramCredentials();
  
  if (!instagramId || !accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${BASE_URL}/${instagramId}/messages`;

  const body = {
    messaging_product: 'instagram',
    to: recipientInstagramId,
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: imageUrl
        }
      }
    }
  };

  // Add caption if provided
if (caption) {
    body.message.text = caption;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instagram API error:', data);
      throw new Error(data.error?.message || 'Failed to send image');
    }

    console.log('✅ Instagram image sent to', recipientInstagramId);
    return {
      success: true,
      messageId: data.message_id,
      recipientId: recipientInstagramId
    };
  } catch (error) {
    console.error('❌ Error sending Instagram image:', error.message);
    throw error;
  }
};

// Send quick reply buttons
const sendQuickReply = async (recipientInstagramId, text, buttons) => {
  const { instagramId, accessToken } = getInstagramCredentials();
  
  if (!instagramId || !accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${BASE_URL}/${instagramId}/messages`;

  const body = {
    messaging_product: 'instagram',
    to: recipientInstagramId,
    message: {
      text: text,
      quick_replies: buttons.map(btn => ({
        payload: btn.payload || btn.title,
        title: btn.title.substring(0, 20) // Instagram limits button title to 20 chars
      }))
    }
  };
try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instagram API error:', data);
      throw new Error(data.error?.message || 'Failed to send quick reply');
    }

    console.log('✅ Instagram quick reply sent to', recipientInstagramId);
    return {
      success: true,
      messageId: data.message_id,
      recipientId: recipientInstagramId
    };
  } catch (error) {
    console.error('❌ Error sending Instagram quick reply:', error.message);
    throw error;
  }
};

// Get user profile (name, profile pic, etc.)
const getUserProfile = async (userId) => {
  const { accessToken } = getInstagramCredentials();
  
  if (!accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${BASE_URL}/${userId}?fields=username,name,profile_pic_url&access_token=${accessToken}`;

  try {
    const response = await fetch(url, {
      method: 'GET'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Instagram API error:', data);
      throw new Error(data.error?.message || 'Failed to get user profile');
    }

    return {
      success: true,
      profile: data
    };
  } catch (error) {
    console.error('❌ Error getting Instagram user profile:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mark message as seen (send "seen" receipt)
const markAsSeen = async (recipientInstagramId, messageId) => {
  const { instagramId, accessToken } = getInstagramCredentials();
  
  if (!accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${BASE_URL}/${instagramId}/messages`;

  const body = {
    messaging_product: 'instagram',
    to: recipientInstagramId,
    message: {
      link: messageId // For "seen" status, send the message ID as a link
    }
  };
try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Error marking Instagram message as seen:', error.message);
    return false;
  }
};

// Send typing indicator
const sendTypingOn = async (recipientInstagramId) => {
  const { instagramId, accessToken } = getInstagramCredentials();
  
  if (!accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${BASE_URL}/${instagramId}/messages`;

  const body = {
    messaging_product: 'instagram',
    to: recipientInstagramId,
    message: {
      text: '...' // Instagram uses "..." as typing indicator
    }
  };
try {
    // Note: Instagram doesn't have a dedicated typing indicator API like Messenger
    // We would need to use a different approach
return false;
  } catch (error) {
    console.error('❌ Error sending Instagram typing indicator:', error.message);
    return false;
  }
};

// Test connection
const testConnection = async () => {
  const { instagramId, accessToken } = getInstagramCredentials();
  
  if (!instagramId || !accessToken) {
    return {
      success: false,
      error: 'Instagram credentials not configured'
    };
  }

  try {
    const url = `${BASE_URL}/${instagramId}?access_token=${accessToken}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to connect'
      };
    }

    return {
      success: true,
      account: {
        id: data.id,
        name: data.name
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendTextMessage,
  sendImage,
  sendQuickReply,
  getUserProfile,
  markAsSeen,
  sendTypingOn,
  testConnection
};