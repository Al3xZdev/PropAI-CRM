// Lead Scoring Service - Sistema de puntuación basado en reglas
function calculateScore(lead) {
  let score = 0;

  // Datos básicos (+10 cada uno)
if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.propertyId) score += 15;

  // Estado del lead
const statusPoints = {
    respondio: 20,
    visit_agendada: 30,
    visita_realizada: 40,
    cerrado: 25,
  };
  score += statusPoints[lead.status] || 0;

  // Antigüedad del lead (recencia)
const leadUpdatedAt = lead.updatedAt ? new Date(lead.updatedAt).getTime() : Date.now();
  const daysSinceUpdate = (Date.now() - leadUpdatedAt) / 86400000;
  if (daysSinceUpdate < 3) score += 20;
  else if (daysSinceUpdate < 7) score += 10;

  // Canal (WhatsApp es más directo)
if (lead.channel === 'whatsapp') score += 10;

  // Determinar temperatura
let temp, label;
  if (score >= 60) {
    temp = 'hot';
    label = 'Caliente';
  } else if (score >= 30) {
    temp = 'warm';
    label = 'Tibio';
  } else {
    temp = 'cold';
    label = 'Frío';
  }

  return { score, temp, label };
}

module.exports = { calculateScore };