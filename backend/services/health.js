// Health Check Service
// Verifica DB, Cloudinary y expone métricas de uptime
const { prisma } = require('./db')
const { testConnection: testCloudinary } = require('./cloudinaryService')
const logger = require('./logger')

const startTime = Date.now()
const CHECK_TIMEOUT = 3000 // 3s max por check

/**
 * Check PostgreSQL connection via Prisma
 */
async function checkDatabase() {
  try {
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 AS ok`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database check timed out')), CHECK_TIMEOUT)
      )
    ])
    return { status: 'connected' }
  } catch (error) {
    logger.warn({ err: error }, 'health: database check failed')
    return { status: 'error', error: error.message }
  }
}

/**
 * Check Cloudinary connection
 */
async function checkCloudinary() {
  try {
    const connected = await Promise.race([
      testCloudinary(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cloudinary check timed out')), CHECK_TIMEOUT)
      )
    ])
    return connected
      ? { status: 'connected' }
      : { status: 'error', error: 'Connection test returned false' }
  } catch (error) {
    logger.warn({ err: error }, 'health: cloudinary check failed')
    return { status: 'error', error: error.message }
  }
}

/**
 * Gather all health checks in parallel
 */
async function getHealth() {
  const [database, cloudinary] = await Promise.all([
    checkDatabase(),
    checkCloudinary()
  ])

  const checks = { database, cloudinary }
  const allOk = Object.values(checks).every(c => c.status === 'connected')

  return {
    status: allOk ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    timestamp: new Date().toISOString()
  }
}

module.exports = { getHealth, startTime }
