const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { uploadImageFromBuffer } = require('../services/cloudinaryService');

const DATA_FILE = path.join(__dirname, '..', 'data', 'properties.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load properties from file or initialize empty
let properties = new Map();
function loadProperties() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      properties = new Map(Object.entries(data));
      console.log(`Loaded ${properties.size} properties from file`);
    }
  } catch (err) {
    console.error('Error loading properties:', err);
    properties = new Map();
  }
}

// Save properties to file
function saveProperties() {
  try {
    const data = Object.fromEntries(properties);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving properties:', err);
  }
}

// Initialize
loadProperties();

/**
 * Parse multipart form data manually
 * For file uploads, files come as buffers
 */
function parseFormData(body, files) {
  const data = {};
  
  // Parse string fields from body
  for (const [key, value] of Object.entries(body)) {
    if (key === 'features') {
      try {
        data[key] = JSON.parse(value);
      } catch (e) {
        data[key] = [];
      }
    } else if (key === 'images') {
      // Images handled separately
      continue;
    } else {
      data[key] = value;
    }
  }
  
  return data;
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

    const property = {
      id: propertyId,
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
      images: imageUrls,
      createdAt: new Date().toISOString(),
      status: 'draft'
    };

    properties.set(propertyId, property);
    saveProperties();
    
    console.log(`✅ Property created: ${title} with ${imageUrls.length} images`);
    
    res.status(201).json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: error.message || 'Error al crear la propiedad' });
  }
});

// Get all properties
router.get('/', (req, res) => {
  const allProperties = Array.from(properties.values());
  res.json({ properties: allProperties });
});

// Get a single property
router.get('/:id', (req, res) => {
  const property = properties.get(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Propiedad no encontrada' });
  }
  res.json({ property });
});

// Update property
router.put('/:id', (req, res) => {
  const property = properties.get(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Propiedad no encontrada' });
  }

  const updatedProperty = {
    ...property,
    ...req.body,
    id: property.id,
    createdAt: property.createdAt,
    updatedAt: new Date().toISOString()
  };

  properties.set(req.params.id, updatedProperty);
  saveProperties();
  
  res.json({ success: true, property: updatedProperty });
});

// Delete property
router.delete('/:id', (req, res) => {
  if (!properties.has(req.params.id)) {
    return res.status(404).json({ error: 'Propiedad no encontrada' });
  }
  
  properties.delete(req.params.id);
  saveProperties();
  
  res.json({ success: true, message: 'Propiedad eliminada' });
});

module.exports = router;
