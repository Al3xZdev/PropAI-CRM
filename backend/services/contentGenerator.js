// Content Generator Service - Simulates AI content generation
// In production, this would call OpenAI/Claude APIs

const { v4: uuidv4 } = require('uuid');

/**
 * Generate different types of content based on property data
 */
function generateContent(type, property) {
  switch (type) {
    case 'portal':
      return generatePortalDescriptions(property);
    case 'short':
      return generateShortDescription(property);
    case 'email':
      return generateEmailVariations(property);
    default:
      return '';
  }
}

/**
 * Generate 9 variations of portal descriptions
 */
function generatePortalDescriptions(property) {
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
  
  const variations = [
    // Variation 1 - Standard
    {
      id: uuidv4(),
      content: {
        description: `${intro} en ${property.address}.\n\nEsta propiedad cuenta con ${beds} habitación${beds !== 1 ? 'es' : ''} y ${baths} baño${baths !== 1 ? 's' : ''}, distribuidos en ${size}m² de construcción.\n\n📍 UBICACIÓN\nSe encuentra en una zona privilegiada con acceso a servicios, escuelas, centros comerciales y vías de comunicación principales.\n\n✨ CARACTERÍSTICAS PRINCIPALES\n• ${beds} recámaras espaciosas con buena iluminación natural\n• ${baths} baños completos con acabados modernos\n• Área de ${size}m² perfectamente distribuida\n• Cocina integral con espacio de almacenamiento\n• Jardín privado y área de servicio\n\n💰 INVERSIÓN INTELIGENTE\nPrecio de venta: ${priceFormatted}\nExcelente relación precio-m² para la zona.\n\nEsta es una oportunidad que no puedes dejar pasar. Agenda tu visita hoy mismo y conoce todo lo que esta propiedad tiene para ofrecerte.`
      },
      metadata: { platform: 'portal', variation: 1 }
    },
    
    // Variation 2 - Luxury focus
    {
      id: uuidv4(),
      content: {
        description: `✨ ¡LUJO Y CONFORT EN ${property.address.toUpperCase()}! ✨\n\nDescubre esta spectacular propiedad de ${size}m² con acabados de lujo.\n\n🏠 CARACTERÍSTICAS DE LUJO:\n• ${beds} amplias habitaciones con vestidor\n• ${baths} baños en mármol y granito\n• Cocina gourmet con isla central\n• ${property.features?.includes('jardin') ? '• Jardín privado con sistema de riego automatizado\n' : ''}• Seguridad 24/7 y control de acceso\n\n🎖 AMENIDADES EXCLUSIVAS:\n• Gimnasio • Piscina • Área de BBQ\n\n💎 Contacta a nuestros asesores de inversión.`
      },
      metadata: { platform: 'portal', variation: 2 }
    },
    
    // Variation 3 - Investment
    {
      id: uuidv4(),
      content: {
        description: `📈 OPORTUNIDAD DE INVERSIÓN: ${property.title}\n\n¿Buscas rendimiento y plusvalía? Esta propiedad en ${property.address} es tu mejor opción.\n\n📊 DATOS DE INVERSIÓN:\n• Precio: ${priceFormatted}\n• Superficie: ${size}m²\n• Habitaciones: ${beds}\n• Baños: ${baths}\n• Relación precio/m²: ${Math.round(property.price / size)}$\n\n📈 PLUSVALÍA ESTIMADA: 15-20% en 3 años\nZona en constante crecimiento con nuevos desarrollos comerciales y residenciales.\n\n💼 Contacta a nuestros asesores de inversión.`
      },
      metadata: { platform: 'portal', variation: 3 }
    },
    
    // Variation 4 - Family oriented
    {
      id: uuidv4(),
      content: {
        description: `🏡 ¡EL HOGAR PERFECTO PARA TU FAMILIA! 🏡\n\nEn ${property.address} encontrarás el espacio ideal para criar a tus hijos.\n\n🛏️ ESPACIOS FAMILIARES:\n• ${beds} habitaciones amplias (${beds >= 3 ? 'incluye suite principal con vestidor' : 'incluye closet amplio'})\n• ${baths} baños completos para toda la familia\n• Sala y comedor integrados de ${size}m²\n• Cocina con desayunador y despensa\n\n🎓 ZONA FAMILIAR:\n• Escuelas a 2 cuadras\n• Parques y plazas cercanas\n• Centros comerciales a 5 minutos\n\n💰 ${priceFormatted} - ¡Un hogar que tu familia merece!`
      },
      metadata: { platform: 'portal', variation: 4 }
    },
    
    // Variation 5 - Modern & Minimalist
    {
      id: uuidv4(),
      content: {
        description: `◆ DISEÑO CONTEMPORÁNEO EN ${property.address} ◆\n\nPropiedad de ${size}m² con diseño vanguardista y líneas limpias.\n\n◇ CARACTERÍSTICAS:\n• Estilo minimalista con materiales premium\n• ${beds} habitaciones con iluminación LED\n• ${baths} baños con vanitorios flotantes\n• Pisos de porcelanato tipo mármol\n\n◇ ACABADOS:\n• Techos altos con molduras ornamentales\n• Ventanales de piso a techo\n• Closets empotrados y organizadores\n\n💰 ${priceFormatted} ◆`
      },
      metadata: { platform: 'portal', variation: 5 }
    },
    
    // Variation 6 - Location focus
    {
      id: uuidv4(),
      content: {
        description: `📍 ¡UBICACIÓN PRIVILEGIADA! ${property.title}\n\nUbicada estratégicamente en ${property.address}.\n\n🚇 CONECTIVIDAD:\n• 5 min del Metro/Subte\n• 10 min del Centro de la Ciudad\n• 15 min del Aeropuerto\n• Acceso inmediato a Vías Principales\n\n🏢 EN LOS ALREDEDORES:\n• Plaza Comercial a 3 cuadras\n• Hospitales y Clínicas cercanas\n• Zonas recreativas y deportivas\n\n💰 ${priceFormatted} - ¡No te pierdas esta ubicación única!`
      },
      metadata: { platform: 'portal', variation: 6 }
    },
    
    // Variation 7 - Renovation opportunity
    {
      id: uuidv4(),
      content: {
        description: `🔨 OPORTUNIDAD: ¡PROPIEDAD PARA RENOVAR! 🔨\n\n${property.title} en ${property.address} - ${size}m² de potencial.\n\nEsta propiedad tiene:\n• ${beds} habitaciones con pisos de madera originales\n• ${baths} baños clásicos\n• Techos altos con molduras ornamentales\n• Espacios amplios que puedes personalizar\n\n🔧 OPORTUNIDADES:\n• Zona en gentrificación\n• Precio por m²: ${Math.round(property.price / size)}$\n• Potencial de revalorización: 30%+\n\n💼 Llama hoy para ver esta oportunidad única.`
      },
      metadata: { platform: 'portal', variation: 7 }
    },
    
    // Variation 8 - View & Light
    {
      id: uuidv4(),
      content: {
        description: `☀️ ¡LUZ Y VISTAS PANORÁMICAS! ☀️\n\n${property.title} en ${property.address} ofrece:\n\n🌅 ILUMINACIÓN NATURAL:\n• Orientación Este-Oeste\n• Ventanales de piso a techo\n• ${beds} habitaciones bañadas de luz\n• Terraza/balcón con vista abierta\n\n🌄 VISTAS:\n${property.features?.includes('vista') ? '• Vista panorámica garantizada\n' : '• Vista a la ciudad\n• Vista a áreas verdes'}\n\n💰 ${priceFormatted} - ¡Un hogar lleno de luz!`
      },
      metadata: { platform: 'portal', variation: 8 }
    },
    
    // Variation 9 - Quick sale
    {
      id: uuidv4(),
      content: {
        description: `⚡️ ¡VENTA EXPRESS! ${property.title} ⚡️\n\nOportunidad única en ${property.address}.\n\n⏱️ DATOS RÁPIDOS:\n• ${size}m² construidos\n• ${beds} habs | ${baths} baños\n• Precio especial: ${priceFormatted}\n• Precio por m²: ${Math.round(property.price / size)}$\n\n⚡️ ¿POR QUÉ VENTA EXPRESS?\n• Propiedad desocupada\n• Documentación en regla\n• Entrega inmediata\n• Negociable con oferta seria\n\n💼 Llama AHORA al [Teléfono]! Válido hasta agotar existencias.`
      },
      metadata: { platform: 'portal', variation: 9 }
    }
  ];
  
  return variations;
}

