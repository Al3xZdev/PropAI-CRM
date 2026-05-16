// Audit Trail Middleware - Registra acciones importantes
const { prisma } = require('../services/db');

/**
 * AuditLogger - Middleware para registrar acciones importantes
 * 
 * Actions a registrar:
 * - auth.login, auth.logout, auth.refresh
 * - create, update, delete de cualquier recurso
 * 
 * Para usar en rutas específicas:
 * const auditLog = require('./middleware/auditLogger');
 * router.post('/leads', auditLog('create', 'leads'), handler);
 */
function auditLog(action, resource) {
  return async (req, res, next) => {
    // Solo registrar si hay usuario autenticado
    if (!req.user) {
      return next();
    }

    // Capturar la respuesta original
    const originalJson = res.json.bind(res);
    
    // Sobrescribir json para capturar la respuesta
    res.json = function(data) {
      // Determinar si fue exitoso basado en el status code
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
      
      // Async logging - no bloquea la respuesta
      logAuditEvent({
        tenantId: req.tenantId,
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        userRole: req.user.role,
        action,
        resource,
        resourceId: req.params.id || req.body?.id || data?.id,
        details: extractDetails(req, data),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        success: isSuccess,
        errorMessage: isSuccess ? null : (data?.error || data?.message)
      }).catch(err => console.error('Audit log error:', err));

      return originalJson(data);
    };

    next();
  };
}

/**
 * Log de acciones de auth (login/logout) que no pasan por requireAuth
 */
async function logAuthEvent(action, tenantId, userId, userEmail, userName, success, errorMessage = null) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        userEmail,
        userName,
        action: `auth.${action}`,
        resource: 'auth',
        success,
        errorMessage
      }
    });
  } catch (err) {
    console.error('Failed to log auth event:', err);
  }
}

/**
 * Función principal de logging
 */
async function logAuditEvent(data) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        userRole: data.userRole,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success,
        errorMessage: data.errorMessage
      }
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

/**
 * Extraer detalles relevantes del request/response
 */
function extractDetails(req, resData) {
  const details = {};
  
  // Agregar datos del body (sin passwords)
  if (req.body && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    delete safeBody.password;
    delete safeBody.passwordHash;
    if (Object.keys(safeBody).length > 0) {
      details.body = safeBody;
    }
  }
  
  // Agregar datos sensibles del response
  if (resData?.user) {
    details.createdUser = {
      id: resData.user.id,
      email: resData.user.email,
      name: resData.user.name
    };
  }
  
  return Object.keys(details).length > 0 ? details : null;
}

/**
 * Middleware para auditar solo errores (para usar después del handler)
 */
function auditError(action, resource) {
  return async (err, req, res, next) => {
    if (!req.user) {
      return next(err);
    }

    await logAuditEvent({
      tenantId: req.tenantId,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      action: `${action}.error`,
      resource,
      resourceId: req.params.id,
      details: { error: err.message, stack: err.stack },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      errorMessage: err.message
    });

    next(err);
  };
}

module.exports = {
  auditLog,
  auditError,
  logAuditEvent,
  logAuthEvent
};