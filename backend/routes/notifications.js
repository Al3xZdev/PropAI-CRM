// Notifications Routes - Multi-tenant con Prisma
const express = require('express');
const router = express.Router();
const { prisma } = require('../services/db');
const { requireAuth } = require('./auth');

// Apply auth to all routes
router.use(requireAuth);

/**
 * GET /api/notifications
 * Get all notifications for the current user/tenant
 */
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    
    const unreadCount = await prisma.notification.count({
      where: { 
        tenantId: req.tenantId,
        read: false
      }
    });
    
    res.json({ 
      notifications,
      unreadCount 
    });
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread count
 */
router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { 
        tenantId: req.tenantId,
        read: false
      }
    });
    res.json({ count });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify notification belongs to tenant
    const existing = await prisma.notification.findFirst({
      where: { 
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all as read
 */
router.put('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        tenantId: req.tenantId,
        read: false
      },
      data: { read: true }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.notification.findFirst({
      where: { 
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await prisma.notification.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications
 * Create notification (internal use)
 */
router.post('/', async (req, res) => {
  try {
    const { userId, type, title, description, leadId, channel } = req.body;
    
    if (!userId || !type || !title) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const notification = await prisma.notification.create({
      data: {
        tenantId: req.tenantId,
        userId,
        type,
        title,
        description,
        leadId,
        channel,
        read: false
      }
    });
    
    res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications for the current tenant
 */
router.delete('/clear-all', async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: { tenantId: req.tenantId }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing all notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;