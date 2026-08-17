// Contracts Routes - Generación de contratos inmobiliarios
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { prisma } = require('../services/db');
const { requireAuth } = require('./auth');
const { generateContract } = require('../services/contractService');

// Apply auth middleware to all routes (httpOnly cookie vía middleware/auth.js)
router.use(requireAuth);

/**
 * POST /api/contracts/generate
 * Genera un contrato (.docx) a partir de una plantilla y datos del formulario
 * 
 * Body:
 * {
 *   leadId: string,
 *   contractType: "compraventa" | "alquiler" | "reserva" | "mandato",
 *   formData: {
 *     // Comprador / Locatario
 *     buyer_dni: string,
 *     buyer_address: string,
 *     buyer_civil_status: string,
 *     
 *     // Vendedor / Locador
 *     seller_name: string,
 *     seller_dni: string,
 *     seller_address: string,
 *     seller_civil_status: string,
 *     
 *     // Propiedad
 *     property_address: string,
 *     property_surface: string,
 *     property_registry: string,
 *     
 *     // Operación
 *     price: number,
 *     currency: string,
 *     closing_date: string,
 *     payment_method: string,
 *     deposit: number,
 *     commission_pct: number
 *   }
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { leadId, contractType, formData } = req.body;

    if (!leadId || !contractType || !formData) {
      return res.status(400).json({ error: 'Faltan datos requeridos: leadId, contractType, formData' });
    }

    // Validar tipo de contrato
    const validTypes = ['compraventa', 'alquiler', 'reserva', 'mandato'];
    if (!validTypes.includes(contractType)) {
      return res.status(400).json({ 
        error: `Tipo de contrato inválido. Tipos válidos: ${validTypes.join(', ')}` 
      });
    }

    // Obtener el lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { property: true }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }

    // Obtener configuración de la agencia
    const agencyConfig = await prisma.agencyConfig.findUnique({
      where: { tenantId: req.tenantId }
    });

    // Generar el contrato
    const { outputPath, filename } = await generateContract({
      contractType,
      lead,
      property: lead.property,
      formData,
      agencyConfig
    });

    // Guardar en la base de datos
    const document = await prisma.document.create({
      data: {
        tenantId: req.tenantId,
        leadId: lead.id,
        uploadType: 'generated',
        contractType: contractType,
        filename: filename,
        filePath: outputPath,
        status: 'generated',
        formSnapshot: formData
      }
    });

    console.log(`✅ Contrato generado: ${filename} para lead ${leadId}`);

    // Devolver URL de descarga
    const downloadUrl = `/api/contracts/download/${document.id}`;

    res.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        downloadUrl: downloadUrl,
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({ error: error.message || 'Error al generar el contrato' });
  }
});

/**
 * GET /api/contracts/download/:id
 * Descarga un contrato generado (.docx)
 * Auth: httpOnly cookie vía requireAuth (router.use)
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: id,
        tenantId: req.tenantId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const filePath = document.filePath;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    res.download(filePath, document.filename || path.basename(filePath));
  } catch (error) {
    console.error('Error downloading contract:', error);
    res.status(500).json({ error: 'Error al descargar el contrato' });
  }
});

/**
 * GET /api/contracts
 * Lista todos los contratos del tenant
 */
router.get('/', async (req, res) => {
  try {
    console.log('[CONTRACTS] GET / - tenantId:', req.tenantId, 'query:', req.query)
    
    const { leadId, type } = req.query;

    const where = { tenantId: req.tenantId };
    if (leadId) where.leadId = leadId;
    if (type) where.contractType = type;

    console.log('[CONTRACTS] where:', where)

    const documents = await prisma.document.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, phone: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('[CONTRACTS] found:', documents.length, 'documents')
    res.json({ documents });
  } catch (error) {
    console.error('[CONTRACTS] Error fetching contracts:', error);
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

/**
 * GET /api/contracts/:id
 * Obtiene un contrato específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: id,
        tenantId: req.tenantId
      },
      include: {
        lead: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Error al obtener el contrato' });
  }
});

/**
 * DELETE /api/contracts/:id
 * Elimina un contrato
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: id,
        tenantId: req.tenantId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Eliminar archivo físico si existe
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Eliminar de la base de datos
    await prisma.document.delete({
      where: { id: document.id }
    });

    res.json({ success: true, message: 'Contrato eliminado' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Error al eliminar el contrato' });
  }
});

module.exports = router;