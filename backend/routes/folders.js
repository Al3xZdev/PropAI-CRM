// Folders API Routes - Hierarchical folder system
const express = require('express');
const router = express.Router();
const { prisma } = require('../services/db');
const { requireAuth } = require('../middleware/auth');

// Apply auth to all routes
router.use(requireAuth);

/**
 * GET /api/folders
 * Get all folders for the tenant in flat list (frontend builds tree)
 * Optional filter: parentId (null for root folders)
 */
router.get('/', async (req, res) => {
  try {
    const { parentId, leadId } = req.query;
    
    const where = { tenantId: req.tenantId };
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    if (leadId) where.leadId = leadId;

    const folders = await prisma.folder.findMany({
      where,
      include: {
        _count: { select: { documents: true, children: true } },
        parent: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Error al obtener carpetas' });
  }
});

/**
 * GET /api/folders/:id
 * Get single folder with children and documents count
 */
router.get('/:id', async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        _count: { select: { documents: true, children: true } },
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } }
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    res.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ error: 'Error al obtener carpeta' });
  }
});

/**
 * POST /api/folders
 * Create a new folder
 * Body: { name, parentId?, color?, leadId? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, parentId, color, leadId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Verify parentId belongs to same tenant if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, tenantId: req.tenantId }
      });
      if (!parentFolder) {
        return res.status(404).json({ error: 'Carpeta padre no encontrada' });
      }
    }

    // Verify leadId belongs to tenant if provided
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, tenantId: req.tenantId }
      });
      if (!lead) {
        return res.status(404).json({ error: 'Lead no encontrado' });
      }
    }

    const folder = await prisma.folder.create({
      data: {
        tenantId: req.tenantId,
        name,
        parentId: parentId || null,
        color: color || '#3B82F6',
        leadId: leadId || null
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { documents: true, children: true } }
      }
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Error al crear carpeta' });
  }
});

/**
 * PUT /api/folders/:id
 * Update folder (rename, move to different parent, change color)
 * Body: { name?, parentId?, color? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, parentId, color } = req.body;

    // Verify folder belongs to tenant
    const existing = await prisma.folder.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    // Prevent circular reference (folder cannot be its own parent)
    if (parentId && parentId === req.params.id) {
      return res.status(400).json({ error: 'Una carpeta no puede ser su propia carpeta padre' });
    }

    // If moving to new parent, verify parent exists and doesn't create cycle
    if (parentId !== undefined && parentId !== existing.parentId) {
      // Check if trying to move to a child
      if (parentId) {
        const isChild = await prisma.folder.findFirst({
          where: { 
            id: parentId, 
            tenantId: req.tenantId 
          }
        });
        
        if (!isChild) {
          return res.status(404).json({ error: 'Carpeta padre no encontrada' });
        }
        
        // Check if target is descendant of current folder
        const checkDescendant = async (folderId, targetId, visited = new Set()) => {
          if (visited.has(folderId)) return false;
          visited.add(folderId);
          
          const children = await prisma.folder.findMany({
            where: { parentId: folderId, tenantId: req.tenantId }
          });
          
          for (const child of children) {
            if (child.id === targetId) return true;
            if (await checkDescendant(child.id, targetId, visited)) return true;
          }
          return false;
        };
        
        const isDescendant = await checkDescendant(req.params.id, parentId);
        if (isDescendant) {
          return res.status(400).json({ error: 'No se puede mover una carpeta a una de sus subcarpetas' });
        }
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (parentId !== undefined) updateData.parentId = parentId;

    const folder = await prisma.folder.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { documents: true, children: true } }
      }
    });

    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Error al actualizar carpeta' });
  }
});

/**
 * DELETE /api/folders/:id
 * Delete folder - moves documents and subfolders to root (null parentId)
 */
router.delete('/:id', async (req, res) => {
  try {
    // Verify folder belongs to tenant
    const existing = await prisma.folder.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }

    // Move documents in this folder to root (null folderId)
    await prisma.document.updateMany({
      where: { folderId: req.params.id },
      data: { folderId: null }
    });

    // Get all direct children and move them to root
    const children = await prisma.folder.findMany({
      where: { parentId: req.params.id }
    });

    for (const child of children) {
      await prisma.folder.update({
        where: { id: child.id },
        data: { parentId: null }
      });
    }

    // Delete the folder
    await prisma.folder.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Error al eliminar carpeta' });
  }
});

module.exports = router;