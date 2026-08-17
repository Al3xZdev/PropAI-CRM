// Property Sync Service
// Las propiedades viven SOLO en la tabla Prisma Property.
// Esta función verifica que una propiedad exista antes de insertar
// un Lead.propertyId / Commission.propertyId (FK).
const { prisma } = require('../services/db');

/**
 * Devuelve la propiedad existente en la tabla Prisma Property, o null.
 * El archivo JSON backend/data/properties.json es legacy y ya no se usa.
 * @returns {Promise<object|null>} la propiedad de Prisma, o null si no existe
 */
async function ensurePropertyInPrisma(propertyId, tenantId) {
  if (!propertyId) return null;

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, tenantId }
  });
  return existing || null;
}

module.exports = { ensurePropertyInPrisma };
