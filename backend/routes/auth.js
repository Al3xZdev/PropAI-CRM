// Authentication Routes
const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { UserDB } = require('../services/database');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyToken, 
  generateResetToken, 
  getResetTokenExpiry,
  extractToken 
} = require('../services/authService');

// Initialize Passport
function initializePassport() {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;
        const picture = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        const { user, isNew } = UserDB.findOrCreateGoogleUser(googleId, email, name, picture);
        
        return done(null, { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          google_picture: picture 
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}

// Initialize passport
initializePassport();

// Apply auth middleware to protected routes
function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  // Attach user info to request
  req.user = decoded;
  next();
}

// Middleware to attach user if token exists (optional auth)
function optionalAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    // Check if email already exists
    const existingUser = UserDB.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Create user
    const user = UserDB.create(email, password, name);
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Error al registrar usuario' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Find user
    const user = UserDB.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }
    
    // Verify password
    if (!UserDB.verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }
    
    const user = UserDB.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' 
      });
    }
    
    // Generate reset token
    const resetToken = generateResetToken();
    const expires = getResetTokenExpiry();
    
    UserDB.setResetToken(email, resetToken, expires);
    
    // In production, send email here
    // For demo, we'll return the token in the response
    console.log(`🔑 Reset token for ${email}: ${resetToken}`);
    
    res.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña',
      // Remove this in production - only for demo
      resetToken: resetToken,
      resetLink: `/reset-password?token=${resetToken}`
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    // Find user by reset token
    const user = UserDB.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    
    // Update password
    UserDB.updatePassword(user.id, newPassword);
    
    // Clear reset token
    UserDB.clearResetToken(user.id);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }
    
    const decoded = verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }
    
    // Get fresh user data
    const user = UserDB.findById(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Error al refrescar token' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada correctamente'
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = UserDB.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        google_picture: user.google_picture,
        auth_provider: user.auth_provider,
        created_at: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', passport.authenticate('google', { 
  scope: ['email', 'profile'],
  prompt: 'select_account'
}));

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/error' }),
  (req, res) => {
    try {
      // req.user contains the user data from Google
      const user = UserDB.findById(req.user.id);
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=user_not_found`);
      }
      
      // Generate JWT tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        google_picture: user.google_picture,
        auth_provider: 'google'
      }))}`;
      
      console.log(`✅ Google login successful for: ${user.email}`);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
    }
  }
);

/**
 * GET /api/auth/google/error
 * Google OAuth error
 */
router.get('/google/error', (req, res) => {
  res.json({
    success: false,
    error: 'Error en la autenticación con Google'
  });
});

// Export middleware for use in other routes
module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
