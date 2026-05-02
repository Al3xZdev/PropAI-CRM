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
        orderBy: { updatedAt: "desc" },
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
      where: { tenantId, status: "cerrado", updatedAt: { gte: prevMonthStart, lte: prevMonthEnd } },
    });
    const prevTotal  = prevMonthLeads;
    const prevRate   = prevTotal > 0 ? parseFloat(((prevClosed / prevTotal) * 100).toFixed(1)) : 0;

    // 4. propiedades
    const properties = await prisma.property.findMany({
      where:   { tenantId },
      select:  { id: true, type: true, status: true },
    });

    const propByType = properties.reduce((acc, p) => {
      const type = p.type || "Sin tipo";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 5. interés por tipo
    const interestByType = allLeads.reduce((acc, l) => {
      const type = l.property?.type || l.propertyType || "Sin tipo";
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

    // 7. follow-ups de hoy
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const tmrwStart  = new Date(); tmrwStart.setDate(tmrwStart.getDate() + 1); tmrwStart.setHours(0, 0, 0, 0);
    const tmrwEnd    = new Date(tmrwStart); tmrwEnd.setHours(23, 59, 59, 999);

    const [todayFU, tomorrowFU, overdueFU] = await Promise.all([
      prisma.followUp.findMany({
        where: { tenantId, completedAt: null, scheduledAt: { gte: todayStart, lte: todayEnd } },
        include: { lead: { select: { id: true, name: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.followUp.findMany({
        where: { tenantId, completedAt: null, scheduledAt: { gte: tmrwStart, lte: tmrwEnd } },
        include: { lead: { select: { id: true, name: true } } },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.followUp.findMany({
        where: { tenantId, completedAt: null, scheduledAt: { lt: todayStart } },
        include: { lead: { select: { id: true, name: true } } },
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

module.exports = router;