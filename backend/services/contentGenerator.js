// Content Generator Service - Simulates AI content generation
// In production, this would call OpenAI/Claude APIs

const { v4: uuidv4 } = require('uuid');

/**
 * Generate different types of content based on property data
 */
function generateContent(type, property) {
  switch (type) {
    case 'portal':
      return generatePortalDescription(property);
    case 'short':
      return generateShortDescription(property);
    case 'email':
      return generateEmailContent(property);
    default:
      return '';
  }
}

/**
 * Generate long description for real estate portals
 */
function generatePortalDescription(property) {
  const typeLabels = {
    casa: 'Increíble oportunidad de adquirir esta hermosa casa',
    departamento: 'Moderno departamento con acabados de primera',
    terreno: 'Excelente terreno con gran potencial de desarrollo',
    local: 'Privilegiado local comercial en zona de alto tráfico',
    oficina: 'Professional office space in prime location'
  };

  const intro = typeLabels[property.propertyType] || 'Propiedad de oportunidad';
  const priceFormatted = formatCurrency(property.price);
  const size = property.area;
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const features = property.features || [];

  // Build features string
  let featuresList = '';
  if (features.length > 0) {
    featuresList = features.map(f => `• ${f}`).join('\n');
  } else {
    featuresList = `• ${beds} recámaras espaciosas con buena iluminación natural
• ${baths} baños completos con acabados modernos
• Área de ${size}m² perfectamente distribuida
• Cocina integral con espacio de almacenamiento`;
    if (property.propertyType === 'casa') {
      featuresList += '\n• Jardín privado y área de servicio';
    } else {
      featuresList += '\n• Áreas comunes exclusivas';
    }
  }

  return `${intro} en ${property.address}.

Esta propiedad cuenta con ${beds} habitación${beds !== 1 ? 'es' : ''} y ${baths} baño${baths !== 1 ? 's' : ''}, distribuidos en ${size}m² de construcción. El espacio ha sido diseñado pensando en la comodidad y el estilo de vida moderno.

📍 UBICACIÓN
Se encuentra en una zona privilegiada con acceso a servicios, escuelas, centros comerciales y vías de comunicación principales.

✨ CARACTERÍSTICAS PRINCIPALES
${featuresList}

💰 INVERSIÓN INTELIGENTE
Precio de venta: ${priceFormatted}
Excelente relación precio-m² para la zona.

Esta es una oportunidad que no puedes dejar pasar. Agenda tu visita hoy mismo y conoce todo lo que esta propiedad tiene para ofrecerte.

Para mayor información o agendar una visita, contacta a nuestros asesores especializados.`;
}

/**
 * Generate short description for social media
 */
function generateShortDescription(property) {
  const priceFormatted = formatCurrency(property.price);
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const size = property.area;

  return `🏠 ${property.title}

${beds} Habs | ${baths} Baños | ${size}m²

💰 ${priceFormatted}

📍 ${property.address}

¡No te pierdas esta increíble oportunidad! Consulta disponibilidad.`;
}

/**
 * Generate email marketing content
 */
function generateEmailContent(property) {
  const priceFormatted = formatCurrency(property.price);
  const firstImage = property.images?.[0]?.url || '/placeholder-property.jpg';

  return {
    subject: `🏡 ¡Nueva Propiedad en el Mercado! ${property.title}`,
    preheader: `Descubre esta increíble oportunidad en ${property.address}`,
    hero: {
      image: firstImage,
      headline: `¡Nueva Propiedad Disponible!`,
      cta: 'Agendar Visita'
    },
    body: {
      intro: `Estimado cliente,

Nos complace presentarte esta excelente oportunidad inmobiliaria que tenemos disponible para ti.`,

      propertyHighlights: [
        `${property.bedrooms || 0} habitaciones perfectamente distribuidas`,
        `${property.bathrooms || 0} baños completos`,
        `${property.area}m² de espacio usable`,
        `Ubicación privilegiada en ${property.address}`
      ],

      closing: `Esta propiedad representa una oportunidad de inversión inigualable. El precio de ${priceFormatted} refleja el valor real del mercado actual.

No esperes más y sé el primero en visitarla. Nuestras puertas están abiertas para ti.`
    },
    cta: {
      text: 'Solicitar Información',
      url: '#contacto'
    },
    footer: {
      company: 'Real Estate Pro',
      disclaimer: 'Este correo fue enviado porque figuras en nuestra base de datos de clientes interesados. Si deseas dejar de recibir comunicaciones, responde con "BAJA".'
    }
  };
}

