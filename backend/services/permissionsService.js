// Permissions Service - Role-based access control
const { prisma } = require('../services/db')

// Default permissions by role
const DEFAULT_PERMISSIONS = {
  admin: {
    leads: { read: true, write: true, delete: true, assign: true },
    properties: { read: true, write: true, delete: true },
    users: { read: true, write: true, delete: true },
    contracts: { read: true, write: true, delete: true },
    automation: { read: true, write: true, delete: true },
    analytics: { read: true, write: false, delete: false },
    settings: { read: true, write: true, delete: false },
    reports: { read: true, write: false, delete: false }
  },
  manager: {
    leads: { read: true, write: true, delete: false, assign: true },
    properties: { read: true, write: true, delete: false },
    users: { read: true, write: false, delete: false },
    contracts: { read: true, write: true, delete: false },
    automation: { read: true, write: true, delete: false },
    analytics: { read: true, write: false, delete: false },
    settings: { read: true, write: false, delete: false },
    reports: { read: true, write: false, delete: false }
  },
  agent: {
    leads: { read: true, write: true, delete: false, assign: false },
    properties: { read: true, write: false, delete: false },
    users: { read: false, write: false, delete: false },
    contracts: { read: true, write: true, delete: false },
    automation: { read: true, write: false, delete: false },
    analytics: { read: false, write: false, delete: false },
    settings: { read: false, write: false, delete: false },
    reports: { read: false, write: false, delete: false }
  }
}

// Get user permissions
async function getUserPermissions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true }
  })
  
  if (!user) return null
  
  // If user has custom permissions, use those; otherwise use role defaults
  if (user.permissions) {
    return user.permissions
  }
  
  return DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.agent
}

// Check if user has specific permission
async function hasPermission(userId, resource, action) {
  const permissions = await getUserPermissions(userId)
  
  if (!permissions) return false
  
  const resourcePerms = permissions[resource]
  if (!resourcePerms) return false
  
  return resourcePerms[action] === true
}

// Get all roles
function getRoles() {
  return [
    { 
      id: 'admin', 
      label: 'Administrador', 
      description: 'Acceso completo al sistema',
      color: '#ef4444'
    },
    { 
      id: 'manager', 
      label: 'Gerente / Supervisor', 
      description: 'Gestión de agentes y leads',
      color: '#f59e0b'
    },
    { 
      id: 'agent', 
      label: 'Agente', 
      description: 'Acceso limitado a propiedades y leads',
      color: '#22c55e'
    }
  ]
}

// Get permissions config for UI
function getPermissionsConfig() {
  return {
    leads: {
      label: 'Leads',
      actions: [
        { id: 'read', label: 'Ver leads' },
        { id: 'write', label: 'Crear/editar leads' },
        { id: 'delete', label: 'Eliminar leads' },
        { id: 'assign', label: 'Asignar leads a agentes' }
      ]
    },
    properties: {
      label: 'Propiedades',
      actions: [
        { id: 'read', label: 'Ver propiedades' },
        { id: 'write', label: 'Crear/editar propiedades' },
        { id: 'delete', label: 'Eliminar propiedades' }
      ]
    },
    users: {
      label: 'Usuarios',
      actions: [
        { id: 'read', label: 'Ver usuarios' },
        { id: 'write', label: 'Crear/editar usuarios' },
        { id: 'delete', label: 'Eliminar usuarios' }
      ]
    },
    contracts: {
      label: 'Contratos',
      actions: [
        { id: 'read', label: 'Ver contratos' },
        { id: 'write', label: 'Crear contratos' },
        { id: 'delete', label: 'Eliminar contratos' }
      ]
    },
    automation: {
      label: 'Automatizaciones',
      actions: [
        { id: 'read', label: 'Ver automatizaciones' },
        { id: 'write', label: 'Crear/editar automatizaciones' },
        { id: 'delete', label: 'Eliminar automatizaciones' }
      ]
    },
    analytics: {
      label: 'Analytics',
      actions: [
        { id: 'read', label: 'Ver analytics' }
      ]
    },
    settings: {
      label: 'Configuración',
      actions: [
        { id: 'read', label: 'Ver configuración' },
        { id: 'write', label: 'Editar configuración' }
      ]
    },
    reports: {
      label: 'Reportes',
      actions: [
        { id: 'read', label: 'Ver reportes' }
      ]
    }
  }
}

// Update user permissions
async function updateUserPermissions(userId, permissions) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { permissions }
  })
  return user
}

// Update user role and permissions
async function updateUserRole(userId, role, permissions = null) {
  // Use provided permissions or default role permissions
  const finalPermissions = permissions || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.agent
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: { 
      role,
      permissions: finalPermissions,
      updatedAt: new Date()
    }
  })
  
  return user
}

// Check if user is admin
async function isAdmin(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'admin'
}

// Check if user can manage users (admin or manager)
async function canManageUsers(userId) {
  const permissions = await getUserPermissions(userId)
  return permissions?.users?.write === true
}

module.exports = {
  DEFAULT_PERMISSIONS,
  getUserPermissions,
  hasPermission,
  getRoles,
  getPermissionsConfig,
  updateUserPermissions,
  updateUserRole,
  isAdmin,
  canManageUsers
}