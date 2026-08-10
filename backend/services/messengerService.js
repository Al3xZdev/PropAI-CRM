// Facebook Messenger API Service
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

const MESSENGER_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${MESSENGER_API_VERSION}`;

// Get credentials from environment
const getMessengerCredentials = () => {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  
  return {
    pageId: pageId || '',
    accessToken: accessToken || ''
  };
};

// Send text message via Facebook Messenger
const sendTextMessage = async (recipientId, text) => {
  const { pageId, accessToken } = getMessengerCredentials();
  
  if (!pageId || !accessToken) {
    throw new Error('Facebook Messenger credentials not configured');
  }

  const url = `${BASE_URL}/me/messages`;

  const body = {
    recipient: {
      id: recipientId
    },
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
      console.error('❌ Facebook Messenger API error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log('✅ Facebook message sent to', recipientId, '- Message ID:', data.message_id);
    return {
      success: true,
      messageId: data.message_id,
      recipientId
    };
  } catch (error) {
    console.error('❌ Error sending Facebook message:', error.message);
    throw error;
  }
};

// Send message with quick reply buttons
const sendQuickReply = async (recipientId, text, buttons) => {
  const { pageId, accessToken } = getMessengerCredentials();
  
  if (!pageId || !accessToken) {
    throw new Error('Facebook Messenger credentials not configured');
  }

  const url = `${BASE_URL}/me/messages`;

  const body = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text,
          buttons: buttons.map(btn => ({
            type: 'postback',
            title: btn.title,
            payload: btn.payload || btn.title
          }))
        }
      }
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
      console.error('❌ Facebook Messenger API error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log('✅ Facebook quick reply sent to', recipientId);
    return {
      success: true,
      messageId: data.message_id,
      recipientId
    };
  } catch (error) {
    console.error('❌ Error sending Facebook quick reply:', error.message);
    throw error;
  }
};

// Send generic template (for property listings, etc.)
const sendGenericTemplate = async (recipientId, elements) => {
  const { pageId, accessToken } = getMessengerCredentials();
  
  if (!pageId || !accessToken) {
    throw new Error('Facebook Messenger credentials not configured');
  }

  const url = `${BASE_URL}/me/messages`;

  const body = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements
        }
      }
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
      console.error('❌ Facebook Messenger API error:', data);
      throw new Error(data.error?.message || 'Failed to send template');
    }

    console.log('✅ Facebook generic template sent to', recipientId);
    return {
      success: true,
      messageId: data.message_id,
      recipientId
    };
  } catch (error) {
    console.error('❌ Error sending Facebook template:', error.message);
    throw error;
  }
};

// Get user profile (name, profile pic, etc.)
const getUserProfile = async (userId) => {
  const { accessToken } = getMessengerCredentials();
  
  if (!accessToken) {
    throw new Error('Facebook Messenger credentials not configured');
  }

  const url = `${BASE_URL}/${userId}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`;

  try {
    const response = await fetch(url, {
      method: 'GET'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Facebook API error:', data);
      throw new Error(data.error?.message || 'Failed to get user profile');
    }

    return {
      success: true,
      profile: data
    };
  } catch (error) {
    console.error('❌ Error getting Facebook user profile:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mark message as seen (typing indicator)
const markAsSeen = async (recipientId) => {
  const { accessToken } = getMessengerCredentials();
  
  if (!accessToken) {
    throw new Error('Facebook Messenger credentials not configured');
  }

  const url = `${BASE_URL}/me/messages`;

  const body = {
    recipient: {
      id: recipientId
    },
    sender_action: 'mark_seen'
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
    console.error('❌ Error marking message as seen:', error.message);
    return false;
  }
};

// Send typing indicator
const sendTypingOn = async (recipientId) => {
  const { accessToken } = getMessengerCredentials();
  
  if (!accessToken) {
    throw new Error('Facebook Messenger credentials not configured');
  }

  const url = `${BASE_URL}/me/messages`;

  const body = {
    recipient: {
      id: recipientId
    },
    sender_action: 'typing_on'
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
    console.error('❌ Error sending typing indicator:', error.message);
    return false;
  }
};

// Test connection
const testConnection = async () => {
  const { pageId, accessToken } = getMessengerCredentials();
  
  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'Facebook Messenger credentials not configured'
    };
  }

  try {
    const url = `${BASE_URL}/${pageId}?access_token=${accessToken}`;
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
      page: {
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
  sendQuickReply,
  sendGenericTemplate,
  getUserProfile,
  markAsSeen,
  sendTypingOn,
  testConnection
};
