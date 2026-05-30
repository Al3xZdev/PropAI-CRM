# SDD Design: Hardening Producción

## Overview

Este documento detalla la implementación técnica de cada requerimiento:
tests con Vitest + Supertest, logger con Pino, health check mejorado,
backups con PowerShell, y heartbeat en Node.js.

---

## REQ-05: Logger Estructurado (Fundación)

### Archivos

| Archivo | Acción |
|---------|--------|
| `backend/services/logger.js` | **Nuevo** — logger centralizado |
| `backend/server.js` | **Modificar** — agregar pino-http middleware, reemplazar console.log de startup |
| `backend/package.json` | **Modificar** — agregar dependencias |
| Varias rutas | **Modificar** — reemplazar console.log por logger |

### Dependencias

```bash
npm install pino pino-http pino-pretty
```

### `backend/services/logger.js`

```js
const pino = require('pino')
const path = require('path')

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { env: process.env.NODE_ENV || 'development' }
})

module.exports = logger
```

### Request Logging Middleware

En `server.js`, agregar:

```js
// Después de cookieParser, antes de routes
const pinoHttp = require('pino-http')({ logger })

if (process.env.NODE_ENV === 'production') {
  app.use(pinoHttp)
}
```

En desarrollo no se usa `pino-http` automático para no saturar la salida;
las rutas usan `logger.info()` manualmente.

### Request ID

`pino-http` ya genera un `req.id` (uuid) por request. Para desarrollo,
se puede agregar un middleware manual que genere requestId:

```js
const { v4: uuidv4 } = require('uuid')
app.use((req, res, next) => {
  req.id = uuidv4()
  next()
})
```

### Migración de console.log

Cada ruta se modifica para usar `req.log` (cuando pino-http está activo)
o importar el logger directamente. Ejemplo típico:

```js
// Antes
console.log('📥 Login attempt:', email)
console.error('❌ Login error:', error)

// Después (con pino-http)
req.log.info({ email }, 'login attempt')
// o sin pino-http
logger.info({ email }, 'login attempt')

// Errores
logger.error({ err: error }, 'login error')
```

**Rutas a migrar** (por orden de criticidad):
1. `routes/auth.js` — datos sensibles, error logging
2. `routes/properties.js` — CRUD principal
3. `routes/leads.js` — CRUD principal
4. `routes/contracts.js` — documentos críticos
5. `routes/chat.js` — webhooks
6. `routes/automation.js` — background jobs
7. `server.js` — startup, conexiones

---

## REQ-06: Health Check Mejorado

### Archivos

| Archivo | Acción |
|---------|--------|
| `backend/services/health.js` | **Nuevo** — lógica de health checks |
| `backend/server.js` | **Modificar** — reemplazar health endpoint existente |

### `backend/services/health.js`

```js
const { prisma } = require('./db')
const { testConnection: testCloudinary } = require('./cloudinaryService')

const startTime = Date.now()

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'connected' }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

async function checkCloudinary() {
  try {
    const connected = await testCloudinary()
    return connected
      ? { status: 'connected' }
      : { status: 'error', error: 'Connection test failed' }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

async function getHealth() {
  const [db, cloudinary] = await Promise.all([
    checkDatabase().catch(e => ({ status: 'error', error: e.message })),
    checkCloudinary().catch(e => ({ status: 'error', error: e.message }))
  ])

  const checks = { database: db, cloudinary }
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
```

### Health Endpoint en server.js

```js
const { getHealth } = require('./services/health')

app.get('/api/health', async (req, res) => {
  const health = await getHealth()
  const statusCode = health.status === 'ok' ? 200 : 503
  res.status(statusCode).json(health)
})
```

Cada check individual tiene un timeout interno de 3s para evitar que un
servicio lento bloquee toda la respuesta.

---

## REQ-01 a REQ-04: Tests Automatizados

### Arquitectura

Usar **Vitest** como runner + **Supertest** para hacer requests HTTP
contra la app Express sin necesidad de levantar el servidor real.

### Dependencias

```bash
cd backend
npm install -D vitest supertest
```

### Configuración

`backend/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.js'],
    testTimeout: 15000,
    hookTimeout: 15000
  }
})
```

Agregar script en `backend/package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Test Helper Setup

`backend/__tests__/setup.js` — helpers compartidos:

```js
// setup.js — exports app (sin listen), test user, auth cookie helper
const express = require('express')
// ... importar server setup sin listen ...

// Crear test user en beforeAll, eliminar en afterAll
// Helper: login() → cookie string para requests
// Helper: createTestProperty() → property object
// Helper: createTestLead() → lead object
```

Estructura del setup:

```js
const supertest = require('supertest')
const { app } = require('../server')  // export app sin listen
const { prisma } = require('../services/db')

