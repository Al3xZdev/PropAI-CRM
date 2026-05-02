// Documents API Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { uploadDocument, deleteDocument } = require('../services/documentService');

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = /jpeg|jpg|png|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype.split('/')[1]) || file.mimetype === 'application/pdf';
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Tipo de archivo no permitido'));
  }
});

// Apply auth to all routes
router.use(requireAuth);

/**
 * GET /api/documents
 * Get all documents for the tenant with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { leadId, propertyId, type, status, search, storage: storageFilter, folderId } = req.query;
    
    const where = { tenantId: req.tenantId };
    
    if (leadId) where.leadId = leadId;
    if (propertyId) where.propertyId = propertyId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (storageFilter) where.storage = storageFilter;
    if (folderId === 'null' || folderId === '') {
      where.folderId = null;
    } else if (folderId) {
      where.folderId = folderId;
    }
    
    // Search by name
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, email: true }
        },
        property: {
          select: { id: true, title: true, address: true }
        },
        folder: {  // ✅ Include folder info
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

/**
 * GET /api/documents/:id
 * Get single document by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        lead: {
          select: { id: true, name: true, email: true, phone: true }
        },
        property: {
          select: { id: true, title: true, address: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

/**
 * POST /api/documents
 * Upload a new document
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { leadId, propertyId, type, name, storage: storageType, notes, status, folderId } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'El lead es obligatorio' });
    }

    if (!type) {
      return res.status(400).json({ error: 'El tipo de documento es obligatorio' });
    }

    let fileUrl = null;
    let publicId = null;
    let mimeType = null;
    let fileSize = null;
    let storageUsed = storageType || 'cloudinary';

    // If file uploaded
    if (req.file) {
      const result = await uploadDocument(
        req.file.buffer,
        req.file.originalname,
        storageUsed
      );
      
      fileUrl = result.url;
      publicId = result.publicId;
      mimeType = result.mimeType;
      fileSize = result.size;
      storageUsed = result.storage;
    } else if (req.body.fileUrl) {
      // External URL provided
      fileUrl = req.body.fileUrl;
      storageUsed = 'external';
    } else {
      return res.status(400).json({ error: 'Se requiere un archivo o URL' });
    }

    // ✅ Si no se especifica folderId, buscar o crear carpeta por defecto del lead
    let finalFolderId = folderId || null;
    if (!finalFolderId) {
      // Buscar si existe carpeta "Documentos" para este lead
      let defaultFolder = await prisma.folder.findFirst({
        where: { leadId, name: 'Documentos', tenantId: req.tenantId }
      });
      
      // Si no existe, crear una carpeta por defecto
      if (!defaultFolder) {
        defaultFolder = await prisma.folder.create({
          data: { tenantId: req.tenantId, leadId, name: 'Documentos', color: '#3B82F6' }
        });
      }
      finalFolderId = defaultFolder.id;
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId: req.tenantId,
        leadId,
        propertyId: propertyId || null,
        folderId: finalFolderId,
        type,
        name: name || req.file?.originalname || 'Documento sin nombre',
        filename: req.file?.originalname || 'external',
        filePath: publicId || fileUrl,
        url: fileUrl,
        storage: storageUsed,
        mimeType,
        fileSize,
        status: status || 'draft',
        uploadType: req.file ? 'uploaded' : 'generated',
        notes: notes || null
      }
    });

    // Fetch with relations for response
    const created = await prisma.document.findUnique({
      where: { id: document.id },
      include: {
        lead: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, address: true } }
      }
    });

    console.log('✅ Document created:', document.id);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Error al crear documento: ' + error.message });
  }
});

/**
 * PUT /api/documents/:id
 * Update document (status, name, notes, folder, etc.)
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, status, notes, expiresAt, folderId } = req.body;

    // Check ownership
    const existing = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (folderId !== undefined) updateData.folderId = folderId; // Allow moving to different folder

    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        lead: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, address: true } },
        folder: { select: { id: true, name: true, color: true } }
      }
    });

    console.log('✅ Document updated:', document.id);
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Error al actualizar documento' });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document (and file from storage)
 */
router.delete('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Delete from storage if it's a cloudinary/supabase file
    if (document.filePath && ['cloudinary', 'supabase'].includes(document.storage)) {
      try {
        await deleteDocument(document.filePath, document.storage);
      } catch (storageError) {
        console.warn('⚠️ Could not delete file from storage:', storageError.message);
      }
    }

    // Delete database record
    await prisma.document.delete({
      where: { id: req.params.id }
    });

    console.log('✅ Document deleted:', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

/**
 * GET /api/documents/types
 * Get available document types
 */
router.get('/meta/types', (req, res) => {
  const types = [
    { value: 'contract_buy', label: 'Contrato de Compra-Venta' },
    { value: 'contract_rent', label: 'Contrato de Alquiler' },
    { value: 'contract_reserve', label: 'Reserva de Propiedad' },
    { value: 'id_front', label: 'Identificación (Frente)' },
    { value: 'id_back', label: 'Identificación (Dorso)' },
    { value: 'property_deed', label: 'Escritura de Propiedad' },
    { value: 'receipt', label: 'Comprobante de Pago' },
    { value: 'credit_doc', label: 'Documentación Crediticia' },
    { value: 'lead_file', label: 'Archivo del Lead' },
    { value: 'other', label: 'Otro' }
  ];
  
  res.json(types);
});

/**
 * GET /api/documents/statuses
 * Get available document statuses
 */
router.get('/meta/statuses', (req, res) => {
  const statuses = [
    { value: 'draft', label: 'Borrador', color: 'gray' },
    { value: 'pending', label: 'Pendiente de Firma', color: 'yellow' },
    { value: 'signed', label: 'Firmado', color: 'green' },
    { value: 'expired', label: 'Vencido', color: 'red' },
    { value: 'rejected', label: 'Rechazado', color: 'orange' }
  ];
  
  res.json(statuses);
});

module.exports = router;