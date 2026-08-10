// Prisma Client - Conexión a Supabase PostgreSQL
// Prisma 7.x requiere usar adapter explícitamente
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL no está definida. Creá backend/.env (ver credenciales.txt)')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

module.exports = { prisma, db: prisma }