/**
 * Generate short description for social media
 */
function generateShortDescription(property) {
  const priceFormatted = formatCurrency(property.price);
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const size = property.area;

  return `🏠 ${property.title}\n\n${beds} Habs | ${baths} Baños | ${size}m²\n\n💰 ${priceFormatted}\n\n📍 ${property.address}\n\n¡No te pierdas esta increíble oportunidad! Consulta disponibilidad.`;
}

/**
 * Generate consolidated email marketing content
 * Returns single object for GeneratedContent compatibility
 */
function generateEmailVariations(property) {
  const priceFormatted = formatCurrency(property.price);
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const size = property.area;

  return {
    id: uuidv4(),
    content: {
      subject: `🏡 ¡Nueva Propiedad en el Mercado! ${property.title}`,
      body: `Hola [Nombre]!\n\nTenemos el agrado de presentarte esta oportunidad única que sabemos que te va a interesar.\n\n📍 ${property.address}\n💰 ${priceFormatted}\n📐 ${size}m²\n🛏️ ${beds} habitaciones | 🚿 ${baths} baños\n\nEsta propiedad combina ubicación, comodidad y el mejor precio del mercado. No esperes más y sé el primero en visitarla.\n\n¿Te gustaría conocer más? Podemos coordinar una visita o enviarte más fotos y videos.\n\nEstamos a tu disposición.\n\n¡Saludos!`,
      preheader: `Descubre esta propiedad única en ${property.address}`
    },
    cta: {
      text: 'Solicitar información',
      url: `https://wa.me/5491112345678?text=Hola!%20Me%20interesa%20la%20propiedad%20en%20${encodeURIComponent(property.address)}`
    }
  };
}

