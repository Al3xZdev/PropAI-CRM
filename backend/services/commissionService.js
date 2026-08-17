// Commission service - Comisión automática por cierre de lead
const { prisma } = require('../services/db');
const { createCommissionNotifications } = require('../routes/commissions');

const DEFAULT_COMMISSION_PERCENTAGE = 3.0;

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

/**
 * Resuelve una propiedad desde la tabla Prisma Property (fuente única de la app).
 * El archivo JSON backend/data/properties.json es legacy y ya no se consulta.
 */
async function resolveProperty(propertyId, tenantId) {
  if (!propertyId) return null;

  const dbProperty = await prisma.property.findFirst({
    where: { id: propertyId, tenantId }
  });
  return dbProperty ? { id: dbProperty.id, title: dbProperty.title, price: Number(dbProperty.price) || 0 } : null;
}

/**
 * Crea automáticamente una comisión cuando un lead pasa a estado 'cerrado'.
 * Best-effort: devuelve { created: false, reason } cuando no corresponde crear.
 */
async function createCommissionForClosedLead(lead, tenantId) {
  if (!lead || !tenantId) {
    return { created: false, reason: 'invalid_lead' };
  }

  const existing = await prisma.commission.findFirst({
    where: { leadId: lead.id, tenantId }
  });
  if (existing) {
    return { created: false, reason: 'already_exists' };
  }

  if (!lead.assignedTo) {
    return { created: false, reason: 'no_agent' };
  }

  let property = null;
  if (lead.propertyId) {
    property = await resolveProperty(lead.propertyId, tenantId);
  }

  const propertyTitle = lead.propertyTitle || property?.title || null;
  const propertyPrice = Number(property?.price) || 0;

  const config = await prisma.agentCommissionConfig.findUnique({
    where: { tenantId_agentId: { tenantId, agentId: lead.assignedTo } }
  });
  const percentage = Number(config?.percentage) || DEFAULT_COMMISSION_PERCENTAGE;

  if (!propertyPrice || propertyPrice <= 0) {
    return { created: false, reason: 'no_property_price' };
  }

  const amount = Math.round(propertyPrice * percentage / 100 * 100) / 100;

  const commission = await prisma.commission.create({
    data: {
      tenantId,
      leadId: lead.id,
      agentId: lead.assignedTo,
      propertyId: property?.id || null,
      propertyTitle,
      propertyPrice,
      percentage,
      amount,
      notes: `Comisión automática por cierre de lead ${lead.name}. Propiedad: ${propertyTitle || 'sin especificar'} (${formatNumber(propertyPrice)}). ${formatNumber(percentage)}% de ${formatNumber(propertyPrice)} = ${formatNumber(amount)}.`,
      status: 'pending'
    }
  });

  createCommissionNotifications(commission, tenantId).catch(err => {
    console.warn('Error creating commission notifications:', err);
  });

  return { created: true, commission };
}

module.exports = { createCommissionForClosedLead };
