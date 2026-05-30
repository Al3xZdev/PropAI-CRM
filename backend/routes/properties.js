// Properties Routes - Multi-tenant con Prisma
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { uploadImageFromBuffer } = require('../services/cloudinaryService');
const { requireAuth } = require('./auth');
const logger = require('../services/logger');

// Apply auth middleware to all routes in this file
router.use(requireAuth);

/**
 * GET /api/properties
 * Get all properties for the current tenant
 */
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ properties });
  } catch (error) {
    logger.error({ err: error }, 'fetching properties');
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
});

/**
 * GET /api/properties/:id
 * Get a single property
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!property) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    
    res.json({ property });
  } catch (error) {
    logger.error({ err: error }, 'fetching property');
    res.status(500).json({ error: 'Error al obtener la propiedad' });
  }
});

/**
 * POST /api/properties
 * Create a new property - managers and admins only
 */
router.post('/', async (req, res) => {
  try {
    const { title, address, price, area, bedrooms, bathrooms, description, propertyType, features, yearBuilt, floors } = req.body;
    
    // Validate required fields
    if (!title || !address || !price || !area) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Upload images to Cloudinary if present in req.files
    const imageUrls = [];
    
    if (req.files && req.files.length > 0) {
      logger.info({ count: req.files.length }, 'uploading images to Cloudinary');
      
      for (const file of req.files) {
        try {
          const uploadResult = await uploadImageFromBuffer(file.buffer, file.originalname);
          imageUrls.push({
            id: uuidv4(),
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            originalName: file.originalname,
            width: uploadResult.width,
            height: uploadResult.height
          });
        } catch (uploadError) {
          logger.error({ err: uploadError }, 'uploading image to Cloudinary');
        }
      }
      
      logger.info({ count: imageUrls.length }, 'images uploaded successfully');
    }
    
    // If no images uploaded, use placeholder
    if (imageUrls.length === 0) {
      imageUrls.push({
        id: uuidv4(),
        url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        publicId: null,
        originalName: 'placeholder.jpg'
      });
    }

    // Parse features if it's a string
    let parsedFeatures = [];
    if (features) {
      try {
        parsedFeatures = typeof features === 'string' ? JSON.parse(features) : features;
      } catch (e) {
        parsedFeatures = [];
      }
    }

    const property = await prisma.property.create({
      data: {
        tenantId: req.tenantId,
        title,
        address,
        price: parseFloat(price),
        area: parseInt(area),
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        description: description || '',
        propertyType: propertyType || 'casa',
        features: parsedFeatures,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        floors: floors ? parseInt(floors) : 1,
        images: imageUrls
      }
    });
    
    logger.info({ title, images: imageUrls.length }, 'property created');
    
    res.status(201).json({
      success: true,
      property
    });
  } catch (error) {
    logger.error({ err: error }, 'creating property');
    res.status(500).json({ error: error.message || 'Error al crear la propiedad' });
  }
});

/**
 * PUT /api/properties/:id
 * Update a property - managers and admins only
 */
router.put('/:id', async (req, res) => {
  try {
    // Verify property belongs to tenant
    const existing = await prisma.property.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
        area: req.body.area ? parseInt(req.body.area) : undefined,
        bedrooms: req.body.bedrooms ? parseInt(req.body.bedrooms) : undefined,
        bathrooms: req.body.bathrooms ? parseInt(req.body.bathrooms) : undefined,
        yearBuilt: req.body.yearBuilt ? parseInt(req.body.yearBuilt) : undefined,
        floors: req.body.floors ? parseInt(req.body.floors) : undefined
      }
    });
    
    res.json({ success: true, property: updatedProperty });
  } catch (error) {
    logger.error({ err: error }, 'updating property');
    res.status(500).json({ error: 'Error al actualizar la propiedad' });
  }
});

/**
 * DELETE /api/properties/:id
 * Delete a property - managers and admins only
 */
