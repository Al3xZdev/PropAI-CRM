const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'leads.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load leads from file
let leads = new Map();
function loadLeads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      leads = new Map(Object.entries(data));
      console.log(`Loaded ${leads.size} leads from file`);
    }
  } catch (err) {
    console.error('Error loading leads:', err);
    leads = new Map();
  }
}

function saveLeads() {
  try {
    const data = Object.fromEntries(leads);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving leads:', err);
  }
}

// Initialize with sample leads if empty
function initializeSampleLeads() {
  if (leads.size === 0) {
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
        notes: 'Primera vez compranding casa, necesita guía',
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
        notes: 'Muy interessada en la ubicación',
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
    saveLeads();
    console.log(`Initialized ${sampleLeads.length} sample leads`);
  }
}

// Initialize
loadLeads();
initializeSampleLeads();

// Get all leads
router.get('/', (req, res) => {
  const { propertyInterest, status, channel } = req.query;
  let allLeads = Array.from(leads.values());
  
  if (propertyInterest) {
    allLeads = allLeads.filter(l => l.propertyInterest === propertyInterest);
  }
  if (status) {
    allLeads = allLeads.filter(l => l.status === status);
  }
  if (channel) {
    allLeads = allLeads.filter(l => l.channel === channel);
  }
  
  // Sort by createdAt descending
  allLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ leads: allLeads });
});

// Get lead by ID
router.get('/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }
  res.json({ lead });
});

// Create new lead
router.post('/', (req, res) => {
  const { name, email, phone, channel, propertyInterest, propertyId, propertyTitle, source, notes } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  const lead = {
    id: uuidv4(),
    name,
    email: email || '',
    phone: phone || '',
    channel: channel || 'formulario',
    status: 'nuevo',
    propertyInterest: propertyInterest || 'casa',
    propertyId: propertyId || null,
    propertyTitle: propertyTitle || '',
    source: source || 'Manual',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    lastContact: null,
    followUps: []
  };

  leads.set(lead.id, lead);
  saveLeads();

  res.status(201).json({ success: true, lead });
});

// Update lead status
router.put('/:id/status', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  const { status } = req.body;
  const previousStatus = lead.status;
  
  // Add to status history
  if (!lead.statusHistory) lead.statusHistory = [];
  lead.statusHistory.push({
    from: previousStatus,
    to: status,
    changedAt: new Date().toISOString()
  });
  
  lead.status = status;
  lead.lastContact = new Date().toISOString();
  lead.updatedAt = new Date().toISOString();
  
  leads.set(lead.id, lead);
  saveLeads();

  res.json({ success: true, lead, previousStatus });
});

// Send follow-up message
router.post('/:id/followup', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  const { day, channel, message } = req.body;
  
  // Simulate AI-generated message if not provided
  const generatedMessage = message || generateFollowUpMessage(lead, day, channel);
  
  const followUp = {
    day: day || lead.followUps.length + 1,
    sentAt: new Date().toISOString(),
    channel: channel || 'whatsapp',
    message: generatedMessage
  };

  lead.followUps.push(followUp);
  lead.lastContact = new Date().toISOString();
  
  leads.set(lead.id, lead);
  saveLeads();

  res.json({ success: true, followUp, lead });
});

// Get follow-up timeline for a lead
router.get('/:id/timeline', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  // Generate full timeline (days 1, 3, 7, 14)
  const timeline = [
    { day: 1, label: 'Día 1', description: 'Mensaje de bienvenida', status: 'sent' },
    { day: 3, label: 'Día 3', description: 'Información adicional', status: 'pending' },
    { day: 7, label: 'Día 7', description: 'Seguimiento personalizado', status: 'pending' },
    { day: 14, label: 'Día 14', description: 'Último intento / Oferta especial', status: 'pending' }
  ];

  // Mark sent follow-ups
  lead.followUps.forEach(fu => {
    const idx = timeline.findIndex(t => t.day === fu.day);
    if (idx !== -1) {
      timeline[idx].status = 'sent';
      timeline[idx].sentAt = fu.sentAt;
      timeline[idx].channel = fu.channel;
      timeline[idx].message = fu.message;
    }
  });

  res.json({ timeline, lead });
});

// Get statistics
router.get('/stats/summary', (req, res) => {
  const allLeads = Array.from(leads.values());
  
  const stats = {
    total: allLeads.length,
    nuevos: allLeads.filter(l => l.status === 'nuevo').length,
    contactados: allLeads.filter(l => l.status === 'contactado').length,
    respondieron: allLeads.filter(l => l.status === 'respondio').length,
    perdidos: allLeads.filter(l => l.status === 'perdido').length,
    byChannel: {
      whatsapp: allLeads.filter(l => l.channel === 'whatsapp').length,
      email: allLeads.filter(l => l.channel === 'email').length,
      formulario: allLeads.filter(l => l.channel === 'formulario').length,
      instagram: allLeads.filter(l => l.channel === 'instagram').length
    },
    byPropertyType: {
      casa: allLeads.filter(l => l.propertyInterest === 'casa').length,
      departamento: allLeads.filter(l => l.propertyInterest === 'departamento').length,
      terreno: allLeads.filter(l => l.propertyInterest === 'terreno').length,
      local: allLeads.filter(l => l.propertyInterest === 'local').length,
      oficina: allLeads.filter(l => l.propertyInterest === 'oficina').length
    }
  };

  res.json(stats);
});

// Helper: Generate AI-like follow-up message
function generateFollowUpMessage(lead, day, channel) {
  const messages = {
    1: [
      `¡Hola ${lead.name}! Gracias por tu interés en nuestra propiedad. He preparado información exclusiva sobre ${lead.propertyTitle || 'las propiedades disponibles'}. ¿Te gustaría recibir más detalles?`,
      `Hola ${lead.name}, recibe una cálida bienvenida. Vi que te interesa nuestra oferta en ${lead.propertyTitle || 'el sector inmobiliario'}. Estoy aquí para ayudarte con cualquier pregunta.`,
      `¡${lead.name}! Qué alegría que contactes con nosotros. He creado un dossier especial con todo lo que necesitas saber sobre ${lead.propertyTitle || 'esta oportunidad'}. ¿Cuándo podemos hablar?`
    ],
    3: [
      `¡Hola ${lead.name}!Espero que hayas recibido mi mensaje anterior. He preparado un video tour de ${lead.propertyTitle || 'la propiedad'} donde puedes ver cada rincón. ¿Te gustaría verlo?`,
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
      `${lead.name}, entiendo que a veces el timing no es el ideal. Si en el futuro buscas property en ${lead.propertyTitle || 'esta zona'}, aquí estaré. Esta es una puerta que nunca se cierra del todo. Un abrazo.`
    ]
  };

  const dayMessages = messages[day] || messages[1];
  return dayMessages[Math.floor(Math.random() * dayMessages.length)];
}

// Delete lead
router.delete('/:id', (req, res) => {
  if (!leads.has(req.params.id)) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }
  
  leads.delete(req.params.id);
  saveLeads();
  
  res.json({ success: true, message: 'Lead eliminado' });
});

module.exports = router;
