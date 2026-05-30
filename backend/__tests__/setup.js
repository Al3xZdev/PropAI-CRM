// Test Setup — Helpers compartidos para todos los tests
// Vitest corre esto UNA SOLA VEZ (singleFork + setupFiles)
const supertest = require('supertest')
const bcrypt = require('bcryptjs')
const { prisma } = require('../services/db')
const { app } = require('../server')

const TEST_ADMIN = { email: 'test-admin@demo.com', password: 'Test123456', name: 'Test Admin', role: 'admin' }
const TEST_AGENT = { email: 'test-agent@demo.com', password: 'Test123456', name: 'Test Agent', role: 'agent' }

// Agentes supertest que mantienen cookies entre requests
const adminAgent = supertest.agent(app)
const agentAgent = supertest.agent(app)
// Sin auth: usar supertest(app) directo (sin agente) para no persistir cookies
const unauthApp = supertest(app)

async function ensureTestUsers() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } })
  if (!tenant) throw new Error('Tenant demo no encontrado — correr seed.js primero')

  // Crear o actualizar admin de test (upsert evita race conditions)
  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12)

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: TEST_ADMIN.email } },
    update: { name: TEST_ADMIN.name, role: TEST_ADMIN.role, isActive: true },
    create: {
      tenantId: tenant.id,
      email: TEST_ADMIN.email,
      passwordHash,
      name: TEST_ADMIN.name,
      role: TEST_ADMIN.role
    }
  })

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: TEST_AGENT.email } },
    update: { name: TEST_AGENT.name, role: TEST_AGENT.role, isActive: true },
    create: {
      tenantId: tenant.id,
      email: TEST_AGENT.email,
      passwordHash,
      name: TEST_AGENT.name,
      role: TEST_AGENT.role
    }
  })

  // Logear los agentes — las cookies se guardan automáticamente
  const adminLogin = await adminAgent
    .post('/api/auth/login')
    .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password })

  if (adminLogin.status !== 200) {
    throw new Error(`Admin login failed: ${adminLogin.status} ${JSON.stringify(adminLogin.body)}`)
  }

  const agentLogin = await agentAgent
    .post('/api/auth/login')
    .send({ email: TEST_AGENT.email, password: TEST_AGENT.password })

  if (agentLogin.status !== 200) {
    throw new Error(`Agent login failed: ${agentLogin.status} ${JSON.stringify(agentLogin.body)}`)
  }
}

async function cleanupTestData() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } }).catch(() => null)
  if (tenant) {
    await prisma.lead.deleteMany({
      where: { tenantId: tenant.id, email: { contains: 'test-' } }
    }).catch(() => {})

    await prisma.property.deleteMany({
      where: { tenantId: tenant.id, title: { startsWith: '[TEST]' } }
    }).catch(() => {})

    await prisma.user.deleteMany({
      where: { tenantId: tenant.id, email: { in: [TEST_ADMIN.email, TEST_AGENT.email] } }
    }).catch(() => {})
  }

  await prisma.$disconnect()
}

beforeAll(async () => {
  await ensureTestUsers()
}, 30000)

afterAll(async () => {
  await cleanupTestData()
}, 30000)

module.exports = {
  // Agentes autenticados (cookies incluidas automáticamente)
  getAdmin: () => adminAgent,
  getAgent: () => agentAgent,
  getRequest: () => unauthApp
}
