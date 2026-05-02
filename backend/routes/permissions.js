// Permissions Routes - Role and Permission Management
const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const permissionsService = require('../services/permissionsService')

/**
 * GET /api/permissions/roles
 * Get all available roles
 */
router.get('/roles', requireAuth, async (req, res) => {
  try {
    // Only admins can see roles configuration
    const isAdmin = await permissionsService.isAdmin(req.userId)
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden ver la configuración de roles' })
    }
    
    const roles = permissionsService.getRoles()
    res.json({ roles })
  } catch (err) {
    console.error('Error getting roles:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/permissions/config
 * Get permissions configuration for UI
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    // Only admins can see full config
    const isAdmin = await permissionsService.isAdmin(req.userId)
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden ver la configuración de permisos' })
    }
    
    const config = permissionsService.getPermissionsConfig()
    res.json({ config })
  } catch (err) {
    console.error('Error getting permissions config:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/permissions/user/:userId
 * Get permissions for a specific user
 */
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params
    
    // Check if user has permission to view other users' permissions
    const canManage = await permissionsService.canManageUsers(req.userId)
    const isOwnProfile = req.userId === userId
    
    // Allow if: is own profile, is admin, or can manage users
    if (!isOwnProfile && !canManage) {
      return res.status(403).json({ error: 'No tienes permiso para ver permisos de otros usuarios' })
    }
    
    const permissions = await permissionsService.getUserPermissions(userId)
    if (!permissions) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    
    res.json({ permissions })
  } catch (err) {
    console.error('Error getting user permissions:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/permissions/user/:userId/role
 * Update user role
 */
router.put('/user/:userId/role', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body
    
    // Only admins can change roles
    const isAdmin = await permissionsService.isAdmin(req.userId)
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden cambiar roles' })
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'agent']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' })
    }
    
    // Cannot change own role (prevent locking out)
    if (req.userId === userId) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' })
    }
    
    const user = await permissionsService.updateUserRole(userId, role)
    res.json({ 
      success: true, 
      user: { id: user.id, role: user.role },
      message: `Rol actualizado a ${role}`
    })
  } catch (err) {
    console.error('Error updating user role:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/permissions/user/:userId
 * Update custom permissions for a user
 */
router.put('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params
    const { permissions } = req.body
    
    // Only admins can change permissions
    const isAdmin = await permissionsService.isAdmin(req.userId)
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden cambiar permisos' })
    }
    
    // Validate permissions structure
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Estructura de permisos inválida' })
    }
    
    const user = await permissionsService.updateUserPermissions(userId, permissions)
    res.json({ 
      success: true, 
      user: { id: user.id, permissions: user.permissions },
      message: 'Permisos actualizados'
    })
  } catch (err) {
    console.error('Error updating user permissions:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/permissions/me
 * Get current user's permissions
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const permissions = await permissionsService.getUserPermissions(req.userId)
    const isAdmin = await permissionsService.isAdmin(req.userId)
    const canManageUsers = await permissionsService.canManageUsers(req.userId)
    
    res.json({ 
      permissions,
      isAdmin,
      canManageUsers
    })
  } catch (err) {
    console.error('Error getting my permissions:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
