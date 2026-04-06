// Content API Route for Vercel
// POST /api/content/generate - Generate all content for a property
// POST /api/content/generate/social - Generate social copies only
// POST /api/content/generate/platform/:platform - Generate copies for specific platform
// POST /api/content/generate/email - Generate email content

const { generateContent, generateSocialCopies, generateHashtags, generateKeywords, uuidv4 } = require('../lib/services');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const url = req.url || '';
    const { property } = req.body;

    if (!property) {
      return res.status(400).json({ error: 'Se requiere información de la propiedad' });
    }

    // Route: /generate (all content)
    if (url.includes('/generate') && !url.includes('/platform') && !url.includes('/social') && !url.includes('/email')) {
      const processingTime = Math.random() * 1000 + 500;
      
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      const content = {
        portalDescription: generateContent('portal', property),
        shortDescription: generateContent('short', property),
        socialCopies: generateSocialCopies(property),
        emailMarketing: generateContent('email', property),
        hashtags: generateHashtags(property),
        keywords: generateKeywords(property),
        generatedAt: new Date().toISOString(),
        modelVersion: 'RealEstateAI-v2.1-simulated'
      };

      return res.json({
        success: true,
        content,
        processingTime: `${processingTime.toFixed(0)}ms`
      });
    }

    // Route: /generate/social
    if (url.includes('/generate/social')) {
      const copies = generateSocialCopies(property);
      return res.json({ success: true, copies });
    }

    // Route: /generate/email
    if (url.includes('/generate/email')) {
      const email = generateContent('email', property);
      return res.json({ success: true, email });
    }

    // Route: /generate/platform/:platform
    if (url.includes('/generate/platform/')) {
      const platformMatch = url.match(/\/generate\/platform\/([^/]+)/);
      const platform = platformMatch ? platformMatch[1] : 'instagram';
      
      const allCopies = generateSocialCopies(property);
      let platformCopies = allCopies.filter(c => c.platform === platform);
      
      if (platformCopies.length === 0) {
        platformCopies = allCopies.slice(0, 3).map(c => ({
          ...c,
          id: uuidv4(),
          platform: platform,
          variation: 1
        }));
      }
      
      return res.json({ 
        success: true, 
        copies: platformCopies,
        platform 
      });
    }

    // Default: generate all
    const content = {
      portalDescription: generateContent('portal', property),
      shortDescription: generateContent('short', property),
      socialCopies: generateSocialCopies(property),
      emailMarketing: generateContent('email', property),
      hashtags: generateHashtags(property),
      keywords: generateKeywords(property),
      generatedAt: new Date().toISOString()
    };

    return res.json({ success: true, content });

  } catch (error) {
    console.error('Content API Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