/**
 * Generate 9 variations of social media copies
 * (3 per platform: Instagram, Facebook, TikTok)
 */
function generateSocialCopies(property) {
  const priceFormatted = formatCurrency(property.price);
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const size = property.area;

  const variations = [
    // Instagram - Variation 1
    {
      id: uuidv4(),
      platform: 'instagram',
      variation: 1,
      type: 'feed',
      content: {
        caption: `✨ ¡LISTO PARA SER TU NUEVO HOGAR! ✨\n\nEsta belleza de propiedad acaba de llegar al mercado y no queremos que te la pierdas.\n\n📍 ${property.address}\n📐 ${size}m² | ${beds} Habs | ${baths} Baños\n💰 ${priceFormatted}\n\nCaracterísticas que enamoran:\n✓ Espacios llenos de luz natural\n✓ Distribución moderna y funcional\n✓ Ubicación que lo tiene TODO\n\n🏷️ #RealEstate #Propiedad #NuevoHogar #Inmuebles #CasaIdeal #SueñoHechoRealidad #InversiónInteligente #${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}`,
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
    // Instagram - Variation 2
    {
      id: uuidv4(),
      platform: 'instagram',
      variation: 2,
      type: 'feed',
      content: {
        caption: `🏠 ¡Oportunidad Única en ${property.address.toUpperCase()}! 🏠\n\n${property.title}\n\n✨ ${beds} habitaciones perfectas\n✨ ${baths} baños completos\n✨ Vista espectacular\n\n💰 ${priceFormatted}\n\n#Instagram #RealEstate #${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}`,
        imageUrl: property.images?.[0]?.url || null,
        hashtags: ['#Instagram', '#RealEstate', '#Oportunidad', '#CasaIdeal']
      },
      preview: {
        type: 'instagram',
        layout: 'feed',
        image: property.images?.[0]?.url || null,
        caption: `🏠 ¡Oportunidad Única en ${property.address.toUpperCase()}! 🏠`
      }
    },
    // Instagram - Variation 3
    {
      id: uuidv4(),
      platform: 'instagram',
      variation: 3,
      type: 'story',
      content: {
        caption: `📸 Swipe para ver esta ${property.propertyType} increíble! 📸\n\n📍 ${property.address}\n💰 ${priceFormatted}\n\n#Story #RealEstate #${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}`,
        imageUrl: property.images?.[0]?.url || null,
        hashtags: ['#Story', '#RealEstate', '#Swipe']
      },
      preview: {
        type: 'instagram',
        layout: 'story',
        image: property.images?.[0]?.url || null,
        caption: `📸 Swipe para ver esta ${property.propertyType}! 📸`
      }
    },
    // Facebook - Variation 1
    {
      id: uuidv4(),
      platform: 'facebook',
      variation: 1,
      type: 'post',
      content: {
        caption: `🏠 ¡GRAN OPORTUNIDAD INMOBILIARIA!\n\n${property.title}\n\n¿Buscas un lugar especial para vivir? Esta propiedad podría ser exactamente lo que necesitas.\n\n📐 Superficie: ${size}m²\n🛏️ Habitaciones: ${beds}\n🛁 Baños: ${baths}\n📍 Ubicación: ${property.address}\n\n💰 Precio competitivo: ${priceFormatted}\n\nCaracterísticas destacadas:\n• Acabados de calidad\n• Excelente distribución de espacios\n• Zona con todos los servicios\n\n¿Te interesa conocer más? Escríbenos o llámanos hoy mismo. Estamos listos para ayudarte a encontrar tu próxima propiedad. 👇\n\n#Inmuebles #RealEstate #PropiedadEnVenta #CasaNueva #SueñoHechoRealidad`,
        imageUrl: property.images?.[0]?.url || null,
        link: `https://portal-inmobiliario.com/propiedad/${property.id}`,
        hashtags: ['#Inmuebles', '#RealEstate', '#PropiedadEnVenta']
      },
      preview: {
        type: 'facebook',
        layout: 'post',
        image: property.images?.[0]?.url || null,
        caption: `🏠 ¡GRAN OPORTUNIDAD INMOBILIARIA!\n${property.title}\n💰 ${priceFormatted}`
      }
    },
    // Facebook - Variation 2
    {
      id: uuidv4(),
      platform: 'facebook',
      variation: 2,
      type: 'post',
      content: {
        caption: `📈 OPORTUNIDAD DE INVERSIÓN: ${property.title}\n\n¿Buscas rendimiento y plusvalía? Esta propiedad en ${property.address} es tu mejor opción.\n\n📊 DATOS DE INVERSIÓN:\n• Precio: ${priceFormatted}\n• Superficie: ${size}m²\n• Habitaciones: ${beds}\n• Baños: ${baths}\n• Relación precio/m²: ${Math.round(property.price / size)}$\n\n📈 PLUSVALÍA ESTIMADA: 15-20% en 3 años\nZona en constante crecimiento con nuevos desarrollos comerciales y residenciales.\n\n💼 Contacta a nuestros asesores de inversión.`,
        imageUrl: property.images?.[0]?.url || null,
        link: `https://portal-inmobiliario.com/propiedad/${property.id}`,
        hashtags: ['#Inversion', '#RealEstate', '#Plusvalia']
      },
      preview: {
        type: 'facebook',
        layout: 'post',
        image: property.images?.[0]?.url || null,
        caption: `📈 OPORTUNIDAD DE INVERSIÓN: ${property.title}`
      }
    },
    // Facebook - Variation 3
    {
      id: uuidv4(),
      platform: 'facebook',
      variation: 3,
      type: 'post',
      content: {
        caption: `🏡 ¡EL HOGAR PERFECTO PARA TU FAMILIA! 🏡\n\nEn ${property.address} encontrarás el espacio ideal para criar a tus hijos.\n\n🛏️ ESPACIOS FAMILIARES:\n• ${beds} habitaciones amplias (${beds >= 3 ? 'incluye suite principal con vestidor' : 'incluye closet amplio'})\n• ${baths} baños completos para toda la familia\n• Sala y comedor integrados de ${size}m²\n• Cocina con desayunador y despensa\n\n🎓 ZONA FAMILIAR:\n• Escuelas a 2 cuadras\n• Parques y plazas cercanas\n• Centros comerciales a 5 minutos\n\n💰 ${priceFormatted} - ¡Un hogar que tu familia merece!`,
        imageUrl: property.images?.[0]?.url || null,
        link: `https://portal-inmobiliario.com/propiedad/${property.id}`,
        hashtags: ['#Familia', '#Hogar', '#RealEstate']
      },
      preview: {
        type: 'facebook',
        layout: 'post',
        image: property.images?.[0]?.url || null,
        caption: `🏡 ¡EL HOGAR PERFECTO PARA TU FAMILIA! 🏡`
      }
    },
    // TikTok - Variation 1
    {
      id: uuidv4(),
      platform: 'tiktok',
      variation: 1,
      type: 'video',
      content: {
        caption: `🎬 POV: Encontraste la casa perfecta... 😍\n\n${beds} Habs | ${baths} Baños | ${size}m²\n💰 ${priceFormatted}\n📍 ${property.address}\n\n🏷️ #realestate #househunting #dreamhome #propiedad #inmuebles`,
        script: `🎬 HOOK (0-3s): "POV: Encontraste la casa perfecta..."\n\n📍 (3-8s): Recorrido mostrando ${beds} habitaciones, ${baths} baños, ${size}m²\n\n💰 (8-12s): Precio "${priceFormatted}" aparece en pantalla\n\n🎯 CTA (12-15s): "Link en bio para agendar tu visita 👇"`,
        hashtags: ['#realestate', '#househunting', '#dreamhome', '#propiedad', '#inmuebles'],
        sound: 'Trending audio - Upbeat Lifestyle',
        thumbnail: property.images?.[0]?.url || null
      },
      preview: {
        type: 'tiktok',
        layout: 'video',
        thumbnail: property.images?.[0]?.url || null,
        caption: 'POV: Encontraste la casa perfecta... 😍'
      }
    },
    // TikTok - Variation 2
    {
      id: uuidv4(),
      platform: 'tiktok',
      variation: 2,
      type: 'video',
      content: {
        caption: `🎬 TOUR: Recorrido virtual de esta propiedad...\n\n${property.title}\n\n✨ ${beds} habitaciones\n✨ ${baths} baños\n✨ ${size}m²\n💰 ${priceFormatted}\n\n🏷️ #tiktokrealestate #virtualtour #${property.propertyType}`,
        script: `🎬 HOOK (0-3s): "TOUR: Recorrido virtual..."\n\n📍 (3-10s): Muestra ${beds} habitaciones, cocina, jardín...\n\n💰 (10-15s): "${priceFormatted}" aparece en pantalla\n\n🎯 CTA: "Link en bio para más info 👇"`,
        hashtags: ['#tiktokrealestate', '#virtualtour', '#propiedad'],
        sound: 'Trending audio - Chill Vibes',
        thumbnail: property.images?.[0]?.url || null
      },
      preview: {
        type: 'tiktok',
        layout: 'video',
        thumbnail: property.images?.[0]?.url || null,
        caption: 'TOUR: Recorrido virtual...'
      }
    },
    // TikTok - Variation 3
    {
      id: uuidv4(),
      platform: 'tiktok',
      variation: 3,
      type: 'video',
      content: {
        caption: `🎬 ANTES Y DESPUÉS: Transformación...\n\n${property.title}\n\n✨ Antes: Necesitaba amor...\n✨ Ahora: ${beds} habs | ${baths} baños\n💰 ${priceFormatted} en ${property.address}\n\n🏷️ #beforeandafter #transformation #realestate`,
        script: `🎬 HOOK (0-3s): "ANTES Y DESPUÉS..."\n\n📍 (3-10s): Muestra transformación de espacios...\n\n💰 (10-15s): "Ahora vale ${priceFormatted}"\n\n🎯 CTA: "Link en bio 👇"`,
        hashtags: ['#beforeandafter', '#transformation', '#realestate'],
        sound: 'Trending audio - Transformation',
        thumbnail: property.images?.[0]?.url || null
      },
      preview: {
        type: 'tiktok',
        layout: 'video',
        thumbnail: property.images?.[0]?.url || null,
        caption: 'ANTES Y DESPUÉS: Transformación...'
      }
    }
];

  return variations;
}

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
  generateSocialCopies,
  generatePortalDescriptions,
  generateEmailVariations
};
