// create-demo-user.js - Run with: node create-demo-user.js
require('dotenv').config();
const { UserDB } = require('./services/database');

console.log('🔧 Creando usuario de demostración...\n');

try {
  // Create demo user
  const user = UserDB.create('demo@realestate.ai', 'demo123', 'Usuario Demo');
  
  console.log('✅ Usuario creado exitosamente!');
  console.log('📧 Email: demo@realestate.ai');
  console.log('🔐 Contraseña: demo123');
  console.log('👤 Nombre:', user.name);
  console.log('🆔 ID:', user.id);
  console.log('\n💡 Podés usar estas credenciales para probar el sistema.');
  
} catch (error) {
  if (error.message.includes('ya está registrado')) {
    console.log('ℹ️ El usuario demo ya existe.');
    const existingUser = UserDB.findByEmail('demo@realestate.ai');
    console.log('📧 Email: demo@realestate.ai');
    console.log('🔐 Contraseña: demo123');
    console.log('👤 Nombre:', existingUser?.name);
  } else {
    console.log('❌ Error:', error.message);
  }
}
