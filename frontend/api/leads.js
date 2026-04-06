// Leads API Route for Vercel
// GET /api/leads - List all (with optional filters)
// POST /api/leads - Create new
// GET /api/leads/:id - Get one
// PUT /api/leads/:id/status - Update status
// POST /api/leads/:id/followup - Send follow-up
// GET /api/leads/:id/timeline - Get follow-up timeline
// GET /api/leads/stats/summary - Get stats
// DELETE /api/leads/:id - Delete

const { getLeads, uuidv4, generateFollowUpMessage } = require('../lib/services');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const leads = getLeads();
  const url = req.url || '';
  
  // Parse path to extract id and subpath
  const match = url.match(/\/api\/leads\/([^/]+)(\/.*)?$/);
  const id = match ? match[1] : null;
  const subpath = match && match[2] ? match[2] : null;

  try {
    // Stats route
    if (url.includes('/stats/summary')) {
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
      
      return res.json(stats);
    }

    switch (req.method) {
      case 'GET':
        if (id) {
          // Get single lead
          const lead = leads.get(id);
          if (!lead) {
            return res.status(404).json({ error: 'Lead no encontrado' });
          }

          // Timeline subroute
          if (subpath === '/timeline') {
            const timeline = [
              { day: 1, label: 'Día 1', description: 'Mensaje de bienvenida', status: 'sent' },
              { day: 3, label: 'Día 3', description: 'Información adicional', status: 'pending' },
              { day: 7, label: 'Día 7', description: 'Seguimiento personalizado', status: 'pending' },
              { day: 14, label: 'Día 14', description: 'Último intento / Oferta especial', status: 'pending' }
            ];

            lead.followUps.forEach(fu => {
              const idx = timeline.findIndex(t => t.day === fu.day);
              if (idx !== -1) {
                timeline[idx].status = 'sent';
                timeline[idx].sentAt = fu.sentAt;
                timeline[idx].channel = fu.channel;
                timeline[idx].message = fu.message;
              }
            });

            return res.json({ timeline, lead });
          }

          return res.json({ lead });
        }

        // Get all leads with optional filters
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
        
        allLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return res.json({ leads: allLeads });

      case 'POST':
        // Create new lead or send follow-up
        if (id && subpath === '/followup') {
          // Send follow-up message
          const lead = leads.get(id);
          if (!lead) {
            return res.status(404).json({ error: 'Lead no encontrado' });
          }

          const { day, channel, message } = req.body;
          const generatedMessage = message || generateFollowUpMessage(lead, day, channel);
          
          const followUp = {
            day: day || lead.followUps.length + 1,
            sentAt: new Date().toISOString(),
            channel: channel || 'whatsapp',
            message: generatedMessage
          };

          lead.followUps.push(followUp);
          lead.lastContact = new Date().toISOString();
          
          leads.set(id, lead);

          return res.json({ success: true, followUp, lead });
        }

        // Create new lead
        const { name, email, phone, channel: leadChannel, propertyInterest, propertyId, propertyTitle, source, notes } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const newLead = {
          id: uuidv4(),
          name,
          email: email || '',
          phone: phone || '',
          channel: leadChannel || 'formulario',
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

        leads.set(newLead.id, newLead);

        return res.status(201).json({ success: true, lead: newLead });

      case 'PUT':
        if (!id) {
          return res.status(400).json({ error: 'ID requerido' });
        }

        const leadToUpdate = leads.get(id);
        if (!leadToUpdate) {
          return res.status(404).json({ error: 'Lead no encontrado' });
        }

        // Update status
        if (subpath === '/status') {
          const { status } = req.body;
          const previousStatus = leadToUpdate.status;
          
          if (!leadToUpdate.statusHistory) leadToUpdate.statusHistory = [];
          leadToUpdate.statusHistory.push({
            from: previousStatus,
            to: status,
            changedAt: new Date().toISOString()
          });
          
          leadToUpdate.status = status;
          leadToUpdate.lastContact = new Date().toISOString();
          leadToUpdate.updatedAt = new Date().toISOString();
          
          leads.set(id, leadToUpdate);

          return res.json({ success: true, lead: leadToUpdate, previousStatus });
        }

        // Generic update
        const updatedLead = {
          ...leadToUpdate,
          ...req.body,
          id: leadToUpdate.id,
          createdAt: leadToUpdate.createdAt,
          updatedAt: new Date().toISOString()
        };

        leads.set(id, updatedLead);
        
        return res.json({ success: true, lead: updatedLead });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'ID requerido' });
        }
        
        if (!leads.has(id)) {
          return res.status(404).json({ error: 'Lead no encontrado' });
        }
        
        leads.delete(id);
        
        return res.json({ success: true, message: 'Lead eliminado' });

      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('Leads API Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
