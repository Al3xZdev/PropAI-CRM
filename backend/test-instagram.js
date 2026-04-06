// test-instagram.js - Run with: node test-instagram.js
require('dotenv').config();

const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

async function testInstagramAPI() {
  console.log('🧪 Probando Instagram API...\n');

  // Step 1: Get Instagram Business Account
  console.log('📱 Paso 1: Obteniendo información de Instagram...');
  
  try {
    // This endpoint should return your IG account info if the token is valid
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,username,account_type,media_count&access_token=${INSTAGRAM_TOKEN}`
    );
    const data = await response.json();
    
    console.log('📊 Respuesta:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.log('❌ Error:', data.error.message);
      console.log('\n💡 El token puede necesitar permisos adicionales.');
      console.log('   Ve a: https://developers.facebook.com/tools/explorer/');
      console.log('   Agrega estos permisos: instagram_basic, instagram_content_publish');
      return;
    }
    
    if (data.id) {
      console.log('\n✅ ¡Token válido!');
      console.log('📸 Instagram Account ID:', data.id);
      console.log('👤 Username:', data.username);
      console.log('📊 Tipo de cuenta:', data.account_type);
      console.log('🖼️ Media count:', data.media_count);
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

testInstagramAPI();
