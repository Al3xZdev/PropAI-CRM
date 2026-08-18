// Authentication Service - JWT handling
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// In production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está configurado en las variables de entorno');
  process.exit(1);
}
const JWT_EXPIRES_IN = '30m'; // Token expires in 30 minutes (SEGuro)
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // Refresh token lasts 7 days

// Store used refresh tokens (in production, use Redis or database)
const usedRefreshTokens = new Set();

/**
 * Generate JWT access token (incluye tenantId para multi-tenant)
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      tenantId: user.tenantId  // CRITICAL para multi-tenant
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token (incluye tenantId) con rotación
 */
function generateRefreshToken(user) {
  const token = jwt.sign({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex') // Unique ID for rotation
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  return token;
}

/**
 * Revoke a refresh token (for rotation)
 */
function revokeRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    usedRefreshTokens.add(decoded.jti);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if refresh token was already used
 */
function isRefreshTokenUsed(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return usedRefreshTokens.has(decoded.jti);
  } catch (error) {
    return true; // Treat invalid as used
  }
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
 * Generate reset password token (one-time use)
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get token expiration date (1 hour from now)
 */
function getResetTokenExpiry() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return date.toISOString();
}

/**
 * Parse auth header to extract token
 */
function extractToken(authHeader) {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken,
  isRefreshTokenUsed,
  verifyToken,
  generateResetToken,
  getResetTokenExpiry,
  extractToken,
  JWT_SECRET
};