let testUser = null
let agentUser = null
let authCookies = ''
let agentCookies = ''

beforeAll(async () => {
  // 1. Asegurar que existe el tenant demo
  // 2. Crear admin test user
  // 3. Crear agent test user
  // 4. Login como admin → obtener cookies
  // 5. Login como agent → obtener cookies
})

afterAll(async () => {
  // Cleanup: eliminar test users creados
  await prisma.$disconnect()
})

function withAuth(request) {
  return request.set('Cookie', authCookies)
}

function withAgentAuth(request) {
  return request.set('Cookie', agentCookies)
}

module.exports = { withAuth, withAgentAuth, testUser, agentUser }
```

### Test Files

#### `backend/__tests__/auth.test.js`

```js
describe('POST /api/auth/login', () => {
  it('devuelve 200 con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'Demo123456' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.user).toHaveProperty('id')
    // Verificar cookies
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('devuelve 401 con credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('devuelve 401 sin cookie', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('devuelve 200 con cookie válida', async () => {
    const res = await withAuth(request(app).get('/api/auth/me'))
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('admin@demo.com')
  })
})
```

#### `backend/__tests__/properties.test.js`

```js
describe('Properties CRUD', () => {
  let propertyId

  it('POST /api/properties — crea propiedad', async () => {
    const res = await withAuth(request(app)
      .post('/api/properties')
      .field('title', 'Casa test')
      .field('price', '150000')
      .field('area', '200')
      .field('bedrooms', '3')
      .field('bathrooms', '2')
      .field('propertyType', 'casa'))
    expect(res.status).toBe(201)
    expect(res.body.property.title).toBe('Casa test')
    propertyId = res.body.property.id
  })

  it('GET /api/properties — lista propiedades', async () => {
    const res = await withAuth(request(app).get('/api/properties'))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.properties)).toBe(true)
  })

  it('DELETE /api/properties/:id — agent devuelve 403', async () => {
    const res = await withAgentAuth(request(app)
      .delete(`/api/properties/${propertyId}`))
    expect(res.status).toBe(403)
  })
})
```

#### `backend/__tests__/leads.test.js`

```js
describe('Leads CRUD', () => {
  let leadId

  it('POST /api/leads — crea lead', async () => {
    const res = await withAuth(request(app)
      .post('/api/leads')
      .send({ name: 'Juan Test', email: 'juan@test.com', phone: '123456789' }))
    expect(res.status).toBe(201)
    leadId = res.body.lead.id
  })

  it('GET /api/leads/stats/summary — devuelve stats', async () => {
    const res = await withAuth(request(app).get('/api/leads/stats/summary'))
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
  })
})
```

#### `backend/__tests__/contracts.test.js`

```js
describe('Contracts', () => {
  let contractId

  it('POST /api/contracts — genera contrato', async () => {
    const res = await withAuth(request(app)
      .post('/api/contracts')
      .send({ propertyId, leadId, contractType: 'buy' }))
    expect(res.status).toBe(201)
    contractId = res.body.contract.id
  })

  it('GET /api/contracts/:id/download — sin token devuelve 401', async () => {
    const res = await request(app)
      .get(`/api/contracts/${contractId}/download`)
    expect(res.status).toBe(401)
  })
})
```

### Estrategia de DB para Tests

Opción recomendada: **usar la misma DB pero limpiar después**.

- `beforeAll`: crear test user + tenant si no existen
- `afterAll`: eliminar datos de test (por `email` o `name` prefijados)
- Los tests de cada archivo son independientes y se pueden correr en paralelo
- Alternativa futura: usar `@shelf/jest-mongodb` o SQLite para tests, pero
  para el MVP usar la DB real con cleanup alcanza

---

## REQ-07: Backups

### `scripts/backup.ps1` — PostgreSQL Dump

```powershell
param(
  [string]$OutputDir = "./backups"
)

# Cargar .env
Get-Content "../backend/.env" | ForEach-Object {
  if ($_ -match "^(DATABASE_URL|CLOUDINARY_CLOUD_NAME|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET)=") {
    $parts = $_ -split "=", 2
    Set-Item -Path "env:$($parts[0])" -Value $parts[1]
  }
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$filename = "backup_$timestamp.sql"
$outputPath = Join-Path $OutputDir $filename

# Crear directorio si no existe
if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force
}

# Ejecutar pg_dump
Write-Host "📦 Running pg_dump..."
pg_dump $env:DATABASE_URL --no-owner --no-acl -f $outputPath

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Backup completed: $filename"
  Write-Host "   Size: $((Get-Item $outputPath).Length / 1MB) MB"
} else {
  Write-Host "❌ Backup failed"
  exit 1
}
```

### `scripts/backup-cloudinary.ps1` — Cloudinary Metadata

```powershell
param(
  [string]$OutputDir = "./backups"
)