router.delete('/:id', async (req, res) => {
  try {
    // Verify property belongs to tenant
    const existing = await prisma.property.findFirst({
      where: { 
        id: req.params.id,
        tenantId: req.tenantId
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    await prisma.property.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true, message: 'Propiedad eliminada' });
  } catch (error) {
    logger.error({ err: error }, 'deleting property');
    res.status(500).json({ error: 'Error al eliminar la propiedad' });
  }
});

// ==================== CSV IMPORT ====================

const CSV_FIELD_MAPPING = {
  'titulo': 'title', 'title': 'title', 'nombre': 'title', 'name': 'title',
  'direccion': 'address', 'address': 'address', 'ubicacion': 'address',
  'precio': 'price', 'price': 'price', 'costo': 'price',
  'area': 'area', 'superficie': 'area', 'metros': 'area', 'm2': 'area',
  'habitaciones': 'bedrooms', 'bedrooms': 'bedrooms', 'cuartos': 'bedrooms', 'hab': 'bedrooms', 'dormitorios': 'bedrooms',
  'banos': 'bathrooms', 'bathrooms': 'bathrooms', 'baños': 'bathrooms',
  'tipo': 'propertyType', 'propertytype': 'propertyType', 'tipo_propiedad': 'propertyType', 'tipologia': 'propertyType',
  'descripcion': 'description', 'description': 'description', 'detalles': 'description',
  'construccion': 'yearBuilt', 'yearbuilt': 'yearBuilt', 'año': 'yearBuilt', 'antiguedad': 'yearBuilt',
  'pisos': 'floors', 'floors': 'floors', 'plantas': 'floors',
  'caracteristicas': 'features', 'features': 'features', 'amenidades': 'features'
};

function normalizeFieldName(field) {
  const lower = field.toLowerCase().trim();
  return CSV_FIELD_MAPPING[lower] || lower;
}

function normalizePropertyType(type) {
  const lower = type?.toLowerCase().trim() || '';
  const typeMap = {
    'casa': 'casa', 'house': 'casa', 'home': 'casa',
    'departamento': 'departamento', 'apartment': 'departamento', 'flat': 'departamento',
    'terreno': 'terreno', 'land': 'terreno', 'lote': 'terreno',
    'local': 'local', 'commercial': 'local',
    'oficina': 'oficina', 'office': 'oficina'
  };
  return typeMap[lower] || 'casa';
}

function normalizePrice(price) {
  if (!price) return '';
  const cleaned = String(price)
    .replace(/[$€£¥\s]/g, '')
    .replace(/,/g, '')
    .replace(/[^\d]/g, '');
  return cleaned || '';
}

function normalizeNumber(value, defaultValue = '') {
  if (!value) return defaultValue;
  const cleaned = String(value).replace(/[^\d]/g, '');
  return cleaned || defaultValue;
}

/**
 * POST /api/properties/import-csv
 * Import properties from CSV - managers and admins only
 */
router.post('/import-csv', async (req, res) => {
  try {
    const { properties: propertiesData } = req.body;
    
    if (!propertiesData || !Array.isArray(propertiesData) || propertiesData.length === 0) {
      return res.status(400).json({ error: 'No se recibieron propiedades para importar' });
    }

    logger.info({ count: propertiesData.length }, 'importing properties from CSV');
    
    // Import content generator for AI content
    const { generateContent, generateSocialCopies } = require('../services/contentGenerator');

    const importedProperties = [];
    const errors = [];

    for (const propData of propertiesData) {
      try {
        // Map CSV fields to internal fields
        const mapped = {};
        for (const [csvField, value] of Object.entries(propData)) {
          const internalField = normalizeFieldName(csvField);
          if (internalField && value !== undefined && value !== null && value !== '') {
            mapped[internalField] = value;
          }
        }

        if (!mapped.address) {
          errors.push({ data: propData, error: 'Falta dirección' });
          continue;
        }

        const property = await prisma.property.create({
          data: {
            tenantId: req.tenantId,
            title: mapped.title || `Propiedad en ${mapped.address}`,
            address: mapped.address,
            price: parseFloat(normalizePrice(mapped.price)) || 0,
            area: parseInt(normalizeNumber(mapped.area)) || 0,
            bedrooms: parseInt(normalizeNumber(mapped.bedrooms, '3')) || 0,
            bathrooms: parseInt(normalizeNumber(mapped.bathrooms, '2')) || 0,
            propertyType: normalizePropertyType(mapped.propertyType),
            description: mapped.description || '',
            yearBuilt: parseInt(normalizeNumber(mapped.yearBuilt)) || null,
            floors: parseInt(normalizeNumber(mapped.floors, '1')) || 1,
            features: [],
            images: [{
              id: uuidv4(),
              url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
              publicId: null,
              originalName: 'placeholder.jpg'
            }]
          }
        });

        // Generate AI content for the property
        try {
          const contentResult = {
            portalDescription: generateContent('portal', property),
            shortDescription: generateContent('short', property),
            emailMarketing: generateContent('email', property),
            socialCopies: generateSocialCopies(property)
          };
          
          property.contentGenerated = true;
          property.contentId = uuidv4();
          
          logger.info({ title: property.title }, 'AI content generated');
        } catch (contentErr) {
          logger.warn({ title: property.title, err: contentErr.message }, 'AI content generation failed');
        }

        importedProperties.push({
          id: property.id,
          title: property.title,
          address: property.address,
          contentGenerated: property.contentGenerated || false
        });

        logger.info({ title: property.title }, 'property imported');
      } catch (err) {
        errors.push({ data: propData, error: err.message });
      }
    }

    res.json({
      success: true,
      imported: importedProperties.length,
      errors: errors.length,
      properties: importedProperties,
      errorDetails: errors
    });
  } catch (err) {
    logger.error({ err }, 'importing properties');
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/properties/import-template
 * Download CSV template
 */
router.get('/import-template', (req, res) => {
  const template = [
    ['titulo', 'direccion', 'precio', 'area', 'habitaciones', 'banos', 'tipo', 'descripcion', 'añoConstruccion', 'pisos'],
    ['Casa moderna en zona residencial', 'Av. Principal 123, Ciudad', '250000', '150', '3', '2', 'casa', 'Hermosa casa con jardín y piscina', '2020', '2'],
    ['Departamento céntrico', 'Calle Centro 456, Departamento 5B', '180000', '85', '2', '1', 'departamento', 'Departamento amplio con vista a la ciudad', '2018', '1']
  ];

  const csvContent = template.map(row => row.join(',')).join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_propiedades.csv');
  res.send(csvContent);
});

module.exports = router;