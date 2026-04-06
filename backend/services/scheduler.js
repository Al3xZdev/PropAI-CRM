// Scheduler Service - Auto-generates staggered publication schedule
// Publication timeline: Day 1, Day 3, Day 5, Day 10

const { v4: uuidv4 } = require('uuid');

/**
 * Generate automatic staggered publication schedule
 * Days: 1 (Just Listed), 3 (Video/Reel), 5 (Open House), 10 (Price Update)
 */
function generateSchedule(property, content, startDate = new Date()) {
  const start = new Date(startDate);
  const priceFormatted = formatCurrency(property.price);
  
  // Calculate post dates
  const day1 = new Date(start);
  day1.setDate(day1.getDate() + 1);
  
  const day3 = new Date(start);
  day3.setDate(day3.getDate() + 3);
  
  const day5 = new Date(start);
  day5.setDate(day5.getDate() + 5);
  
  const day10 = new Date(start);
  day10.setDate(day10.getDate() + 10);

  const posts = [
    // Day 1: Photos + Just Listed
    {
      id: uuidv4(),
      day: 1,
      scheduledDate: day1.toISOString(),
      type: 'just_listed',
      title: `🏠 ${property.title}`,
      description: `Presentación oficial con galería de fotos de ${property.title}`,
      platforms: generatePlatformPosts(property, 'instagram', 'photo', day1),
      content: {
        images: property.images.slice(0, 5),
        caption: content?.shortDescription || generateDefaultCaption(property),
        hashtags: content?.hashtags || []
      },
      status: 'scheduled'
    },
    
    // Day 3: Video/Reel
    {
      id: uuidv4(),
      day: 3,
      scheduledDate: day3.toISOString(),
      type: 'video_reel',
      title: `🎬 Video Tour: ${property.title}`,
      description: `Recorrido virtual en formato reel de ${property.title}`,
      platforms: generatePlatformPosts(property, 'tiktok', 'video', day3),
      content: {
        videoUrl: '/generated/virtual-tour.mp4',
        thumbnail: property.images?.[0]?.url,
        caption: `🏡 Dale un vistazo a ${property.title}... ¡Te va a encantar! 👀✨`,
        music: 'Trending lifestyle beat',
        duration: '0:30'
      },
      status: 'scheduled'
    },
    
    // Day 5: Open House
    {
      id: uuidv4(),
      day: 5,
      scheduledDate: day5.toISOString(),
      type: 'open_house',
      title: `📅 Open House: ${property.title}`,
      description: `Invitación al evento de puertas abiertas de ${property.title}`,
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
        description: `${property.title}\n\n¡Te esperamos! Habrá visitas guiadas todo el día. No necesitas cita previa.`,
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(property.address)}`
      },
      status: 'scheduled'
    },
    
    // Day 10: Price Update
    {
      id: uuidv4(),
      day: 10,
      scheduledDate: day10.toISOString(),
      type: 'price_update',
      title: `💰 Precio Especial: ${property.title}`,
      description: `Recordatorio de la oportunidad con precio especial de ${property.title}`,
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

/**
 * Generate platform-specific post objects
 */
function generatePlatformPosts(property, platform, postType, scheduledDate) {
  const platforms = [];
  
  // Instagram
  platforms.push({
    id: uuidv4(),
    platform: 'instagram',
    enabled: true,
    postType: postType === 'photo' ? 'feed' : postType,
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      image: property.images?.[0]?.url || null,
      caption: postType === 'photo' 
        ? `✨ ¡LISTO PARA SER TU NUEVO HOGAR! ✨\n\n📍 ${property.address}\n💰 ${formatCurrency(property.price)}`
        : null
    }
  });

  // Facebook
  platforms.push({
    id: uuidv4(),
    platform: 'facebook',
    enabled: true,
    postType: postType === 'event' ? 'event' : 'post',
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      image: property.images?.[0]?.url || null,
      message: `¡Nueva propiedad disponible!\n📍 ${property.address}\n💰 ${formatCurrency(property.price)}`
    }
  });

  // TikTok
  if (postType === 'video' || postType === 'photo') {
    platforms.push({
      id: uuidv4(),
      platform: 'tiktok',
      enabled: postType === 'video',
      postType: 'video',
      scheduledDate: scheduledDate.toISOString(),
      status: postType === 'video' ? 'scheduled' : 'skipped',
      preview: {
        thumbnail: property.images?.[0]?.url || null,
        caption: '🏡 Tour de esta increíble propiedad... 👀✨'
      }
    });
  }

  // Twitter/X
  platforms.push({
    id: uuidv4(),
    platform: 'twitter',
    enabled: true,
    postType: 'tweet',
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    preview: {
      message: `🏠 Nueva propiedad en ${property.address}\n${formatCurrency(property.price)}\n${property.bedrooms} hab | ${property.bathrooms} baños | ${property.area}m²`
    }
  });

  // Real Estate Portals
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
      price: formatCurrency(property.price),
      image: property.images?.[0]?.url || null
    }
  });

  return platforms;
}

/**
 * Get schedule for a specific property
 */
function getScheduleForProperty(schedules, propertyId) {
  for (const [id, schedule] of schedules) {
    if (schedule.propertyId === propertyId) {
      return schedule;
    }
  }
  return null;
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

/**
 * Generate default caption if content is not available
 */
function generateDefaultCaption(property) {
  return `🏠 ${property.title}\n\n📍 ${property.address}\n💰 ${formatCurrency(property.price)}\n📐 ${property.area}m² | ${property.bedrooms} Habs | ${property.bathrooms} Baños\n\n¡No te pierdas esta increíble oportunidad!`;
}

module.exports = {
  generateSchedule,
  getScheduleForProperty
};