# Usar la API Admin de Cloudinary via Node.js
# node -e "cloudinary.api.resources(...)"
# Se implementa como script Node.js para reusar cloudinaryService
```

Implementar como `scripts/backup-cloudinary.js`:

```js
// Requiere: cloudinary config desde backend/.env
const cloudinary = require('cloudinary').v2
require('dotenv').config({ path: '../backend/.env' })
const fs = require('fs')
const path = require('path')

const outputDir = process.argv[2] || './backups'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outputPath = path.join(outputDir, `cloudinary_backup_${timestamp}.json`)

async function run() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  let allResources = []
  let nextCursor = null

  do {
    const result = await cloudinary.api.resources({
      max_results: 500,
      next_cursor: nextCursor,
      type: 'upload'
    })
    allResources = allResources.concat(result.resources.map(r => ({
      public_id: r.public_id,
      url: r.secure_url,
      format: r.format,
      tags: r.tags,
      created_at: r.created_at,
      bytes: r.bytes
    })))
    nextCursor = result.next_cursor
  } while (nextCursor)

  fs.writeFileSync(outputPath, JSON.stringify(allResources, null, 2))
  console.log(`✅ Cloudinary backup: ${outputPath} (${allResources.length} assets)`)
}

run().catch(err => {
  console.error('❌ Cloudinary backup failed:', err)
  process.exit(1)
})
```

---

## REQ-08: Heartbeat

### `scripts/heartbeat.js`

```js
const http = require('http')

const INTERVAL = parseInt(process.argv[2], 10) || 300000 // 5 min default
const TARGET = process.env.HEARTBEAT_URL || 'http://localhost:3001/api/health'

function tick() {
  const start = Date.now()
  http.get(TARGET, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      const elapsed = Date.now() - start
      try {
        const health = JSON.parse(data)
        if (health.status === 'ok') {
          console.log(`[${new Date().toISOString()}] Heartbeat OK (${elapsed}ms)`)
        } else {
          console.error(`[${new Date().toISOString()}] Heartbeat DEGRADED:`, health)
        }
      } catch {
        console.error(`[${new Date().toISOString()}] Heartbeat FAIL - invalid response`)
      }
    })
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Heartbeat FAIL - ${err.message}`)
  })
}

console.log(`[${new Date().toISOString()}] Heartbeat started, interval: ${INTERVAL}ms, target: ${TARGET}`)
tick()
setInterval(tick, INTERVAL)
```

---

## Dependencias del Diseño

```
                        ┌─────────────────────────┐
                        │  server.js               │
                        │  - pino-http middleware   │
                        │  - health endpoint (nuevo)│
                        └────┬────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌───────────┐ ┌──────────────┐
     │ logger.js    │ │ health.js │ │ __tests__/   │
     │ (Pino)       │ │ (DB+CN)   │ │ (Vitest)     │
     └──────────────┘ └───────────┘ └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
     ┌──────────────┐              ┌──────────────┐
     │ heartbeat.js │              │ scripts/     │
     │ (health GET) │              │ backup.ps1   │
     └──────────────┘              │ backup-cn.js │
                                    └──────────────┘
```

## Resumen de Archivos

| Archivo | Tipo | Líneas estimadas |
|---------|------|-----------------|
| `backend/services/logger.js` | Nuevo | ~20 |
| `backend/services/health.js` | Nuevo | ~60 |
| `backend/__tests__/setup.js` | Nuevo | ~80 |
| `backend/__tests__/auth.test.js` | Nuevo | ~80 |
| `backend/__tests__/properties.test.js` | Nuevo | ~100 |
| `backend/__tests__/leads.test.js` | Nuevo | ~80 |
| `backend/__tests__/contracts.test.js` | Nuevo | ~60 |
| `backend/vitest.config.js` | Nuevo | ~15 |
| `scripts/backup.ps1` | Nuevo | ~40 |
| `scripts/backup-cloudinary.js` | Nuevo | ~45 |
| `scripts/heartbeat.js` | Nuevo | ~45 |
| `backend/server.js` | Modificado | +~15 |
| `backend/package.json` | Modificado | +~8 |
| `backend/routes/auth.js` | Modificado | +~10 (logger) |
| `backend/routes/properties.js` | Modificado | +~10 (logger) |
| `backend/routes/leads.js` | Modificado | +~10 (logger) |
| `backend/routes/contracts.js` | Modificado | +~5 (logger) |
| **Total** | | **~680 líneas** |
