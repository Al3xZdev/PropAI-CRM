// Instagram Publishing Service - Real API Integration
// Uses Instagram Graph API (not Basic Display API which was deprecated)

const INSTAGRAM_API_URL = 'https://graph.instagram.com';
const INSTAGRAM_GRAPH_URL = 'https://graph.facebook.com/v18.0';

/**
 * Test Instagram API connection and return account info
 */
async function testInstagramConnection(accessToken) {
  try {
    const response = await fetch(
      `${INSTAGRAM_GRAPH_URL}/me?fields=id,username,account_type,media_count,name&access_token=${accessToken}`
    );
    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    
    return { 
      success: true, 
      account: {
        id: data.id,
        username: data.username,
        type: data.account_type,
        mediaCount: data.media_count,
        name: data.name
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get Instagram Business Account ID from the access token
 * Using Instagram Graph API
 */
async function getInstagramBusinessAccount(accessToken) {
  try {
    console.log('🔍 Fetching Instagram account with token:', accessToken.substring(0, 20) + '...');
    
    // Use Graph API endpoint for Instagram
    const response = await fetch(
      `${INSTAGRAM_GRAPH_URL}/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    );
    const data = await response.json();
    
    console.log('📊 Instagram API response:', JSON.stringify(data));
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.id) {
      throw new Error('No se pudo obtener el ID de la cuenta de Instagram. Verificá que tu cuenta de Instagram esté vinculada a una Página de Facebook y que tengas los permisos correctos.');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting Instagram account:', error.message);
    throw error;
  }
}

/**
 * Create media container (image post) using Graph API
 */
async function createMediaContainer(accessToken, imageUrl, caption) {
  try {
    console.log('📦 Creating media container via Graph API...');
    console.log('   Image URL:', imageUrl);
    console.log('   Caption length:', caption.length);
    
    // Get the Instagram business account ID first
    const account = await getInstagramBusinessAccount(accessToken);
    const instagramUserId = account.id;
    
    // Create media container using Graph API
    const params = new URLSearchParams({
      image_url: imageUrl,
      caption: caption,
      access_token: accessToken
    });

    const response = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${instagramUserId}/media?${params.toString()}`,
      { method: 'POST' }
    );
    
    const data = await response.json();
    
    console.log('📦 Media container response:', JSON.stringify(data));
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data; // Returns { id: 'container_id', ... }
  } catch (error) {
    console.error('Error creating media container:', error.message);
    throw error;
  }
}

/**
 * Publish the media container using Graph API
 */
async function publishMedia(accessToken, containerId) {
  try {
    console.log('📤 Publishing container:', containerId);
    
    // Get account ID first
    const account = await getInstagramBusinessAccount(accessToken);
    const instagramUserId = account.id;
    
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken
    });

    const response = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${instagramUserId}/media_publish?${params.toString()}`,
      { method: 'POST' }
    );
    
    const data = await response.json();
    
    console.log('📤 Publish response:', JSON.stringify(data));
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data; // Returns { id: 'post_id', ... }
  } catch (error) {
    console.error('Error publishing media:', error.message);
    throw error;
  }
}

/**
 * Post an image to Instagram
 * @param {string} accessToken - Instagram access token
 * @param {string} imageUrl - Public URL of the image
 * @param {string} caption - Post caption
 * @returns {object} - Post result with ID
 */
async function postToInstagram(accessToken, imageUrl, caption) {
  try {
    // Step 1: Get account info
    const account = await getInstagramBusinessAccount(accessToken);
    console.log(`Posting to Instagram account: ${account.username}`);
    
    // Step 2: Create media container
    const container = await createMediaContainer(accessToken, imageUrl, caption);
    console.log(`Media container created: ${container.id}`);
    
    // Step 3: Publish the container
    const result = await publishMedia(accessToken, container.id);
    console.log(`Post published successfully: ${result.id}`);
    
    return {
      success: true,
      postId: result.id,
      accountId: account.id,
      username: account.username
    };
  } catch (error) {
    console.error('Instagram posting error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function getImageUrl(imagePath) {
  return imagePath;
}

module.exports = {
  postToInstagram,
  getInstagramBusinessAccount,
  testInstagramConnection
};