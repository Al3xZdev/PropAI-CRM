// Assignment Routes - Lead Assignment Management
const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const assignmentService = require('../services/assignmentService')
const permissionsService = require('../services/permissionsService')

// Middleware to check if user can assign leads
async function requireAssignPermission(req, res, next) {
  const hasPermission = await permissionsService.hasPermission(req.userId, 'leads', 'assign')
  if (!hasPermission) {
    return res.status(403).json({ error: 'No tienes permiso para asignar leads' })
  }
  next()
}

// Middleware to check if user can view leads (for workload, agents list)
async function requireReadLeads(req, res, next) {
  const hasPermission = await permissionsService.hasPermission(req.userId, 'leads', 'read')
  if (!hasPermission) {
    return res.status(403).json({ error: 'No tienes permiso para ver leads' })
  }
  next()
}

/**
 * GET /api/assignment/agents
 * Get all agents for the current tenant
 */
router.get('/agents', requireAuth, requireReadLeads, async (req, res) => {
  try {
    const agents = await assignmentService.getAgents(req.tenantId)
    res.json({ agents })
  } catch (err) {
    console.error('Error getting agents:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/assignment/workload
 * Get workload statistics for all agents
 */
router.get('/workload', requireAuth, requireReadLeads, async (req, res) => {
  try {
    const workload = await assignmentService.getWorkload(req.tenantId)
    res.json({ workload })
  } catch (err) {
    console.error('Error getting workload:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/assignment/unassigned
 * Get all unassigned leads
 */
router.get('/unassigned', requireAuth, requireReadLeads, async (req, res) => {
  try {
    const leads = await assignmentService.getUnassignedLeads(req.tenantId)
    res.json({ leads })
  } catch (err) {
    console.error('Error getting unassigned leads:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/assignment/agents/:agentId/leads
 * Get leads assigned to a specific agent
 */
router.get('/agents/:agentId/leads', requireAuth, requireReadLeads, async (req, res) => {
  try {
    const { status, propertyInterest, channel } = req.query
    const leads = await assignmentService.getAgentLeads(
      req.params.agentId,
      req.tenantId,
      { status, propertyInterest, channel }
    )
    res.json({ leads })
  } catch (err) {
    console.error('Error getting agent leads:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/assignment/round-robin/:leadId
 * Assign lead to agent using Round-Robin
 */
router.post('/round-robin/:leadId', requireAuth, requireAssignPermission, async (req, res) => {
  try {
    const result = await assignmentService.assignLeadRoundRobin(
      req.tenantId,
      req.params.leadId
    )
    res.json(result)
  } catch (err) {
    console.error('Error in round-robin assignment:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/assignment/assign/:leadId
 * Manually assign lead to a specific agent
 */
router.post('/assign/:leadId', requireAuth, requireAssignPermission, async (req, res) => {
  try {
    const { agentId } = req.body
    
    if (!agentId) {
      return res.status(400).json({ error: 'agentId es requerido' })
    }
    
    const result = await assignmentService.assignLeadToAgent(
      req.params.leadId,
      agentId,
      req.tenantId
    )
    res.json(result)
  } catch (err) {
    console.error('Error in manual assignment:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/assignment/unassign/:leadId
 * Unassign lead (remove assignment)
 */
router.post('/unassign/:leadId', requireAuth, requireAssignPermission, async (req, res) => {
  try {
    const result = await assignmentService.unassignLead(
      req.params.leadId,
      req.tenantId
    )
    res.json({ success: true, lead: result })
  } catch (err) {
    console.error('Error unassigning lead:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/assignment/auto-assign
 * Auto-assign multiple unassigned leads using Round-Robin
 */
router.post('/auto-assign', requireAuth, requireAssignPermission, async (req, res) => {
  try {
    const { count = 10 } = req.body
    
    // Get unassigned leads
const unassignedLeads = await assignmentService.getUnassignedLeads(req.tenantId)
    
    if (unassignedLeads.length === 0) {
      return res.json({ message: 'No hay leads sin asignar', assigned: 0 })
    }
    
    // Limit to requested count
const leadsToAssign = unassignedLeads.slice(0, count)
    
    const results = []
    for (const lead of leadsToAssign) {
      try {
        const result = await assignmentService.assignLeadRoundRobin(
          req.tenantId,
          lead.id
        )
        results.push(result)
      } catch (err) {
        console.error(`Error assigning lead ${lead.id}:`, err)
      }
    }
    
    res.json({
      message: `${results.length} leads asignados automáticamente`,
      assigned: results.length,
      results
    })
  } catch (err) {
    console.error('Error in auto-assign:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router