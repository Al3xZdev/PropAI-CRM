// Authentication Routes - Multi-tenant con Prisma + Supabase
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { prisma } = require('../services/db');
const { 
  generateAccessToken, 
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenUsed,
  verifyToken, 
  extractToken 
} = require('../services/authService');
const { logAuthEvent } = require('../middleware/auditLogger');

// Cookie options - diferente para dev vs production
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // true en producción (HTTPS)
  sameSite: 'strict', // Protege contra CSRF
  path: '/'
};

const accessCookieOptions = {
  ...cookieOptions,
  maxAge: 30 * 60 * 1000 // 30 minutos
};

const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
};

// Use dedicated auth middleware
const { requireAuth } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * POST /api/auth/login
 * Login multi-tenant (email + password)
 * Envía tokens en cookies httpOnly en lugar de localStorage
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Buscar usuario en la base de datos multi-tenant
    const user = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        isActive: true
      },
      include: { tenant: true }
    });
    
    if (!user) {
      // Registrar intento de login fallido
      logAuthEvent('login', null, null, email.toLowerCase(), null, false, 'Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Registrar intento de login fallido
      logAuthEvent('login', user.tenantId, user.id, user.email, user.name, false, 'Contraseña incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar tokens con tenantId
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    });
    
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId
    });
    
    // Enviar tokens como cookies httpOnly (SEGURO)
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    
    // Registrar login exitoso en audit log
    logAuthEvent('login', user.tenantId, user.id, user.email, user.name, true);
    
    // También devolver user info para el frontend (sin los tokens)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * POST /api/auth/refresh
 * Refrescar access token CON ROTACIÓN
 * Lee el refresh token de la cookie
 */
router.post('/refresh', async (req, res) => {
  try {
    // Leer refresh token de la cookie en lugar del body
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token no encontrado. Iniciá sesión.', code: 'NO_TOKEN' });
    }
    
    // Verificar si el token ya fue usado (prevención de replay attacks)
    if (isRefreshTokenUsed(refreshToken)) {
      return res.status(401).json({ 
        error: 'Token expirado. Iniciá sesión nuevamente.',
        code: 'TOKEN_REVOKED'
      });
    }
    
    const decoded = verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }
    
    // Revocar el token usado (rotación)
    revokeRefreshToken(refreshToken);
    
    // Obtener datos actualizados del usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tenant: true }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }
    
    // Generar nuevos tokens
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    });
    
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId
    });
    
    // Enviar nuevos tokens como cookies (rotación)
    res.cookie('accessToken', newAccessToken, accessCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);
    
    res.json({
      success: true,
      message: 'Tokens renovados'
    });
    
  } catch (error) {
    console.error('❌ Refresh error:', error);
    res.status(500).json({ error: 'Error al refrescar token' });
  }
});

/**
 * POST /api/auth/logout
 * Invalida el refresh token y limpia las cookies
 */
router.post('/logout', requireAuth, async (req, res) => {
  // Leer el refresh token de la cookie para revocarlo
  const refreshToken = req.cookies?.refreshToken;
  
  // Revocar el refresh token si existe
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }
  
  // Registrar logout
  logAuthEvent('logout', req.tenantId, req.user.id, req.user.email, req.user.name, true);
  
  // Limpiar las cookies
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  
  res.json({
    success: true,
    message: 'Sesión cerrada correctamente'
  });
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { tenant: true }
    });
    
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
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// ============================================
// ADMIN ROUTES - Solo admins pueden crear usuarios
// ============================================

/**
 * POST /api/auth/admin/create-user
 * Crear usuario para un cliente (NO auto-registro)
 */
router.post('/admin/create-user', requireAuth, async (req, res) => {
  try {
    // Solo admins pueden crear usuarios
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear usuarios' });
    }
    
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    // Verificar que el email no exista ya en este tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: req.tenantId,
        email: email.toLowerCase()
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado en esta empresa' });
    }
    
    // Crear usuario
    const passwordHash = await bcrypt.hash(password, 12);
    
    const newUser = await prisma.user.create({
      data: {
        tenantId: req.tenantId,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: role || 'agent'
      }
    });
    
    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      message: `Usuario creado exitosamente. Credenciales: ${email} / ${password}`
    });
    
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

/**
 * GET /api/auth/admin/users
 * Listar usuarios del tenant (solo admin)
 */
router.get('/admin/users', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden ver usuarios' });
    }
    
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      users
    });
    
  } catch (error) {
    console.error('❌ List users error:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

/**
 * PUT /api/auth/admin/users/:id
 * Actualizar usuario (solo admin)
 */
router.put('/admin/users/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden modificar usuarios' });
    }
    
    const { id } = req.params;
    const { name, role, isActive } = req.body;
    
    // Verificar que el usuario pertenezca al mismo tenant
    const userToUpdate = await prisma.user.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!userToUpdate) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });
    
    res.json({
      success: true,
      user: updatedUser
    });
    
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * DELETE /api/auth/admin/users/:id
 * Desactivar usuario (solo admin)
 */
router.delete('/admin/users/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar usuarios' });
    }
    
    const { id } = req.params;
    
    // No permitir que un admin se elimine a sí mismo
    if (id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminierte a ti mismo' });
    }
    
    // Verificar que el usuario pertenezca al mismo tenant
    const userToDelete = await prisma.user.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // En lugar de eliminar, desactivamos
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    
    res.json({
      success: true,
      message: 'Usuario desactivado correctamente'
    });
    
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;