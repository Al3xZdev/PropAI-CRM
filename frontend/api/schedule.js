// Schedule API Route for Vercel
// POST /api/schedule/create - Create schedule for property
// GET /api/schedule - Get all schedules
// GET /api/schedule/property/:propertyId - Get schedule for property
// GET /api/schedule/history - Get publication history
// GET /api/schedule/history/:propertyId - Get history for property
// POST /api/schedule/:scheduleId/publish/:postIndex - Publish a post
// POST /api/schedule/:scheduleId/cancel/:postIndex - Cancel a post

const { getSchedules, getPublications, addPublication, generateSchedule, uuidv4 } = require('../lib/services');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const schedules = getSchedules();
  const publications = getPublications();
  const url = req.url || '';

  try {
    // History routes
    if (url.includes('/history')) {
      const historyMatch = url.match(/\/history(?:\/(.+))?$/);
      const propertyId = historyMatch && historyMatch[1] ? historyMatch[1] : null;
      
      if (propertyId) {
        const propertyHistory = publications.filter(p => p.propertyId === propertyId);
        return res.json({ publications: propertyHistory });
      }
      
      return res.json({ publications: publications.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)) });
    }

    // Parse schedule ID and post index from URL
    const scheduleMatch = url.match(/\/api\/schedule\/([^/]+)(?:\/(.+))?$/);
    const scheduleId = scheduleMatch ? scheduleMatch[1] : null;
    const subpath = scheduleMatch && scheduleMatch[2] ? scheduleMatch[2] : null;

    switch (req.method) {
      case 'GET':
        // Get all schedules
        if (!scheduleId) {
          const allSchedules = Array.from(schedules.values());
          return res.json({ schedules: allSchedules });
        }

        // Get schedule for specific property
        if (scheduleId === 'property') {
          // This would need propertyId from query, simplified for now
          return res.json({ schedules: Array.from(schedules.values()) });
        }

        // Get single schedule
        const schedule = schedules.get(scheduleId);
        if (!schedule) {
          return res.status(404).json({ error: 'Horario no encontrado' });
        }
        return res.json({ success: true, schedule });

      case 'POST':
        // Create new schedule
        if (scheduleId === 'create' || (!scheduleId && url.includes('/create'))) {
          const { property, content, startDate } = req.body;
          
          if (!property) {
            return res.status(400).json({ error: 'Se requiere información de la propiedad' });
          }

          const newScheduleId = uuidv4();
          const scheduleData = generateSchedule(property, content, startDate);
          
          const newSchedule = {
            id: newScheduleId,
            propertyId: property.id,
            schedule: scheduleData,
            createdAt: new Date().toISOString(),
            status: 'scheduled'
          };

          schedules.set(newScheduleId, newSchedule);

          return res.json({
            success: true,
            scheduleId: newScheduleId,
            schedule: scheduleData
          });
        }

        // Publish a post
        if (scheduleId && subpath && subpath.startsWith('/publish/')) {
          const postIndex = parseInt(subpath.replace('/publish/', ''));
          
          const scheduleToPublish = schedules.get(scheduleId);
          if (!scheduleToPublish) {
            return res.status(404).json({ error: 'Horario no encontrado' });
          }

          if (!scheduleToPublish.schedule.posts[postIndex]) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
          }

          const post = scheduleToPublish.schedule.posts[postIndex];
          
          post.status = 'published';
          post.publishedAt = new Date().toISOString();
          post.platforms = post.platforms.map(p => ({
            ...p,
            published: true,
            publishedAt: new Date().toISOString(),
            link: `https://${p.platform}.com/post/${uuidv4()}`
          }));

          // Log publication for each platform
          post.platforms.filter(p => p.enabled).forEach(platform => {
            addPublication({
              id: uuidv4(),
              propertyId: scheduleToPublish.propertyId,
              propertyTitle: scheduleToPublish.schedule.propertyTitle,
              postTitle: post.title,
              postType: post.type,
              platform: platform.platform,
              publishedAt: new Date().toISOString(),
              status: 'published'
            });
          });

          schedules.set(scheduleId, scheduleToPublish);

          return res.json({
            success: true,
            post,
            loggedPlatforms: post.platforms.filter(p => p.enabled).map(p => p.platform)
          });
        }

        // Cancel a post
        if (scheduleId && subpath && subpath.startsWith('/cancel/')) {
          const cancelIndex = parseInt(subpath.replace('/cancel/', ''));
          
          const scheduleToCancel = schedules.get(scheduleId);
          if (!scheduleToCancel) {
            return res.status(404).json({ error: 'Horario no encontrado' });
          }

          if (!scheduleToCancel.schedule.posts[cancelIndex]) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
          }

          scheduleToCancel.schedule.posts[cancelIndex].status = 'cancelled';
          schedules.set(scheduleId, scheduleToCancel);

          return res.json({
            success: true,
            post: scheduleToCancel.schedule.posts[cancelIndex]
          });
        }

        // Default POST - create schedule
        const { property, content, startDate } = req.body;
        
        if (!property) {
          return res.status(400).json({ error: 'Se requiere información de la propiedad' });
        }

        const newId = uuidv4();
        const scheduleData = generateSchedule(property, content, startDate);
        
        const newSched = {
          id: newId,
          propertyId: property.id,
          schedule: scheduleData,
          createdAt: new Date().toISOString(),
          status: 'scheduled'
        };

        schedules.set(newId, newSched);

        return res.json({
          success: true,
          scheduleId: newId,
          schedule: scheduleData
        });

      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('Schedule API Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
