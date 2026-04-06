// Properties API Route for Vercel
// GET /api/properties - List all
// POST /api/properties - Create new
// GET /api/properties/:id - Get one
// PUT /api/properties/:id - Update
// DELETE /api/properties/:id - Delete

const { getProperties, uuidv4 } = require('../lib/services');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const properties = getProperties();
  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (id) {
          // Get single property
          const property = properties.get(id);
          if (!property) {
            return res.status(404).json({ error: 'Propiedad no encontrada' });
          }
          return res.json({ property });
        }
        // Get all properties
        const allProperties = Array.from(properties.values());
        return res.json({ properties: allProperties });

      case 'POST':
        // Create new property (without file uploads - images are URLs)
        const { title, address, price, area, bedrooms, bathrooms, description, propertyType, features, yearBuilt, floors, images } = req.body;
        
        if (!title || !address || !price || !area) {
          return res.status(400).json({ error: 'Faltan campos requeridos: title, address, price, area' });
        }

        const propertyId = uuidv4();
        
        // Handle images - either URLs from body or generate placeholder
        const imageUrls = images || [{
          id: uuidv4(),
          url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
          originalName: 'placeholder.jpg'
        }];

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
          features: features || [],
          yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
          floors: floors ? parseInt(floors) : 1,
          images: imageUrls,
          createdAt: new Date().toISOString(),
          status: 'draft'
        };

        properties.set(propertyId, property);
        
        return res.status(201).json({
          success: true,
          property
        });

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'ID requerido' });
        }
        
        const existingProperty = properties.get(id);
        if (!existingProperty) {
          return res.status(404).json({ error: 'Propiedad no encontrada' });
        }

        const updatedProperty = {
          ...existingProperty,
          ...req.body,
          id: existingProperty.id,
          createdAt: existingProperty.createdAt,
          updatedAt: new Date().toISOString()
        };

        properties.set(id, updatedProperty);
        
        return res.json({ success: true, property: updatedProperty });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'ID requerido' });
        }
        
        if (!properties.has(id)) {
          return res.status(404).json({ error: 'Propiedad no encontrada' });
        }
        
        properties.delete(id);
        
        return res.json({ success: true, message: 'Propiedad eliminada' });

      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('Properties API Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
