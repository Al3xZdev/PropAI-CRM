// Assignment Service - Round-Robin Lead Distribution
const { prisma } = require('../services/db')

/**
 * Get all agents for a tenant
 */
async function getAgents(tenantId) {
  return await prisma.user.findMany({
    where: {
      tenantId,
      role: 'agent',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  })
}

/**
 * Get lead count for an agent in the last N days
 */
async function getAgentLeadCount(agentId, days = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  return await prisma.lead.count({
    where: {
      assignedTo: agentId,
      createdAt: { gte: startDate }
    }
  })
}

/**
 * Get total lead count for an agent (all time)
 */
async function getTotalLeadCount(agentId) {
  return await prisma.lead.count({
    where: {
      assignedTo: agentId
    }
  })
}

/**
 * Get workload statistics for all agents
 */
async function getWorkload(tenantId) {
  const agents = await getAgents(tenantId)
  
  const workload = await Promise.all(
    agents.map(async (agent) => {
      const totalLeads = await getTotalLeadCount(agent.id)
      const weekLeads = await getAgentLeadCount(agent.id, 7)
      const monthLeads = await getAgentLeadCount(agent.id, 30)
      
      // Get pending follow-ups for this agent's leads
const pendingFollowUps = await prisma.followUp.count({
        where: {
          lead: { assignedTo: agent.id },
          completedAt: null
        }
      })
      
      // Get leads by status for this agent
const statusCounts = await prisma.lead.groupBy({
        by: ['status'],
        where: { assignedTo: agent.id },
        _count: true
      })
      
      const leadsByStatus = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {})
      
      return {
        ...agent,
        stats: {
          totalLeads,
          weekLeads,
          monthLeads,
          pendingFollowUps,
          byStatus: leadsByStatus
        },
        // Calculate workload level based on lead count
        workloadLevel: totalLeads <= 5 ? 'baja' : totalLeads <= 10 ? 'media' : 'alta',
        workloadPct: Math.min(100, Math.round((totalLeads / 15) * 100)) // 15 leads = 100% carga
      }
    })
  )
  
  // Sort by total leads (ascending) - agents with fewer leads first
  workload.sort((a, b) => a.stats.totalLeads - b.stats.totalLeads)
return workload
}

/**
 * Assign lead to agent using Round-Robin
 * Returns the agent with the fewest leads
 */
async function assignLeadRoundRobin(tenantId, leadId) {
  // Get all active agents
const agents = await getAgents(tenantId)
  
  if (agents.length === 0) {
    throw new Error('No hay agentes disponibles para asignar')
  }
  
  // Get lead counts for all agents
const agentCounts = await Promise.all(
    agents.map(async (agent) => ({
      ...agent,
      leadCount: await getTotalLeadCount(agent.id)
    }))
  )
  
  // Sort by lead count (ascending)
  agentCounts.sort((a, b) => a.leadCount - b.leadCount)
  
  // Select agent with fewest leads
const selectedAgent = agentCounts[0]
  
  // Assign lead to selected agent
const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedTo: selectedAgent.id,
      assignedAt: new Date()
    },
    include: {
      assignedUser: {
        select: { name: true, email: true }
      }
    }
  })
  
  return {
    lead: updatedLead,
    assignedTo: selectedAgent,
    reason: `Round-Robin: ${selectedAgent.name} tiene ${selectedAgent.leadCount} leads (el menor)`
  }
}

/**
 * Manually assign lead to a specific agent
 */
async function assignLeadToAgent(leadId, agentId, tenantId) {
  // Verify agent exists and belongs to tenant
const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      tenantId,
      role: 'agent',
      isActive: true
    }
  })
  
  if (!agent) {
    throw new Error('Agente no encontrado o inactivo')
  }
  
  // Verify lead exists and belongs to tenant
const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId
    }
  })
  
  if (!lead) {
    throw new Error('Lead no encontrado')
  }
  
  // Update lead assignment
const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedTo: agentId,
      assignedAt: new Date()
    },
    include: {
      assignedUser: {
        select: { name: true, email: true }
      }
    }
  })
  
  return {
    lead: updatedLead,
    assignedTo: agent,
    reason: `Asignación manual: ${agent.name}`
  }
}

/**
 * Unassign lead (remove assignment)
 */
async function unassignLead(leadId, tenantId) {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId
    }
  })
  
  if (!lead) {
    throw new Error('Lead no encontrado')
  }
  
  return await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedTo: null,
      assignedAt: null
    }
  })
}

/**
 * Get leads for a specific agent
 */
async function getAgentLeads(agentId, tenantId, filters = {}) {
  const { status, propertyInterest, channel } = filters
  
  const where = {
    tenantId,
    assignedTo: agentId
  }
  
  if (status) where.status = status
  if (propertyInterest) where.propertyInterest = propertyInterest
  if (channel) where.channel = channel
  
  return await prisma.lead.findMany({
    where,
    include: {
      property: {
        select: { id: true, title: true, address: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

/**
 * Get unassigned leads for a tenant
 */
async function getUnassignedLeads(tenantId) {
  return await prisma.lead.findMany({
    where: {
      tenantId,
      assignedTo: null
    },
    include: {
      property: {
        select: { id: true, title: true, address: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

module.exports = {
  getAgents,
  getWorkload,
  assignLeadRoundRobin,
  assignLeadToAgent,
  unassignLead,
  getAgentLeads,
  getUnassignedLeads,
  getAgentLeadCount,
  getTotalLeadCount
}