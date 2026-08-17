// Publication log service — Prisma-backed, tenant-scoped.
// History records live on ScheduledPost rows with status='published'.
const { prisma } = require('../services/db');

function toLogShape(row) {
  return {
    id: row.id,
    propertyId: row.propertyId || null,
    propertyTitle: row.property?.title || null,
    postTitle: row.title,
    postType: row.type,
    platform: row.platform,
    publishedAt: row.publishedAt
      ? new Date(row.publishedAt).toISOString()
      : (row.sentAt ? new Date(row.sentAt).toISOString() : null),
    status: 'published'
  };
}

/**
 * Mark a scheduled post as published (Instagram flow).
 * Enriches the platform entry with published/publishedAt/link and persists.
 * Returns the updated row (with property relation).
 */
async function addPublicationLog(tenantId, propertyId, post, platform, instagramResult) {
  const now = new Date();
  const currentPlatforms = Array.isArray(post.platformsJson) ? post.platformsJson : [];
  const platforms = currentPlatforms.map(p => {
    if (p.platform === platform) {
      return {
        ...p,
        published: true,
        publishedAt: now.toISOString(),
        link: instagramResult?.postId
          ? `https://instagram.com/p/${instagramResult.postId}`
          : (p.link || null)
      };
    }
    return p;
  });

  return prisma.scheduledPost.update({
    where: { id: post.id },
    data: {
      status: 'published',
      publishedAt: now,
      sentAt: now,
      platform,
      propertyId: propertyId || post.propertyId || null,
      platformsJson: platforms
    },
    include: { property: { select: { title: true } } }
  });
}

/**
 * Get all published records for a tenant (newest first).
 */
async function getPublications(tenantId) {
  const rows = await prisma.scheduledPost.findMany({
    where: { tenantId, status: 'published', publishedAt: { not: null } },
    include: { property: { select: { title: true } } },
    orderBy: { publishedAt: 'desc' }
  });
  return rows.map(toLogShape);
}

/**
 * Get published records for a tenant + property (newest first).
 */
async function getPublicationsByProperty(tenantId, propertyId) {
  const rows = await prisma.scheduledPost.findMany({
    where: { tenantId, propertyId, status: 'published', publishedAt: { not: null } },
    include: { property: { select: { title: true } } },
    orderBy: { publishedAt: 'desc' }
  });
  return rows.map(toLogShape);
}

module.exports = {
  addPublicationLog,
  getPublications,
  getPublicationsByProperty
};
