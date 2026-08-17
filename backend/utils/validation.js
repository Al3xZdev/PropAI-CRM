// Input Validation & Sanitization Utilities
const crypto = require('crypto');
const { parsePhoneNumber } = require('libphonenumber-js');

/**
 * Sanitize string input - remove potentially dangerous characters
 */
function sanitizeString(str, maxLength = 255) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '');  // Remove angle brackets to prevent HTML injection
}

/**
 * Sanitize email
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .slice(0, 254);
}

/**
 * Normalize phone number to E.164 (with leading +).
 * Lenient: parses with libphonenumber-js (defaulting to the given country when
 * no country code is detectable); falls back to light sanitization when the
 * input cannot be parsed or is invalid. Never throws.
 */
function normalizePhone(raw, defaultCountry = 'AR') {
  if (!raw || typeof raw !== 'string') return '';

  const input = raw.trim();
  if (!input) return '';

  const tryParse = (value) => {
    try {
      const parsed = parsePhoneNumber(value, defaultCountry);
      if (parsed && parsed.isValid()) return parsed.format('E.164');
      // Some numbers carry a legacy carrier '1' prefix (e.g. Mexican mobiles
      // written as +52155...) that current metadata no longer accepts as-is.
      if (parsed && parsed.countryCallingCode && /^1/.test(parsed.nationalNumber)) {
        const retry = parsePhoneNumber(`+${parsed.countryCallingCode}${parsed.nationalNumber.slice(1)}`, defaultCountry);
        if (retry && retry.isValid()) return retry.format('E.164');
      }
    } catch (err) {
      // Unparseable input; fall through to light sanitization.
    }
    return null;
  };

  const result = tryParse(input);
  if (result) return result;

  // Digits-only E.164 without the leading '+' (e.g. WhatsApp webhook payloads):
  // interpret it as an international number.
  if (/^\d+$/.test(input)) {
    const asE164 = tryParse(`+${input}`);
    if (asE164) return asE164;
  }

  // Fallback: keep only digits, +, -, spaces
  return input.replace(/[^\d+\-\s]/g, '').trim().slice(0, 20);
}

/**
 * Sanitize phone number
 */
function sanitizePhone(phone) {
  return normalizePhone(phone);
}

/**
 * Validate UUID format
 */
function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields
 */
function validateRequired(obj, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Validate lead data
 */
function validateLead(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push('El email no es válido');
  }
  
  if (data.phone && data.phone.length > 20) {
    errors.push('El teléfono es muy largo');
  }
  
  const validStatuses = ['nuevo', 'contactado', 'respondio', 'visita_agendada', 'visita_realizada', 'cerrado', 'perdido'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push('Estado de lead inválido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate property data
 */
function validateProperty(data) {
  const errors = [];
  
  if (!data.title || data.title.trim().length < 3) {
    errors.push('El título debe tener al menos 3 caracteres');
  }
  
  if (!data.address || data.address.trim().length < 5) {
    errors.push('La dirección debe tener al menos 5 caracteres');
  }
  
  if (data.price && (isNaN(data.price) || data.price < 0)) {
    errors.push('El precio debe ser un número válido');
  }
  
  if (data.area && (isNaN(data.area) || data.area < 0)) {
    errors.push('El área debe ser un número válido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user registration
 */
function validateUser(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('El email no es válido');
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }
  
  const validRoles = ['admin', 'agent', 'user'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push('Rol de usuario inválido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize entire lead object
 */
function sanitizeLead(lead) {
  return {
    name: sanitizeString(lead.name, 100),
    email: lead.email ? sanitizeEmail(lead.email) : null,
    phone: lead.phone ? sanitizePhone(lead.phone) : null,
    channel: sanitizeString(lead.channel, 20) || 'formulario',
    propertyInterest: sanitizeString(lead.propertyInterest, 50),
    propertyId: isValidUUID(lead.propertyId) ? lead.propertyId : null,
    propertyTitle: sanitizeString(lead.propertyTitle, 200),
    source: sanitizeString(lead.source, 100) || 'Manual',
    notes: sanitizeString(lead.notes, 1000),
    status: ['nuevo', 'contactado', 'respondio', 'visita_agendada', 'cerrado', 'perdido'].includes(lead.status) ? lead.status : 'nuevo'
  };
}

/**
 * Sanitize entire property object
 */
function sanitizeProperty(property) {
  return {
    title: sanitizeString(property.title, 200),
    address: sanitizeString(property.address, 500),
    price: property.price ? parseFloat(property.price) : 0,
    area: property.area ? parseInt(property.area) : 0,
    bedrooms: property.bedrooms ? parseInt(property.bedrooms) : 0,
    bathrooms: property.bathrooms ? parseInt(property.bathrooms) : 0,
    description: sanitizeString(property.description, 2000),
    propertyType: sanitizeString(property.propertyType, 50) || 'casa',
    yearBuilt: property.yearBuilt ? parseInt(property.yearBuilt) : null,
    floors: property.floors ? parseInt(property.floors) : 1
  };
}

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  normalizePhone,
  isValidUUID,
  isValidEmail,
  validateRequired,
  validateLead,
  validateProperty,
  validateUser,
  sanitizeLead,
  sanitizeProperty
};