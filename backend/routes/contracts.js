const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
const { prisma }          = require('../services/db');
const { requireAuth }     = require('../middleware/auth');
const { generateContract} = require('../services/contractService');
const logger = require('../services/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'real-estate-crm-secret-key-2024';

// ─── POST /api/contracts/generate ────────────────────────────────────────────
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { leadId, contractType, formData } = req.body;

    if (!leadId || !contractType || !formData) {
      return res.status(400).json({ error: 'Faltan datos requeridos: leadId, contractType, formData' });
    }

    const validTypes = ['compraventa', 'alquiler', 'reserva', 'mandato'];
    if (!validTypes.includes(contractType)) {
      return res.status(400).json({ error: `Tipo inválido. Válidos: ${validTypes.join(', ')}` });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { property: true }
    });
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    const agencyConfig = await prisma.agencyConfig.findUnique({
      where: { tenantId: req.tenantId }
    });

    const { outputPath, filename } = await generateContract({
      contractType,
      lead,
      property: lead.property,
      formData,
      agencyConfig
    });

    const document = await prisma.document.create({
      data: {
        tenantId:     req.tenantId,
        leadId:       lead.id,
        contractType,
        filename,
        filePath:     outputPath,
        status:       'generated',
        uploadType:   'generated',
        formSnapshot: formData
      }
    });

    logger.info({ filename, leadId }, 'contract generated');

    res.json({
      success: true,
      document: {
        id:          document.id,
        filename:    document.filename,
        downloadUrl: `/api/contracts/download/${document.id}`,
        createdAt:   document.createdAt
      }
    });

  } catch (error) {
    logger.error({ err: error }, 'generating contract');
    res.status(500).json({ error: error.message || 'Error al generar el contrato' });
  }
});

// ─── GET /api/contracts/download/:id ─────────────────────────────────────────
// NO usa requireAuth global — acepta token por header, cookie, O ?token=
router.get('/download/:id', async (req, res) => {
  try {
    // 1. Extraer token desde header, cookie, o query param
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Token requerido', code: 'NO_TOKEN' });
    }

    // 2. Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // 3. Buscar documento
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: decoded.tenantId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // 4. Verificar que el archivo existe en disco
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    // 5. Enviar el archivo al navegador del usuario
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', fs.statSync(document.filePath).size);

    const stream = fs.createReadStream(document.filePath);
    stream.on('error', (err) => {
      logger.error({ err }, 'stream error');
      if (!res.headersSent) res.status(500).json({ error: 'Error al leer el archivo' });
    });
    stream.pipe(res);

  } catch (error) {
    logger.error({ err: error }, 'downloading contract');
    if (!res.headersSent) res.status(500).json({ error: 'Error al descargar el contrato' });
  }
});

// ─── GET /api/contracts ───────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    logger.info({ tenantId: req.tenantId, query: req.query }, 'contracts list request');

    const { leadId, type } = req.query;
    const where = { tenantId: req.tenantId };
    if (leadId) where.leadId = leadId;
    if (type)   where.type   = type;

    logger.debug({ where }, 'contracts query');

    const documents = await prisma.document.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    logger.info({ count: documents.length }, 'contracts found');
    res.json({ documents });

  } catch (error) {
    logger.error({ err: error }, 'fetching contracts');
    res.status(500).json({ error: 'Error al obtener contratos' });
  }
});

// ─── GET /api/contracts/:id ───────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { lead: true }
    });
    if (!document) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json({ document });
  } catch (error) {
    logger.error({ err: error }, 'fetching contract');
    res.status(500).json({ error: 'Error al obtener el contrato' });
  }
});

// ─── DELETE /api/contracts/:id ────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!document) return res.status(404).json({ error: 'Documento no encontrado' });

    if (fs.existsSync(document.filePath)) fs.unlinkSync(document.filePath);

    await prisma.document.delete({ where: { id: document.id } });

    res.json({ success: true, message: 'Contrato eliminado' });
  } catch (error) {
    logger.error({ err: error }, 'deleting contract');
    res.status(500).json({ error: 'Error al eliminar el contrato' });
  }
});

module.exports = router;