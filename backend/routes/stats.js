const express = require("express");
const router  = express.Router();
const { prisma }             = require("../services/db");
const { requireAuth }        = require("../middleware/auth");
const { calculateScore }     = require("../services/leadScoringService");

/**
 * GET /api/stats/dashboard
 * Devuelve todos los datos que necesita el dashboard en una sola llamada
 */
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // rango del mes actual y anterior
    const now          = new Date();
    const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 1. leads
    const [allLeads, prevMonthLeads] = await Promise.all([
      prisma.lead.findMany({
        where: { tenantId },
        include: { property: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({
        where: { tenantId, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      }),
    ]);

    const thisMonthLeads = allLeads.filter(l => l.createdAt >= monthStart).length;
    const leadGrowth = prevMonthLeads > 0
      ? Math.round(((thisMonthLeads - prevMonthLeads) / prevMonthLeads) * 100)
      : 0;

    // scoring
    const leadsWithScore = allLeads.map(l => ({
      ...l,
      scoring: calculateScore(l),
    }));

    // top 5 por score
    const hotLeads = [...leadsWithScore]
      .sort((a, b) => b.scoring.score - a.scoring.score)
      .slice(0, 5);

    // 2. estados
    const statusCounts = allLeads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});

    // 3. conversión
    const closed     = allLeads.filter(l => l.status === "cerrado").length;
    const convRate   = allLeads.length > 0
      ? parseFloat(((closed / allLeads.length) * 100).toFixed(1))
      : 0;

    // conversión mes anterior
    const prevClosed = await prisma.lead.count({
      where: { tenantId, status: "cerrado", createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
    });
    const prevTotal  = prevMonthLeads;
    const prevRate   = prevTotal > 0 ? parseFloat(((prevClosed / prevTotal) * 100).toFixed(1)) : 0;

    // 4. propiedades
    const properties = await prisma.property.findMany({
      where:   { tenantId },
      select:  { id: true, propertyType: true },
    });

    const propByType = properties.reduce((acc, p) => {
      const type = p.propertyType || "Sin tipo";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 5. interés por tipo
    const interestByType = allLeads.reduce((acc, l) => {
      const type = l.property?.propertyType || l.propertyType || "Sin tipo";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const totalLeadsWithType = Object.values(interestByType).reduce((a, b) => a + b, 0);
    const interestChart = Object.entries(interestByType)
      .map(([type, count]) => ({
        type,
        count,
        pct: totalLeadsWithType > 0 ? Math.round((count / totalLeadsWithType) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 6. por canal
    const byChannel = allLeads.reduce((acc, l) => {
      const ch = l.channel || "otro";
      acc[ch] = (acc[ch] || 0) + 1;
      return acc;
    }, {});

    // 7. follow-ups de hoy / mañana / vencidas / semana
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const tmrwStart  = new Date(); tmrwStart.setDate(tmrwStart.getDate() + 1); tmrwStart.setHours(0, 0, 0, 0);
    const tmrwEnd    = new Date(tmrwStart); tmrwEnd.setHours(23, 59, 59, 999);

    // pendientes + completadas hoy (para mostrarlas tachadas)
    const activeOrCompletedToday = {
      OR: [
        { completedAt: null },
        { completedAt: { gte: todayStart } },
      ],
    };

    const [todayFU, tomorrowFU, overdueFU, weekFU] = await Promise.all([
      prisma.followUp.findMany({
        where: { tenantId, scheduledAt: { gte: todayStart, lte: todayEnd }, ...activeOrCompletedToday },
        include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.followUp.findMany({
        where: { tenantId, scheduledAt: { gte: tmrwStart, lte: tmrwEnd }, ...activeOrCompletedToday },
        include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.followUp.findMany({
        where: { tenantId, scheduledAt: { lt: todayStart }, ...activeOrCompletedToday },
        include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.followUp.findMany({
        where: { tenantId, scheduledAt: { gte: tmrwEnd }, ...activeOrCompletedToday },
        include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    // 8. accesos rápidos
    const newLeadsCount    = statusCounts["nuevo"] || 0;
    const closedLeadsCount = statusCounts["cerrado"] || 0;

    res.json({
      leads: {
        total:      allLeads.length,
        growth:     leadGrowth,
        thisMonth:  thisMonthLeads,
        prevMonth:  prevMonthLeads,
        byStatus:   statusCounts,
        byChannel,
        hot:        hotLeads,
      },
      conversion: {
        rate:     convRate,
        prevRate,
        diff:     parseFloat((convRate - prevRate).toFixed(1)),
      },
      properties: {
        total:   properties.length,
        byType:  propByType,
      },
      interestChart,
      followUps: {
        today:    todayFU,
        tomorrow: tomorrowFU,
        overdue:  overdueFU,
        week:     weekFU,
      },
      quickActions: {
        newLeads:    newLeadsCount,
        closedLeads: closedLeadsCount,
      },
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats/agents
 * Analíticas reales por agente: revenue, conversión, días de cierre, pipeline y tendencia semanal.
 */
router.get("/agents", requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const agents = await prisma.user.findMany({
      where: { tenantId, role: 'agent', isActive: true },
      select: { id: true, name: true, email: true, phone: true },
    });

    const agentIds = agents.map(a => a.id);

    const [leads, commissions, closeHistory] = await Promise.all([
      prisma.lead.findMany({
        where: { tenantId, assignedTo: { in: agentIds } },
        select: { id: true, assignedTo: true, status: true, createdAt: true },
      }),
      prisma.commission.groupBy({
        by: ['agentId'],
        where: { tenantId, agentId: { in: agentIds } },
        _sum: { amount: true },
      }),
      prisma.leadStatusHistory.findMany({
        where: { tenantId, newStatus: 'cerrado', lead: { assignedTo: { in: agentIds } } },
        select: { leadId: true, createdAt: true },
      }),
    ]);

    // fecha de cierre más temprana por lead
    const closedByLead = new Map();
    for (const h of closeHistory) {
      const current = closedByLead.get(h.leadId);
      if (!current || h.createdAt < current) closedByLead.set(h.leadId, h.createdAt);
    }

    const commissionByAgent = new Map();
    for (const c of commissions) {
      commissionByAgent.set(c.agentId, Number(c._sum?.amount || 0));
    }

    // ventana de 7 días (día 0 = hace 6 días, día 6 = hoy)
    const dayStart = (offsetDays) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const trendWindows = Array.from({ length: 7 }, (_, i) => {
      const start = dayStart(i - 6);
      return { start, end: new Date(start.getTime() + 86400000) };
    });

    const result = agents.map(agent => {
      const agentLeads = leads.filter(l => l.assignedTo === agent.id);
      const totalLeads = agentLeads.length;
      const closedLeads = agentLeads.filter(l => l.status === 'cerrado').length;

      const pipeline = {};
      for (const l of agentLeads) {
        pipeline[l.status] = (pipeline[l.status] || 0) + 1;
      }

      const weeklyTrend = trendWindows.map(({ start, end }) =>
        agentLeads.filter(l => l.createdAt >= start && l.createdAt < end).length
      );

      const closeDays = agentLeads
        .map(l => {
          const closedAt = closedByLead.get(l.id);
          if (!closedAt) return null;
          const days = (closedAt - l.createdAt) / 86400000;
          return days >= 0 ? days : null;
        })
        .filter(d => d !== null);

      const avgCloseDays = closeDays.length > 0
        ? parseFloat((closeDays.reduce((sum, d) => sum + d, 0) / closeDays.length).toFixed(1))
        : 0;

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        revenue: commissionByAgent.get(agent.id) || 0,
        totalLeads,
        closedLeads,
        conversionRate: totalLeads > 0 ? parseFloat(((closedLeads / totalLeads) * 100).toFixed(1)) : 0,
        avgCloseDays,
        pipeline,
        weeklyTrend,
      };
    });

    res.json({ agents: result });
  } catch (err) {
    console.error("Error fetching agent stats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;