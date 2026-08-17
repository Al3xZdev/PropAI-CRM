const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../services/db');
const { generateSchedule } = require('../services/scheduler');
const { addPublicationLog, getPublications, getPublicationsByProperty } = require('../services/publicationLog');
const { postToInstagram } = require('../services/instagramPublisher');

// Load environment variables
require('dotenv').config();

// ---------------------------------------------------------------------------
// Mapping helpers (DB row <-> API shape the frontend expects)
// ---------------------------------------------------------------------------

function toManualPostShape(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    scheduledDate: row.scheduledFor ? new Date(row.scheduledFor).toISOString() : null,
    type: row.type || 'just_listed',
    platforms: Array.isArray(row.platformsJson) ? row.platformsJson : [],
    content: row.contentJson || { caption: row.content || '', imageUrl: null },
    propertyId: row.propertyId || null,
    status: row.status || 'scheduled',
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null
  };
}

// Auto-generated posts carry a "day" (1/3/5/10). Recompute it relative to the
// first post of the schedule group so /property and / can reconstruct it.
function toAutoPostShape(row, anchorMs) {
  const base = toManualPostShape(row);
  const day = anchorMs
    ? Math.max(1, Math.round((new Date(row.scheduledFor).getTime() - anchorMs) / 86400000) + 1)
    : 1;
  return { ...base, day };
}

function normalizePlatforms(platforms) {
  return (platforms || []).map(p => {
    const platform = (typeof p === 'string') ? p : p.platform;
    return {
      id: p.id || uuidv4(),
      platform,
      enabled: p.enabled !== false,
      scheduled: p.scheduled !== false,
      scheduledTime: p.scheduledTime || null,
      published: false,
      publishedAt: null,
      link: null
    };
  });
}

