const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { generateSchedule, getScheduleForProperty } = require('../services/scheduler');
const { addPublicationLog, getPublications, getPublicationsByProperty } = require('../services/publicationLog');
const { postToInstagram } = require('../services/instagramPublisher');

// Load environment variables
require('dotenv').config();

// In-memory schedule storage
const schedules = new Map();

// Manual scheduled posts storage (for user-created schedules)
const manualSchedules = [];

// Create automatic schedule for a property
router.post('/create', (req, res) => {
  try {
    const { property, content, startDate } = req.body;
    
    if (!property) {
      return res.status(400).json({ error: 'Se requiere información de la propiedad' });
    }

    const scheduleId = uuidv4();
    const schedule = generateSchedule(property, content, startDate);
    
    schedules.set(scheduleId, {
      id: scheduleId,
      propertyId: property.id,
      schedule,
      createdAt: new Date().toISOString(),
      status: 'scheduled'
    });

    res.json({
      success: true,
      scheduleId,
      schedule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get schedule for a property
router.get('/property/:propertyId', (req, res) => {
  const { propertyId } = req.params;
  
  for (const [id, schedule] of schedules) {
    if (schedule.propertyId === propertyId) {
      return res.json({ success: true, schedule });
    }
  }
  
  res.status(404).json({ error: 'Horario no encontrado' });
});

// Get all schedules
router.get('/', (req, res) => {
  const allSchedules = Array.from(schedules.values());
  res.json({ schedules: allSchedules });
});

// Get all manual schedules (user-created)
router.get('/manual', (req, res) => {
  res.json({ posts: manualSchedules });
});

// Create manual schedule (YouTube-style picker)
router.post('/manual', (req, res) => {
  try {
    const { title, description, scheduledDate, type, platforms, content, propertyId, status } = req.body;
    
    if (!scheduledDate) {
      return res.status(400).json({ error: 'Se requiere fecha de programación' });
    }
    
    if (!platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos una plataforma' });
    }
    
    const post = {
      id: uuidv4(),
      title: title || 'Publicación Programada',
      description: description || '',
      scheduledDate: new Date(scheduledDate).toISOString(),
      type: type || 'just_listed',
      platforms: platforms.map(p => ({
        id: uuidv4(),
        platform: p.platform || p,
        enabled: p.enabled !== false,
        scheduled: p.scheduled !== false,
        scheduledTime: p.scheduledTime || null,
        published: false,
        publishedAt: null,
        link: null
      })),
      content: content || { caption: '', imageUrl: null },
      propertyId: propertyId || null,
      status: status || 'scheduled',
      createdAt: new Date().toISOString(),
      publishedAt: null
    };
    
    manualSchedules.push(post);
    
    console.log('✅ Manual schedule created:', post.id, '- Date:', scheduledDate);
    
    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error creating manual schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update manual schedule
router.put('/manual/:postId', (req, res) => {
  try {
    const { postId } = req.params;
    const updates = req.body;
    
    const index = manualSchedules.findIndex(p => p.id === postId);
    if (index === -1) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    
    manualSchedules[index] = {
      ...manualSchedules[index],
      ...updates,
      id: postId // Ensure ID doesn't change
    };
    
    res.json({
      success: true,
      post: manualSchedules[index]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete manual schedule
router.delete('/manual/:postId', (req, res) => {
  try {
    const { postId } = req.params;
    const index = manualSchedules.findIndex(p => p.id === postId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    
    manualSchedules.splice(index, 1);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get publication history
router.get('/history', (req, res) => {
  const history = getPublications();
  res.json({ publications: history });
});

// Get publication history by property
router.get('/history/:propertyId', (req, res) => {
  const history = getPublicationsByProperty(req.params.propertyId);
  res.json({ publications: history });
});

// Publish a scheduled post to Instagram (REAL publishing)
router.post('/:scheduleId/publish/:postIndex', async (req, res) => {
  const { scheduleId, postIndex } = req.params;
  const { imageUrl } = req.body; // URL of the image to post
  
  console.log(`📤 Publish request - Schedule: ${scheduleId}, Post: ${postIndex}, Image: ${imageUrl}`);
  
  const schedule = schedules.get(scheduleId);
  if (!schedule) {
    console.log('❌ Schedule not found:', scheduleId);
    return res.status(404).json({ error: 'Horario no encontrado' });
  }

  const index = parseInt(postIndex);
  if (!schedule.schedule.posts[index]) {
    console.log('❌ Post not found at index:', index);
    return res.status(404).json({ error: 'Publicación no encontrada' });
  }

  const post = schedule.schedule.posts[index];
  const instagramPlatform = post.platforms.find(p => p.platform === 'instagram' && p.enabled);
  
  if (!instagramPlatform) {
    console.log('❌ Instagram not enabled for this post');
    return res.status(400).json({ error: 'Instagram no está habilitado para esta publicación' });
  }

  // Validate imageUrl
  if (!imageUrl) {
    console.log('❌ No image URL provided');
    return res.status(400).json({ error: 'Se requiere URL de imagen para publicar en Instagram' });
  }

  try {
    // Get the access token from environment
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    
    console.log('🔑 Token exists:', !!accessToken);
    
    if (!accessToken) {
      throw new Error('Token de Instagram no configurado');
    }

    // Prepare the caption for Instagram (truncate to 2200 chars max)
    const caption = post.content?.caption?.substring(0, 2200) || post.content?.substring(0, 2200) || 'Nueva propiedad disponible!';
    
    console.log('📝 Posting to Instagram with image:', imageUrl);
    console.log('📝 Caption:', caption.substring(0, 100) + '...');
    
    // Post to Instagram
    const result = await postToInstagram(accessToken, imageUrl, caption);
    
    console.log('📊 Instagram result:', result);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // Update post status
    post.status = 'published';
    post.publishedAt = new Date().toISOString();
    post.platforms = post.platforms.map(p => {
      if (p.platform === 'instagram') {
        return {
          ...p,
          published: true,
          publishedAt: new Date().toISOString(),
          link: `https://instagram.com/p/${result.postId}`
        };
      }
      return p;
    });

    // Log publication
    addPublicationLog(
      schedule.propertyId,
      schedule.propertyTitle || schedule.property?.title,
      post,
      'instagram'
    );

    schedules.set(scheduleId, schedule);

    res.json({
      success: true,
      post,
      instagramResult: result
    });
  } catch (error) {
    console.error('Error publishing to Instagram:', error);
    res.status(500).json({ 
      error: `Error al publicar en Instagram: ${error.message}`,
      details: error.message 
    });
  }
});

// Cancel a scheduled post
router.post('/:scheduleId/cancel/:postIndex', (req, res) => {
  const { scheduleId, postIndex } = req.params;
  
  const schedule = schedules.get(scheduleId);
  if (!schedule) {
    return res.status(404).json({ error: 'Horario no encontrado' });
  }

  const index = parseInt(postIndex);
  if (!schedule.schedule.posts[index]) {
    return res.status(404).json({ error: 'Publicación no encontrada' });
  }

  schedule.schedule.posts[index].status = 'cancelled';

  res.json({
    success: true,
    post: schedule.schedule.posts[index]
  });
});

module.exports = router;
