const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// Load .env from current directory (backend folder)
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Prisma (multi-tenant con Supabase)
const { prisma } = require('./services/db');

// Initialize Resend email service
const { initializeResend } = require('./services/emailService');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
initializeResend(RESEND_API_KEY);

// Initialize automation service (cron job for sequences)
const { startAutomationService } = require('./services/automationService');

// Middleware
const { authRateLimit, generalRateLimit } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const propertyRoutes = require('./routes/properties');
const contentRoutes = require('./routes/content');
const scheduleRoutes = require('./routes/schedule');
const leadRoutes = require('./routes/leads');
const authRoutes = require('./routes/auth');
const automationRoutes = require('./routes/automation');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const contractRoutes = require('./routes/contracts');
const followupRoutes = require('./routes/followups');
const statsRoutes = require('./routes/stats');
const documentRoutes = require('./routes/documents');
const folderRoutes = require('./routes/folders');
const { testConnection } = require('./services/cloudinaryService');
const { testInstagramConnection } = require('./services/instagramPublisher');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Security headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.supabase.co"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Middleware - CORS with Authorization header support
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware - Parse cookies for auth
app.use(cookieParser());

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

// Public routes (no auth required) - with rate limiting (10 intentos por 15 min)
app.use('/api/auth', authRateLimit(10, 15 * 60 * 1000), authRoutes);

// Chat routes - MIXTO: webhooks públicos, resto protegido
app.use('/api/chat', chatRoutes);

// Protected routes (auth required) - with general rate limiting
app.use('/api/properties', generalRateLimit(100, 60000), requireAuth, propertyRoutes);
app.use('/api/content', generalRateLimit(100, 60000), requireAuth, contentRoutes);
app.use('/api/schedule', generalRateLimit(100, 60000), requireAuth, scheduleRoutes);
app.use('/api/leads', generalRateLimit(100, 60000), requireAuth, leadRoutes);
app.use('/api/automation', generalRateLimit(100, 60000), requireAuth, automationRoutes);
app.use('/api/notifications', generalRateLimit(100, 60000), requireAuth, notificationRoutes);
app.use('/api/emails', generalRateLimit(100, 60000), requireAuth, require('./routes/emails'));
// Contracts: SIN requireAuth global — el router maneja su propia auth
// (el endpoint /download/:id acepta el token como ?token= query param)
app.use('/api/contracts', generalRateLimit(100, 60000), contractRoutes);
app.use('/api/followups', generalRateLimit(100, 60000), requireAuth, followupRoutes);
app.use('/api/stats', generalRateLimit(100, 60000), requireAuth, statsRoutes);
// Permissions: solo admins pueden gestionar roles
app.use('/api/permissions', generalRateLimit(100, 60000), requireAuth, require('./routes/permissions'));
app.use('/api/assignment', generalRateLimit(100, 60000), requireAuth, require('./routes/assignment'));
app.use('/api/documents', generalRateLimit(100, 60000), requireAuth, documentRoutes);
app.use('/api/folders', generalRateLimit(100, 60000), requireAuth, folderRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prueba de webhook público - para verificar que ngrok funciona
app.get('/api/test-webhook', (req, res) => {
  console.log('📥 Test webhook llamado');
  console.log('  Query:', req.query);
  res.json({ received: true, query: req.query });
});

// Debug endpoint - ver variables de entorno de Facebook
app.get('/api/debug/facebook', (req, res) => {
  const vars = {
    FACEBOOK_ACCESS_TOKEN: process.env.FACEBOOK_ACCESS_TOKEN ? 'SET (length: ' + process.env.FACEBOOK_ACCESS_TOKEN.length + ')' : 'NOT SET',
    FACEBOOK_VERIFY_TOKEN: process.env.FACEBOOK_VERIFY_TOKEN || 'NOT SET',
    FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID || 'NOT SET'
  };
  console.log('📊 Debug Facebook env:', vars);
  res.json(vars);
});

// Debug endpoint - ver tenant del usuario autenticado
app.get('/api/debug/me', requireAuth, (req, res) => {
  res.json({
    userId: req.userId,
    tenantId: req.tenantId,
    user: req.user
  });
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
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);

  // Iniciar servicios después de que el servidor esté corriendo
  setTimeout(() => {
    startAutomationService(prisma);
    console.log('📅 Scheduled posts are published manually via /api/schedule/:scheduleId/publish/:postIndex');
  }, 3000);
});
