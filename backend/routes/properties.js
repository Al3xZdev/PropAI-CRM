const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { uploadImageFromBuffer } = require('../services/cloudinaryService');
const { prisma } = require('../services/db');

// Convert Prisma Property rows to the API shape expected by the frontend.
// Prisma serializes Decimal columns as strings ("530000.00"), but the UI
// calls Number/price.toLocaleString() and `${property.area}m²`, so we
// coerce price and area back to numbers here.
function toApiProperty(p) {
  return {
    ...p,
    price: Number(p.price) || null,
    area: Number(p.area) || null
  };
}

// Create a new property with uploaded images
router.post('/', async (req, res) => {
  try {
    // Multer puts files in req.files, fields in req.body
    const { title, address, price, area, bedrooms, bathrooms, description, propertyType, features, yearBuilt, floors } = req.body;

    // Validate required fields
    if (!title || !address || !price || !area) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const propertyId = uuidv4();

    // Upload images to Cloudinary
    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      console.log(`📤 Uploading ${req.files.length} images to Cloudinary...`);

      for (const file of req.files) {
        try {
          const uploadResult = await uploadImageFromBuffer(file.buffer, file.originalname);
          imageUrls.push({
            id: uuidv4(),
            url: uploadResult.url, // URL pública de Cloudinary
            publicId: uploadResult.publicId,
            originalName: file.originalname,
            width: uploadResult.width,
            height: uploadResult.height
          });
        } catch (uploadError) {
          console.error('Error uploading image to Cloudinary:', uploadError);
          // Continue with other images even if one fails
        }
      }

      console.log(`✅ ${imageUrls.length} images uploaded successfully`);
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

    let created;
    try {
      created = await prisma.property.create({
        data: {
          id: propertyId,
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
    } catch (createError) {
      if (createError.code === 'P2002') {
        return res.status(409).json({ error: 'La propiedad ya existe' });
      }
      throw createError;
    }

    console.log(`✅ Property created: ${title} with ${imageUrls.length} images`);

    res.status(201).json({
      success: true,
      property: toApiProperty(created)
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: error.message || 'Error al crear la propiedad' });
  }
});

// Get all properties
router.get('/', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ properties: properties.map(toApiProperty) });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Error al obtener las propiedades' });
  }
});

// Get a single property
router.get('/:id', async (req, res) => {
  try {
    const property = await prisma.property.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!property) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    res.json({ property: toApiProperty(property) });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Error al obtener la propiedad' });
  }
});

// Update property
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.property.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.address !== undefined) data.address = req.body.address;
    if (req.body.price !== undefined) data.price = parseFloat(req.body.price);
    if (req.body.area !== undefined) data.area = parseInt(req.body.area);
    if (req.body.bedrooms !== undefined) data.bedrooms = parseInt(req.body.bedrooms) || 0;
    if (req.body.bathrooms !== undefined) data.bathrooms = parseInt(req.body.bathrooms) || 0;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.propertyType !== undefined) data.propertyType = req.body.propertyType;
    if (req.body.yearBuilt !== undefined) data.yearBuilt = req.body.yearBuilt ? parseInt(req.body.yearBuilt) : null;
    if (req.body.floors !== undefined) data.floors = req.body.floors ? parseInt(req.body.floors) : 1;
    if (req.body.features !== undefined) {
      try {
        data.features = typeof req.body.features === 'string' ? JSON.parse(req.body.features) : req.body.features;
      } catch (e) {
        data.features = [];
      }
    }

    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data
    });

    res.json({ success: true, property: toApiProperty(updated) });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Error al actualizar la propiedad' });
  }
});

// Delete property
router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.property.deleteMany({
      where: { id: req.params.id, tenantId: req.tenantId }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json({ success: true, message: 'Propiedad eliminada' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Error al eliminar la propiedad' });
  }
});

module.exports = router;
