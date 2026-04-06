const express = require('express');
const router = express.Router();
const { generateContent, generateSocialCopies } = require('../services/contentGenerator');
const { generateSchedule } = require('../services/scheduler');

// Generate all content for a property (AI simulation)
router.post('/generate', (req, res) => {
  try {
    const { property } = req.body;
    
    if (!property) {
      return res.status(400).json({ error: 'Se requiere información de la propiedad' });
    }

    // Simulate AI processing delay
    const processingTime = Math.random() * 1000 + 500;
    
    setTimeout(() => {
      const content = {
        // Descripción larga para portales inmobiliarios
        portalDescription: generateContent('portal', property),
        
        // Descripción corta para redes
        shortDescription: generateContent('short', property),
        
        // Copies para redes sociales (3 variaciones)
        socialCopies: generateSocialCopies(property),
        
        // Email marketing
        emailMarketing: generateContent('email', property),
        
        // Metadata
        hashtags: generateHashtags(property),
        keywords: generateKeywords(property),
        
        // Timestamps simulados
        generatedAt: new Date().toISOString(),
        modelVersion: 'RealEstateAI-v2.1-simulated'
      };

      res.json({
        success: true,
        content,
        processingTime: `${processingTime.toFixed(0)}ms`
      });
    }, processingTime);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate social media copies only
router.post('/generate/social', (req, res) => {
  try {
    const { property } = req.body;
    const copies = generateSocialCopies(property);
    res.json({ success: true, copies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate new copies for a specific platform
router.post('/generate/platform/:platform', (req, res) => {
  try {
    const { property } = req.body;
    const { platform } = req.params;
    
    // Generate 3 new copies for the specific platform
    const allCopies = generateSocialCopies(property);
    const platformCopies = allCopies.filter(c => c.platform === platform);
    
    // If no copies for that platform, create 3 new ones
    const result = platformCopies.length > 0 ? platformCopies : allCopies.slice(0, 3).map(c => ({
      ...c,
      id: require('uuid').v4(), // New IDs
      variation: 1
    }));
    
    res.json({ 
      success: true, 
      copies: result,
      platform 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate email marketing content
router.post('/generate/email', (req, res) => {
  try {
    const { property } = req.body;
    const email = generateContent('email', property);
    res.json({ success: true, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function generateHashtags(property) {
  const baseHashtags = ['#RealEstate', '#Propiedad', '#Inmuebles'];
  
  if (property.propertyType === 'casa') {
    baseHashtags.push('#Casa', '#Hogar');
  } else if (property.propertyType === 'departamento') {
    baseHashtags.push('#Departamento', '#Apartamento');
  } else if (property.propertyType === 'terreno') {
    baseHashtags.push('#Terreno', '#Lote');
  }
  
  if (property.bedrooms >= 3) baseHashtags.push('#Familiar');
  if (property.price > 500000) baseHashtags.push('#Lujo', '#Premium');
  
  baseHashtags.push(`#${property.address.split(',').pop().trim().replace(/\s+/g, '')}`);
  
  return baseHashtags.slice(0, 10);
}

function generateKeywords(property) {
  const keywords = [
    property.propertyType,
    property.bedrooms ? `${property.bedrooms} habitaciones` : null,
    property.bathrooms ? `${property.bathrooms} baños` : null,
    `${property.area} m²`,
    property.address
  ].filter(Boolean);
  
  return keywords;
}

module.exports = router;
