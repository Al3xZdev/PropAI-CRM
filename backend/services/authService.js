// Authentication Service - JWT handling
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// In production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'real-estate-crm-secret-key-2024';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days
const REFRESH_TOKEN_EXPIRES_IN = '30d';

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token (longer lived)
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
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
  verifyToken,
  generateResetToken,
  getResetTokenExpiry,
  extractToken,
  JWT_SECRET
};
