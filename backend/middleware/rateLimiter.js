// Rate Limiting Middleware
const rateLimitStore = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore) {
    if (now - value.windowStart > value.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Rate limiter for authentication endpoints
 * More permissive: 30 attempts per 5 minutes before blocking
 * @param {number} maxAttempts - Maximum attempts allowed in window
 * @param {number} windowMs - Time window in milliseconds (default 5 min)
 */
function authRateLimit(maxAttempts = 30, windowMs = 5 * 60 * 1000) {
  // Saltar rate limiting en tests
  if (process.env.VITEST) return (req, res, next) => next()
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `auth:${ip}`;
    
    const now = Date.now();
    const record = rateLimitStore.get(key);
    
    if (!record || now - record.windowStart > windowMs) {
      // New window
      rateLimitStore.set(key, {
        windowStart: now,
        windowMs,
        attempts: 1,
        blockedUntil: null
      });
      return next();
    }
    
    if (record.blockedUntil && now < record.blockedUntil) {
      const remaining = Math.ceil((record.blockedUntil - now) / 1000);
      return res.status(429).json({
        error: 'Demasiados intentos. Intenta de nuevo más tarde.',
        retryAfter: remaining
      });
    }
    
    if (record.attempts >= maxAttempts) {
      // Block for 5 minutes (shorter than before)
      record.blockedUntil = now + windowMs;
      return res.status(429).json({
        error: 'Demasiados intentos de inicio de sesión. Cuenta bloqueada temporalmente.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    record.attempts++;
    next();
  };
}

/**
 * General rate limiter for any endpoint
 */
function generalRateLimit(maxRequests = 100, windowMs = 60 * 1000) {
  // Saltar rate limiting en tests
  if (process.env.VITEST) return (req, res, next) => next()
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `general:${ip}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now - record.windowStart > windowMs) {
      rateLimitStore.set(key, {
        windowStart: now,
        windowMs,
        requests: 1
      });
      return next();
    }
    
    if (record.requests >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
      });
    }
    
    record.requests++;
    next();
  };
}

module.exports = {
  authRateLimit,
  generalRateLimit
};