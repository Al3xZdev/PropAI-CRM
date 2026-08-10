const express = require("express");
const router  = express.Router();
const { prisma }      = require("../services/db");
const { requireAuth } = require("../middleware/auth");

// helpers de rango de fechas
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function tomorrowRange() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * GET /api/followups
 * Query params:
 *   range = "today" | "tomorrow" | "overdue" | "all"
 *   leadId = string (opcional, filtrar por lead)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { range = "today", leadId } = req.query;

    const where = {
      tenantId:    req.tenantId,
      completedAt: null,
    };

    if (leadId) where.leadId = leadId;

    if (range === "today") {
      const { start, end } = todayRange();
      where.scheduledAt = { gte: start, lte: end };
    } else if (range === "tomorrow") {
      const { start, end } = tomorrowRange();
      where.scheduledAt = { gte: start, lte: end };
    } else if (range === "overdue") {
      where.scheduledAt = { lt: new Date(new Date().setHours(0, 0, 0, 0)) };
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    res.json({ followUps });
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/followups
 * Body: { leadId, type, note, scheduledAt }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { leadId, type, note, scheduledAt } = req.body;

    if (!leadId || !type || !scheduledAt) {
      return res.status(400).json({ error: "leadId, type y scheduledAt son requeridos" });
    }

    const validTypes = ["call", "whatsapp", "email", "visit", "quote", "note"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Tipo inválido. Válidos: ${validTypes.join(", ")}` });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId },
    });
    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    const followUp = await prisma.followUp.create({
      data: {
        tenantId:    req.tenantId,
        leadId,
        createdBy:   req.userId,
        type,
        note:        note || null,
        scheduledAt: new Date(scheduledAt),
      },
      include: {
        lead: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ followUp });
  } catch (err) {
    console.error("Error creating follow-up:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/followups/:id/complete
 * Marca un follow-up como completado
 */
router.patch("/:id/complete", requireAuth, async (req, res) => {
  try {
    console.log('[FollowUp] Complete request:', req.params.id)
    console.log('[FollowUp] Tenant:', req.tenantId)
    console.log('[FollowUp] User:', req.user?.id)
    
    const existing = await prisma.followUp.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    
    if (!existing) {
      console.log('[FollowUp] Not found, checking without tenant...')
      // Try finding without tenant filter for debugging
const anyFollowUp = await prisma.followUp.findUnique({
        where: { id: req.params.id }
      })
      console.log('[FollowUp] Exists in DB:', anyFollowUp ? 'yes' : 'no')
      console.log('[FollowUp] Existing tenantId:', anyFollowUp?.tenantId)
      
      return res.status(404).json({ error: "Follow-up no encontrado" });
    }

    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data:  { completedAt: new Date() },
    });

    res.json({ followUp });
  } catch (err) {
    console.error("Error completing follow-up:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/followups/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.followUp.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Follow-up no encontrado" });

    await prisma.followUp.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;