/**
 * Generate 3 variations of social media copies
 */
function generateSocialCopies(property) {
  const priceFormatted = formatCurrency(property.price);
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const size = property.area;

  const variations = [
    {
      id: uuidv4(),
      platform: 'instagram',
      variation: 1,
      type: 'feed',
      content: {
        caption: `✨ ¡LISTO PARA SER TU NUEVO HOGAR! ✨

Esta belleza de propiedad acaba de llegar al mercado y no queremos que te la pierdas.

📍 ${property.address}
📐 ${size}m² | ${beds} Habs | ${baths} Baños
💰 ${priceFormatted}

Características que enamoran:
✓ Espacios llenos de luz natural
✓ Distribución moderna y funcional
✓ Ubicación que lo tiene TODO

🏷️ #RealEstate #Propiedad #NuevoHogar #Inmuebles #CasaIdeal #SuenioHechoRealidad #InversiónInteligente #${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}`,
        imageUrl: property.images?.[0]?.url || null,
        hashtags: ['#RealEstate', '#Propiedad', '#NuevoHogar', '#Inmuebles', '#CasaIdeal', '#InversiónInteligente']
      },
      preview: {
        type: 'instagram',
        layout: 'feed',
        image: property.images?.[0]?.url || null,
        caption: `✨ ¡LISTO PARA SER TU NUEVO HOGAR! ✨\n\n📍 ${property.address}\n💰 ${priceFormatted}`
      }
    },
    {
      id: uuidv4(),
      platform: 'facebook',
      variation: 2,
      type: 'post',
      content: {
        message: `🏠 ¡GRAN OPORTUNIDAD INMOBILIARIA!

${property.title}

¿Buscas un lugar especial para vivir? Esta propiedad podría ser exactamente lo que necesitas.

📐 Superficie: ${size}m²
🛏️ Habitaciones: ${beds}
🛁 Baños: ${baths}
📍 Ubicación: ${property.address}

💰 Precio competitivo: ${priceFormatted}

Características destacadas:
• Acabados de calidad
• Excelente distribución de espacios
• Zona con todos los servicios

¿Te interesa conocer más? Escríbenos o llámanos hoy mismo. Estamos listos para ayudarte a encontrar tu próxima propiedad. 👇

#Inmuebles #RealEstate #PropiedadEnVenta #CasaNueva #SueñoHechoRealidad`,
        imageUrl: property.images?.[0]?.url || null,
        link: `https://portal-inmobiliario.com/propiedad/${property.id}`,
        hashtags: ['#Inmuebles', '#RealEstate', '#PropiedadEnVenta']
      },
      preview: {
        type: 'facebook',
        layout: 'post',
        image: property.images?.[0]?.url || null,
        message: `🏠 ¡GRAN OPORTUNIDAD INMOBILIARIA!\n${property.title}\n💰 ${priceFormatted}`
      }
    },
    {
      id: uuidv4(),
      platform: 'tiktok',
      variation: 3,
      type: 'video',
      content: {
        script: `🎬 HOOK (0-3s): "POV: Encontraste la casa perfecta..."\n\n📍 (3-8s): Recorrido mostrando ${beds} habitaciones, ${baths} baños, ${size}m²\n\n💰 (8-12s): Precio "${priceFormatted}" aparece en pantalla\n\n🎯 CTA (12-15s): "Link en bio para agendar tu visita 👇"`,
        hashtags: ['#realestate', '#househunting', '#dreamhome', '#propiedad', '#inmuebles'],
        sound: 'Trending audio - Upbeat Lifestyle',
        captions: 'Generated automatically',
        thumbnail: property.images?.[0]?.url || null
      },
      preview: {
        type: 'tiktok',
        layout: 'video',
        thumbnail: property.images?.[0]?.url || null,
        caption: 'POV: Encontraste la casa perfecta... 😍'
      }
    }
  ];

  return variations;
}

/**
 * Preview generators - inline para evitar loops infinitos
 */

/**
 * Format currency to USD
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

module.exports = {
  generateContent,
  generateSocialCopies
};
