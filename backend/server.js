const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize database
require('./services/database');

const propertyRoutes = require('./routes/properties');
const contentRoutes = require('./routes/content');
const scheduleRoutes = require('./routes/schedule');
const leadRoutes = require('./routes/leads');
const authRoutes = require('./routes/auth');
const automationRoutes = require('./routes/automation');
const { testConnection } = require('./services/cloudinaryService');
const { testInstagramConnection } = require('./services/instagramPublisher');
const { requireAuth } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads (memory storage for Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpg, png, webp)'));
  }
});

// Make upload middleware available to routes
app.set('upload', upload);

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/properties', requireAuth, propertyRoutes);
app.use('/api/content', requireAuth, contentRoutes);
app.use('/api/schedule', requireAuth, scheduleRoutes);
app.use('/api/leads', requireAuth, leadRoutes);
app.use('/api/automation', requireAuth, automationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cloudinary test endpoint
app.get('/api/cloudinary/test', async (req, res) => {
  try {
    const connected = await testConnection();
    res.json({ 
      success: connected, 
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      message: connected ? 'Cloudinary connected successfully' : 'Cloudinary connection failed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Instagram test endpoint
app.get('/api/instagram/test', async (req, res) => {
  try {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    
    if (!token) {
      return res.json({ 
        success: false, 
        message: 'Token de Instagram no configurado',
        hint: 'Agregá INSTAGRAM_ACCESS_TOKEN en tu archivo .env'
      });
    }
    
    const result = await testInstagramConnection(token);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Instagram API conectada correctamente',
        account: result.account
      });
    } else {
      res.json({ 
        success: false, 
        error: result.error,
        hint: 'Verificá que tu cuenta de Instagram sea Business o Creator y esté vinculada a una Página de Facebook'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Algo salió mal' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