// Resolve a post by postId (preferred) or by scheduleId + array index.
async function resolvePost(tenantId, scheduleId, postIndex, postId) {
  if (postId) {
    return prisma.scheduledPost.findFirst({ where: { id: postId, tenantId } });
  }
  const rows = await prisma.scheduledPost.findMany({
    where: { tenantId, scheduleId },
    orderBy: { createdAt: 'asc' }
  });
  return rows[parseInt(postIndex, 10)] || null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Create automatic schedule for a property (one DB row per generated post)
router.post('/create', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant no identificado' });
    }

    const { property, content, startDate } = req.body;

    if (!property) {
      return res.status(400).json({ error: 'Se requiere información de la propiedad' });
    }

    const scheduleId = uuidv4();
    const schedule = generateSchedule(property, content, startDate);

    for (const post of schedule.posts) {
      await prisma.scheduledPost.create({
        data: {
          id: post.id,
          tenantId,
          propertyId: property.id || null,
          scheduleId,
          title: post.title || 'Publicación Programada',
          description: post.description || '',
          type: post.type || 'just_listed',
          content: typeof post.content?.caption === 'string' ? post.content.caption : '',
          contentJson: post.content || undefined,
          platformsJson: post.platforms || [],
          platform: post.platforms?.[0]?.platform || 'instagram',
          scheduledFor: new Date(post.scheduledDate),
          status: 'scheduled'
        }
      });
    }

    console.log(`✅ Auto schedule created: ${scheduleId} (${schedule.posts.length} posts)`);

    res.json({
      success: true,
      scheduleId,
      schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get schedule for a property (reconstructed from DB)
router.get('/property/:propertyId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { propertyId } = req.params;

    const rows = await prisma.scheduledPost.findMany({
      where: { tenantId, propertyId },
      orderBy: { scheduledFor: 'asc' }
    });

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const anchorMs = rows[0].scheduledFor.getTime();
    const posts = rows.map(r => toAutoPostShape(r, anchorMs));
    const schedule = {
      propertyId,
      posts,
      totalPosts: posts.length,
      startDate: new Date(rows[0].scheduledFor).toISOString(),
      createdAt: new Date(rows[0].createdAt).toISOString()
    };

    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all schedules (grouped by scheduleId for auto schedules, standalone for manual)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const rows = await prisma.scheduledPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    const grouped = new Map();
    for (const row of rows) {
      const key = row.scheduleId || row.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }

    const schedules = Array.from(grouped.entries()).map(([key, group]) => {
      const anchorMs = group[0].scheduledFor.getTime();
      const posts = group.map(r => toAutoPostShape(r, anchorMs));
      return {
        id: key,
        propertyId: group[0].propertyId || null,
        schedule: {
          propertyId: group[0].propertyId || null,
          posts,
          totalPosts: posts.length
        },
        createdAt: new Date(group[0].createdAt).toISOString(),
        status: group.some(r => r.status === 'published') ? 'published' : 'scheduled'
      };
    });

    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all manual schedules (user-created)
router.get('/manual', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const rows = await prisma.scheduledPost.findMany({
      where: { tenantId, scheduleId: null, status: { not: 'cancelled' } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ posts: rows.map(toManualPostShape) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create manual schedule (YouTube-style picker)
router.post('/manual', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { title, description, scheduledDate, type, platforms, content, propertyId, status } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ error: 'Se requiere fecha de programación' });
    }

    if (!platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos una plataforma' });
    }

    const normalizedPlatforms = normalizePlatforms(platforms);

    const row = await prisma.scheduledPost.create({
      data: {
        tenantId,
        propertyId: propertyId || null,
        title: title || 'Publicación Programada',
        description: description || '',
        type: type || 'just_listed',
        content: typeof content?.caption === 'string' ? content.caption : '',
        contentJson: content || undefined,
        platformsJson: normalizedPlatforms,
        platform: normalizedPlatforms[0]?.platform || 'instagram',
        scheduledFor: new Date(scheduledDate),
        status: status || 'scheduled'
      }
    });

    console.log('✅ Manual schedule created:', row.id, '- Date:', scheduledDate);

    res.json({
      success: true,
      post: toManualPostShape(row)
    });
  } catch (error) {
    console.error('Error creating manual schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update manual schedule
router.put('/manual/:postId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { postId } = req.params;
    const updates = req.body;

    const existing = await prisma.scheduledPost.findFirst({ where: { id: postId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const data = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.scheduledDate !== undefined) data.scheduledFor = new Date(updates.scheduledDate);
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.propertyId !== undefined) data.propertyId = updates.propertyId || null;
    if (updates.content !== undefined) {
      data.contentJson = updates.content;
      if (typeof updates.content?.caption === 'string') data.content = updates.content.caption;
    }
    if (updates.platforms !== undefined) data.platformsJson = normalizePlatforms(updates.platforms);

    const row = await prisma.scheduledPost.update({ where: { id: postId }, data });

    res.json({ success: true, post: toManualPostShape(row) });
  } catch (error) {
    console.error('Error updating manual schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete manual schedule
router.delete('/manual/:postId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { postId } = req.params;

    const existing = await prisma.scheduledPost.findFirst({ where: { id: postId, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    await prisma.scheduledPost.delete({ where: { id: postId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting manual schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get publication history (tenant-scoped, from DB)
router.get('/history', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const publications = await getPublications(tenantId);
    res.json({ publications });
  } catch (error) {
    console.error('Error fetching publication history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get publication history by property (tenant-scoped)
router.get('/history/:propertyId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const publications = await getPublicationsByProperty(tenantId, req.params.propertyId);
    res.json({ publications });
  } catch (error) {
    console.error('Error fetching publication history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Publish a scheduled post to Instagram (REAL publishing)
router.post('/:scheduleId/publish/:postIndex', async (req, res) => {
  const tenantId = req.tenantId;
  const { scheduleId, postIndex } = req.params;
  const { imageUrl, postId } = req.body;

  console.log(`📤 Publish request - Schedule: ${scheduleId}, Post: ${postIndex}, Image: ${imageUrl}`);

  try {
    const row = await resolvePost(tenantId, scheduleId, postIndex, postId);
    if (!row) {
      console.log('❌ Post not found:', postId || `${scheduleId}/${postIndex}`);
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const platforms = Array.isArray(row.platformsJson) ? row.platformsJson : [];
    const instagramPlatform = platforms.find(p => p.platform === 'instagram' && p.enabled);

    if (!instagramPlatform) {
      console.log('❌ Instagram not enabled for this post');
      return res.status(400).json({ error: 'Instagram no está habilitado para esta publicación' });
    }

    // Validate imageUrl
    if (!imageUrl) {
      console.log('❌ No image URL provided');
      return res.status(400).json({ error: 'Se requiere URL de imagen para publicar en Instagram' });
    }

    // Get the access token from environment
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    console.log('🔑 Token exists:', !!accessToken);

    if (!accessToken) {
      throw new Error('Token de Instagram no configurado');
    }

    // Prepare the caption for Instagram (truncate to 2200 chars max)
    const content = row.contentJson || {};
    const caption = (typeof content.caption === 'string'
      ? content.caption
      : (row.content || 'Nueva propiedad disponible!')).substring(0, 2200);

    console.log('📝 Posting to Instagram with image:', imageUrl);
    console.log('📝 Caption:', caption.substring(0, 100) + '...');

    // Post to Instagram
    const result = await postToInstagram(accessToken, imageUrl, caption);

    console.log('📊 Instagram result:', result);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Persist the publication to the DB (history = ScheduledPost status='published')
    const updatedRow = await addPublicationLog(tenantId, row.propertyId, row, 'instagram', result);

    res.json({
      success: true,
      post: toManualPostShape(updatedRow),
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
router.post('/:scheduleId/cancel/:postIndex', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { scheduleId, postIndex } = req.params;
    const { postId } = req.body || {};

    const row = await resolvePost(tenantId, scheduleId, postIndex, postId);
    if (!row) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const updated = await prisma.scheduledPost.update({
      where: { id: row.id },
      data: { status: 'cancelled' }
    });

    res.json({
      success: true,
      post: toManualPostShape(updated)
    });
  } catch (error) {
    console.error('Error cancelling post:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
