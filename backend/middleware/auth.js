// Authentication Middleware - Dedicated auth handling
const jwt = require('jsonwebtoken');
const { prisma } = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET || 'real-estate-crm-secret-key-2024';

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Main authentication middleware
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Token de autenticación requerido',
      code: 'NO_TOKEN'
    });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Token inválido o expirado',
      code: 'INVALID_TOKEN'
    });
  }

  // Attach user info to request
  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    tenantId: decoded.tenantId
  };
  req.tenantId = decoded.tenantId;
  req.userId = decoded.id; // Add for easier access in routes
  
  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId
      };
      req.tenantId = decoded.tenantId;
      req.userId = decoded.id;
    }
  }
  
  next();
}

/**
 * Role-based access control
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'No tienes permisos para realizar esta acción',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Tenant isolation check
 */
function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant no identificado' });
  }
  
  next();
}

module.exports = {
  extractToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireTenant,
  JWT_SECRET
};