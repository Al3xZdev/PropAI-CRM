// migrate.js - Run this to update the database with new columns
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');
const DB_NEW_PATH = path.join(__dirname, 'data', 'database_new.sqlite');

console.log('🔄 Iniciando migración de base de datos...\n');

let db;
let existingUsers = [];

// Get existing users from old database
try {
  db = new Database(DB_PATH);
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = columns.map(c => c.name);
  
  console.log('📋 Columnas actuales:', columnNames.join(', '));
  
  if (columnNames.includes('google_id')) {
    console.log('✅ La base de datos ya está actualizada!');
    db.close();
    process.exit(0);
  }
  
  // Get all existing users
  existingUsers = db.prepare('SELECT * FROM users').all();
  console.log(`📊 Encontrados ${existingUsers.length} usuarios`);
  db.close();
  
} catch (e) {
  console.log('❌ Error al abrir la base de datos:', e.message);
  process.exit(1);
}

// Create new database with correct schema
try {
  db = new Database(DB_NEW_PATH);
  
  // Create new table with all columns
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT,
      google_id TEXT UNIQUE,
      google_picture TEXT,
      role TEXT DEFAULT 'user',
      auth_provider TEXT DEFAULT 'email',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reset_token TEXT,
      reset_token_expires TEXT,
      is_active INTEGER DEFAULT 1
    )
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_google_id ON users(google_id);
    CREATE INDEX idx_users_reset_token ON users(reset_token);
  `);
  
  // Migrate existing users
  if (existingUsers.length > 0) {
    const insert = db.prepare(`
      INSERT INTO users (id, email, password, name, role, created_at, updated_at, reset_token, reset_token_expires, is_active, auth_provider)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'email')
    `);
    
    const insertMany = db.transaction((users) => {
      for (const user of users) {
        insert.run(
          user.id,
          user.email,
          user.password,
          user.name,
          user.role || 'user',
          user.created_at,
          user.updated_at,
          user.reset_token,
          user.reset_token_expires,
          user.is_active
        );
      }
    });
    
    insertMany(existingUsers);
    console.log(`✅ ${existingUsers.length} usuarios migrados`);
  }
  
  db.close();
  
  // Replace old database with new one
  const backupPath = DB_PATH + '.backup';
  if (fs.existsSync(DB_PATH)) {
    fs.renameSync(DB_PATH, backupPath);
    console.log(`✅ Backup guardado: ${backupPath}`);
  }
  
  fs.renameSync(DB_NEW_PATH, DB_PATH);
  console.log('✅ Base de datos actualizada!');
  console.log('📋 Nuevas columnas: google_id, google_picture, auth_provider');
  
} catch (e) {
  console.log('❌ Error en la migración:', e.message);
  if (fs.existsSync(DB_NEW_PATH)) {
    fs.unlinkSync(DB_NEW_PATH);
  }
  process.exit(1);
}

console.log('\n✅ Migración completada exitosamente!');
