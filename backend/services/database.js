// Database initialization and connection
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

let db;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeTables();
  }
  return db;
}

function initializeTables() {
  const database = getDatabase();
  
  // Users table - updated with Google fields
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
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

  // Notifications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      lead_id TEXT,
      channel TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
  } catch (e) { /* ignore */ }
  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`);
  } catch (e) { /* ignore */ }

  // Create indexes (ignore errors if columns don't exist yet)
  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  } catch (e) { /* ignore */ }
  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);
  } catch (e) { /* ignore */ }
  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`);
  } catch (e) { /* ignore */ }

  console.log('✅ Users table initialized');
  console.log('✅ Notifications table initialized');
}

// User operations
const UserDB = {
  create: (email, password, name = '') => {
    const database = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const hashedPassword = password ? bcrypt.hashSync(password, 12) : null;
    
    const stmt = database.prepare(`
      INSERT INTO users (id, email, password, name, auth_provider)
      VALUES (?, ?, ?, ?, 'email')
    `);
    
    try {
      stmt.run(id, email.toLowerCase(), hashedPassword, name);
      return { id, email: email.toLowerCase(), name };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        throw new Error('El email ya está registrado');
      }
      throw error;
    }
  },

  // Create or find user from Google
  findOrCreateGoogleUser: (googleId, email, name, picture) => {
    const database = getDatabase();
    
    // Try to find by Google ID first
    let stmt = database.prepare('SELECT * FROM users WHERE google_id = ?');
    let user = stmt.get(googleId);
    
    if (user) {
      // Update picture if changed
      if (picture && user.google_picture !== picture) {
        database.prepare('UPDATE users SET google_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(picture, user.id);
      }
      return { user, isNew: false };
    }
    
    // Check if email exists (user might have registered with email before)
    stmt = database.prepare('SELECT * FROM users WHERE email = ?');
    user = stmt.get(email.toLowerCase());
    
    if (user) {
      // Link Google account to existing user
      database.prepare('UPDATE users SET google_id = ?, google_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(googleId, picture, user.id);
      return { user, isNew: false };
    }
    
    // Create new user
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    
    stmt = database.prepare(`
      INSERT INTO users (id, email, name, google_id, google_picture, auth_provider)
      VALUES (?, ?, ?, ?, ?, 'google')
    `);
    
    stmt.run(id, email.toLowerCase(), name || '', googleId, picture);
    
    return { 
      user: { id, email: email.toLowerCase(), name: name || '' }, 
      isNew: true 
    };
  },

  findByGoogleId: (googleId) => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId);
  },

  findByEmail: (email) => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase());
  },

  findById: (id) => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT id, email, name, google_picture, role, auth_provider, created_at, is_active FROM users WHERE id = ?');
    return stmt.get(id);
  },

  verifyPassword: (password, hashedPassword) => {
    if (!hashedPassword) return false;
    return bcrypt.compareSync(password, hashedPassword);
  },

  updatePassword: (userId, newPassword) => {
    const database = getDatabase();
    const hashedPassword = bcrypt.hashSync(newPassword, 12);
    const stmt = database.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(hashedPassword, userId);
  },

  setResetToken: (email, token, expires) => {
    const database = getDatabase();
    const stmt = database.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?');
    return stmt.run(token, expires, email.toLowerCase());
  },

  findByResetToken: (token) => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > datetime("now")');
    return stmt.get(token);
  },

  clearResetToken: (userId) => {
    const database = getDatabase();
    const stmt = database.prepare('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?');
    return stmt.run(userId);
  }
};

// Notification operations
const NotificationDB = {
  create: (userId, type, title, message, leadId = null, channel = null) => {
    const database = getDatabase();
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    
    const stmt = database.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, lead_id, channel)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, type, title, message, leadId, channel);
    return { id, user_id: userId, type, title, message, lead_id: leadId, channel };
  },

  getByUser: (userId, limit = 50) => {
    const database = getDatabase();
    const stmt = database.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  // Get all notifications (including system notifications)
  getAll: (limit = 50) => {
    const database = getDatabase();
    const stmt = database.prepare(`
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  getUnreadCount: (userId) => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0');
    const result = stmt.get(userId);
    return result?.count || 0;
  },

  markAsRead: (notificationId, userId) => {
    const database = getDatabase();
    const stmt = database.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?');
    return stmt.run(notificationId, userId);
  },

  markAllAsRead: (userId) => {
    const database = getDatabase();
    const stmt = database.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?');
    return stmt.run(userId);
  },

  delete: (notificationId, userId) => {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
    return stmt.run(notificationId, userId);
  },

  deleteAll: (userId) => {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM notifications WHERE user_id = ?');
    return stmt.run(userId);
  }
};

module.exports = { getDatabase, UserDB, NotificationDB };
