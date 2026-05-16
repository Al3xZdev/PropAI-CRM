// RBAC Middleware - Role-Based Access Control for write operations
const permissionsService = require('../services/permissionsService');

// Resource to role mapping for write operations
// Format: 'method:route' -> required roles (null = no restriction)
const WRITE_PERMISSIONS = {
  // Auth routes
  'POST:/api/auth/admin/create-user': ['admin'],
  'PUT:/api/auth/admin/users/:id': ['admin'],
  'DELETE:/api/auth/admin/users/:id': ['admin'],
  
  // Permissions routes (all admin only)
  'PUT:/api/permissions/user/:userId/role': ['admin'],
  'PUT:/api/permissions/user/:userId': ['admin'],
  
  // Assignment routes (admin or manager)
  'POST:/api/assignment/assign/:leadId': ['admin', 'manager'],
  'POST:/api/assignment/auto-assign': ['admin', 'manager'],
  'DELETE:/api/assignment/unassign/:leadId': ['admin', 'manager'],
  
  // Properties - managers and agents can create/edit, only admin can delete
  'POST:/api/properties': ['admin', 'manager', 'agent'],
  'PUT:/api/properties/:id': ['admin', 'manager', 'agent'],
  'DELETE:/api/properties/:id': ['admin'],
  
  // Leads - all can read, but only admin/manager can delete
  'POST:/api/leads': ['admin', 'manager', 'agent'],
  'PUT:/api/leads/:id': ['admin', 'manager', 'agent'],
  'DELETE:/api/leads/:id': ['admin', 'manager'],
  
  // Automation - admin/manager can create/delete
  'POST:/api/automation': ['admin', 'manager'],
  'PUT:/api/automation/:id': ['admin', 'manager'],
  'DELETE:/api/automation/:id': ['admin', 'manager'],
  
  // Contracts - admin/manager can delete
  'DELETE:/api/contracts/:id': ['admin', 'manager'],
  
  // Documents - admin/manager can delete
  'DELETE:/api/documents/:id': ['admin', 'manager'],
  
  // Folders - admin/manager can delete
  'DELETE:/api/folders/:id': ['admin', 'manager'],
}

/**
 * RBAC middleware for write operations
 * Checks if user has permission to perform the action
 */
function requirePermission(action = 'write') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const method = req.method.toUpperCase();
    const path = req.route?.path || req.path;
    const routeKey = `${method}:${path}`;
    
    // Check if this route requires specific roles
    const requiredRoles = WRITE_PERMISSIONS[routeKey];
    
    if (requiredRoles) {
      // Check if user's role is in the allowed list
      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: `No tienes permisos para realizar esta acción. Se requiere rol: ${requiredRoles.join(' o ')}`,
          yourRole: req.user.role,
          requiredRoles
        });
      }
    }
    
    next();
  };
}

/**
 * Simple role check - require specific roles
 */
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `No tienes el rol requerido. Roles permitidos: ${roles.join(', ')}`,
        currentRole: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Admin only middleware
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Solo administradores pueden realizar esta acción',
      currentRole: req.user.role
    });
  }
  
  next();
}

/**
 * Manager or above (admin or manager)
 */
function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Se requiere rol de administrador o gerente',
      currentRole: req.user.role
    });
  }
  
  next();
}

module.exports = {
  requirePermission,
  requireRoles,
  requireAdmin,
  requireManager
};