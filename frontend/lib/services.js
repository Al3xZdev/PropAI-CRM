// Shared services for Vercel Serverless Functions
// Contains content generation, scheduling, and helper functions

const { v4: uuidv4 } = require('uuid');

// ============================================
// IN-MEMORY STORAGE (resets on cold start)
// For production, use Vercel KV or a database
// ============================================

const properties = new Map();
const leads = new Map();
const schedules = new Map();
const publications = [];

// Initialize sample leads
function initializeSampleLeads() {
  if (leads.size > 0) return;
  
  const sampleLeads = [
    {
      id: uuidv4(),
      name: 'María González',
      email: 'maria.gonzalez@email.com',
      phone: '+52 55 1234 5678',
      channel: 'whatsapp',
      status: 'nuevo',
      propertyInterest: 'casa',
      propertyId: null,
      propertyTitle: 'Casa moderna en Lomas',
      source: 'Instagram',
      notes: 'Interesada en casas con jardín',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: null,
      followUps: []
    },
    {
      id: uuidv4(),
      name: 'Carlos Rodríguez',
      email: 'carlos.rod@email.com',
      phone: '+52 55 9876 5432',
      channel: 'email',
      status: 'contactado',
      propertyInterest: 'departamento',
      propertyId: null,
      propertyTitle: 'Departamento en Polanco',
      source: 'Formulario Web',
      notes: 'Busca zona céntrica, presupuesto flexible',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      followUps: [
        { day: 1, sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Primer contacto de bienvenida' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      phone: '+52 55 5555 4444',
      channel: 'formulario',
      status: 'respondio',
      propertyInterest: 'casa',
      propertyId: null,
      propertyTitle: 'Casa en Condesa',
      source: 'Portal Inmobiliario',
      notes: 'Muy interesada, quiere agendar visita',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      followUps: [
        { day: 1, sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Información inicial enviada' },
        { day: 3, sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp', message: 'Seguimiento por WhatsApp' },
        { day: 7, sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp', message: 'Recordatorio de visita' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Roberto Sánchez',
      email: 'roberto.s@email.com',
      phone: '+52 55 7777 8888',
      channel: 'whatsapp',
      status: 'nuevo',
      propertyInterest: 'terreno',
      propertyId: null,
      propertyTitle: 'Terreno en CDMX',
      source: 'WhatsApp',
      notes: 'Viene de recomendación de cliente',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: null,
      followUps: []
    },
    {
      id: uuidv4(),
      name: 'Laura Hernández',
      email: 'laura.hernandez@email.com',
      phone: '+52 55 3333 2222',
      channel: 'instagram',
      status: 'contactado',
      propertyInterest: 'departamento',
      propertyId: null,
      propertyTitle: 'Penthouse en Santa Fe',
      source: 'Instagram',
      notes: 'Cliente de alto perfil, responder rápido',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      followUps: [
        { day: 1, sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Detalles del penthouse enviados' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Diego Ramírez',
      email: 'diego.ram@email.com',
      phone: '+52 55 6666 5555',
      channel: 'formulario',
      status: 'respondio',
      propertyInterest: 'casa',
      propertyId: null,
      propertyTitle: 'Casa en Coyoacán',
      source: 'Formulario Web',
      notes: 'Interesado en la propiedad, ya visitó el lugar',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      followUps: [
        { day: 1, sentAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Bienvenida enviada' },
        { day: 3, sentAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp', message: 'Video de la propiedad' },
        { day: 7, sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp', message: 'Agendamos visita' },
        { day: 14, sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Post-visita: muchas gracias por venir' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Patricia López',
      email: 'patricia.l@email.com',
      phone: '+52 55 8888 9999',
      channel: 'whatsapp',
      status: 'nuevo',
      propertyInterest: 'departamento',
      propertyId: null,
      propertyTitle: 'Departamento en Roma Norte',
      source: 'WhatsApp',
      notes: 'Primera vez comprando casa, necesita guía',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: null,
      followUps: []
    },
    {
      id: uuidv4(),
      name: 'Fernando Torres',
      email: 'fernando.torres@email.com',
      phone: '+52 55 1111 2222',
      channel: 'email',
      status: 'contactado',
      propertyInterest: 'local',
      propertyId: null,
      propertyTitle: 'Local comercial en Insurgentes',
      source: 'Email',
      notes: 'Busca local para restaurante',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      followUps: [
        { day: 1, sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Información del local enviada' }
      ]
    },
    {
      id: uuidv4(),
      name: 'Carmen Rivera',
      email: 'carmen.rivera@email.com',
      phone: '+52 55 4444 3333',
      channel: 'instagram',
      status: 'respondio',
      propertyInterest: 'casa',
      propertyId: null,
      propertyTitle: 'Casa en San Ángel',
      source: 'Instagram',
      notes: 'Muy interesada en la ubicación',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      followUps: [
        { day: 1, sentAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Bienvenida' },
        { day: 3, sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp', message: 'Galería de fotos' },
        { day: 7, sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), channel: 'whatsapp', message: 'Video tour' },
        { day: 14, sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), channel: 'email', message: 'Oferta especial' }
      ]
    }
  ];

  sampleLeads.forEach(lead => leads.set(lead.id, lead));
}

// Initialize on module load
initializeSampleLeads();

// ============================================
// STORAGE ACCESSORS
// ============================================

function getProperties() { return properties; }
function getLeads() { return leads; }
function getSchedules() { return schedules; }
function getPublications() { return publications; }

function addPublication(log) {
  publications.unshift(log);
  return log;
}

// ============================================
// CONTENT GENERATION (Simulated AI)
// ============================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

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

function generatePortalDescription(property) {
  const typeLabels = {
    casa: 'Increíble oportunidad de adquirir esta hermosa casa',
    departamento: 'Moderno departamento con acabados de primera',
    terreno: 'Excelente terreno con gran potencial de desarrollo',
    local: 'Privilegiado local comercial en zona de alto tráfico',
    oficina: 'Espacio de oficina profesional en ubicación privilegiada'
  };

  const intro = typeLabels[property.propertyType] || 'Propiedad de oportunidad';
  const priceFormatted = formatCurrency(property.price);
  const size = property.area;
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const features = property.features || [];

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

function generateEmailContent(property) {
  const priceFormatted = formatCurrency(property.price);
  const firstImage = property.images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600';

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

function generateSocialCopies(property) {
  const priceFormatted = formatCurrency(property.price);
  const beds = property.bedrooms || 0;
  const baths = property.bathrooms || 0;
  const size = property.area;

  return [
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

🏷️ #RealEstate #Propiedad #NuevoHogar #Inmuebles #CasaIdeal #SueñoHechoRealidad #InversiónInteligente #${property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}`,
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
}

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
  
  const addressPart = property.address?.split(',').pop()?.trim().replace(/\s+/g, '') || '';
  if (addressPart) {
    baseHashtags.push(`#${addressPart}`);
  }
  
  return baseHashtags.slice(0, 10);
}

function generateKeywords(property) {
  return [
    property.propertyType,
    property.bedrooms ? `${property.bedrooms} habitaciones` : null,
    property.bathrooms ? `${property.bathrooms} baños` : null,
    `${property.area} m²`,
    property.address
  ].filter(Boolean);
}

// ============================================
// SCHEDULING
// ============================================

function generateSchedule(property, content, startDate = new Date()) {
  const start = new Date(startDate);
  const priceFormatted = formatCurrency(property.price);
  
  const day1 = new Date(start);
  day1.setDate(day1.getDate() + 1);
  
  const day3 = new Date(start);
  day3.setDate(day3.getDate() + 3);
  
  const day5 = new Date(start);
  day5.setDate(day5.getDate() + 5);
  
  const day10 = new Date(start);
  day10.setDate(day10.getDate() + 10);

  const posts = [
    {
      id: uuidv4(),
      day: 1,
      scheduledDate: day1.toISOString(),
      type: 'just_listed',
      title: '🏠 ¡Nueva Propiedad en el Mercado!',
      description: 'Presentación oficial de la propiedad con galería de fotos completa',
      platforms: generatePlatformPosts(property, 'instagram', 'photo', day1),
      content: {
        images: property.images?.slice(0, 5) || [],
        caption: content?.shortDescription || generateDefaultCaption(property),
        hashtags: content?.hashtags || []
      },
      status: 'scheduled'
    },
    {
      id: uuidv4(),
      day: 3,
      scheduledDate: day3.toISOString(),
      type: 'video_reel',
      title: '🎬 Video Tour de la Propiedad',
      description: 'Recorrido virtual en formato reel para redes sociales',
      platforms: generatePlatformPosts(property, 'tiktok', 'video', day3),
      content: {
        videoUrl: '/generated/virtual-tour.mp4',
        thumbnail: property.images?.[0]?.url,
        caption: '🏡 Dale un vistazo a esta increíble propiedad... ¡Te va a encantar! 👀✨',
        music: 'Trending lifestyle beat',
        duration: '0:30'
      },
      status: 'scheduled'
    },
    {
      id: uuidv4(),
      day: 5,
      scheduledDate: day5.toISOString(),
      type: 'open_house',
      title: '📅 ¡Open House!',
      description: 'Invitación al evento de puertas abiertas',
      platforms: generatePlatformPosts(property, 'facebook', 'event', day5),
      content: {
        eventName: `Open House: ${property.title}`,
        eventDate: day5.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        location: property.address,
        description: '¡Te esperamos! Habrá visitas guiadas todo el día. No necesitas cita previa.',
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(property.address)}`
      },
      status: 'scheduled'
    },
    {
      id: uuidv4(),
      day: 10,
      scheduledDate: day10.toISOString(),
      type: 'price_update',
      title: '💰 Actualización de Precio',
      description: 'Recordatorio de la oportunidad con precio especial',
      platforms: generatePlatformPosts(property, 'instagram', 'story', day10),
      content: {
        message: `⚠️ Recuerda: esta oportunidad no durará mucho

💰 Precio: ${priceFormatted}
📍 ${property.address}
📞 ¡Contáctanos ahora!`,
        urgency: 'high',
        cta: 'Reservar Visita'
      },
      status: 'scheduled'
    }
  ];

  return {
    propertyId: property.id,
    propertyTitle: property.title,
    startDate: start.toISOString(),
    posts,
    totalPosts: posts.length,
    estimatedEndDate: day10.toISOString(),
    createdAt: new Date().toISOString()
  };
}

function generatePlatformPosts(property, platform, postType, scheduledDate) {
  const platforms = [];
  const priceFormatted = formatCurrency(property.price);
  const imageUrl = property.images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400';
  
  platforms.push({
    id: uuidv4(),
    platform: 'instagram',
    enabled: true,
    postType: postType === 'photo' ? 'feed' : postType,
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      image: imageUrl,
      caption: postType === 'photo' 
        ? `✨ ¡LISTO PARA SER TU NUEVO HOGAR! ✨\n\n📍 ${property.address}\n💰 ${priceFormatted}`
        : null
    }
  });

  platforms.push({
    id: uuidv4(),
    platform: 'facebook',
    enabled: true,
    postType: postType === 'event' ? 'event' : 'post',
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      image: imageUrl,
      message: `¡Nueva propiedad disponible!\n📍 ${property.address}\n💰 ${priceFormatted}`
    }
  });

  if (postType === 'video' || postType === 'photo') {
    platforms.push({
      id: uuidv4(),
      platform: 'tiktok',
      enabled: postType === 'video',
      postType: 'video',
      scheduledDate: scheduledDate.toISOString(),
      status: postType === 'video' ? 'scheduled' : 'skipped',
      preview: {
        thumbnail: imageUrl,
        caption: '🏡 Tour de esta increíble propiedad... 👀✨'
      }
    });
  }

  platforms.push({
    id: uuidv4(),
    platform: 'twitter',
    enabled: true,
    postType: 'tweet',
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      message: `🏠 Nueva propiedad en ${property.address}\n${priceFormatted}\n${property.bedrooms} hab | ${property.bathrooms} baños | ${property.area}m²`
    }
  });

  platforms.push({
    id: uuidv4(),
    platform: 'portal',
    enabled: true,
    postType: 'listing',
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      title: property.title,
      description: property.description || 'Propiedad de oportunidad',
      price: priceFormatted,
      image: imageUrl
    }
  });

  return platforms;
}

function generateDefaultCaption(property) {
  return `🏠 ${property.title}\n\n📍 ${property.address}\n💰 ${formatCurrency(property.price)}\n📐 ${property.area}m² | ${property.bedrooms} Habs | ${property.bathrooms} Baños\n\n¡No te pierdas esta increíble oportunidad!`;
}

// ============================================
// FOLLOW-UP MESSAGE GENERATION
// ============================================

function generateFollowUpMessage(lead, day, channel) {
  const messages = {
    1: [
      `¡Hola ${lead.name}! Gracias por tu interés en nuestra propiedad. He preparado información exclusiva sobre ${lead.propertyTitle || 'las propiedades disponibles'}. ¿Te gustaría recibir más detalles?`,
      `Hola ${lead.name}, recibe una cálida bienvenida. Vi que te interesa nuestra oferta en ${lead.propertyTitle || 'el sector inmobiliario'}. Estoy aquí para ayudarte con cualquier pregunta.`,
      `¡${lead.name}! Qué alegría que contactes con nosotros. He creado un dossier especial con todo lo que necesitas saber sobre ${lead.propertyTitle || 'esta oportunidad'}. ¿Cuándo podemos hablar?`
    ],
    3: [
      `¡Hola ${lead.name}! Espero que hayas recibido mi mensaje anterior. He preparado un video tour de ${lead.propertyTitle || 'la propiedad'} donde puedes ver cada rincón. ¿Te gustaría verlo?`,
      `${lead.name}, ¿tuviste oportunidad de revisar la información? He agregado fotos adicionales de ${lead.propertyTitle || 'el espacio'} que creo te van a encantar. ¿Alguna duda?`,
      `¡Hey ${lead.name}! Solo quería asegurarme de que tuvieras toda la información. He preparado una presentación virtual de ${lead.propertyTitle || 'la propiedad'} que muestra todos los detalles.`
    ],
    7: [
      `¡Hola ${lead.name}! ¿Cómo estás? Quiero compartirte algo especial: tenemos una oportunidad limitada en ${lead.propertyTitle || 'esta zona'} y quería darte prioridad. ¿Podemos agendar una llamada rápida?`,
      `${lead.name}, he estado pensando en ti y en lo que buscas. ${lead.propertyTitle || 'Esta propiedad'} tiene características únicas que se ajustan perfectamente a lo que describes. ¿Qué te parece si agendamos una visita?`,
      `¡Buenas noticias ${lead.name}! Tenemos una fecha disponible para visita de ${lead.propertyTitle || 'la propiedad'} la próxima semana. ¿Te interesa? Es una oportunidad que no querrás perder.`
    ],
    14: [
      `${lead.name}, esta será mi última mensaje de seguimiento. ${lead.propertyTitle || 'La propiedad'} sigue disponible pero ha tenido mucho interés. Si aún estás interesado, me encantaría ayudarte. ¡Quedo atento!`,
      `¡Hola ${lead.name}! Quiero ser transparente contigo: han surgido otros interesados en ${lead.propertyTitle || 'esta propiedad'}. Pero siempre hay room para el mejor postor. ¿Te gustaría hacer una oferta?`,
      `${lead.name}, entiendo que a veces el timing no es el ideal. Si en el futuro buscas propiedad en ${lead.propertyTitle || 'esta zona'}, aquí estaré. Esta es una puerta que nunca se cierra del todo. Un abrazo.`
    ]
  };

  const dayMessages = messages[day] || messages[1];
  return dayMessages[Math.floor(Math.random() * dayMessages.length)];
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Storage
  getProperties,
  getLeads,
  getSchedules,
  getPublications,
  addPublication,
  
  // Content generation
  generateContent,
  generateSocialCopies,
  generateHashtags,
  generateKeywords,
  
  // Scheduling
  generateSchedule,
  
  // Follow-ups
  generateFollowUpMessage,
  
  // Utilities
  formatCurrency,
  uuidv4
};
