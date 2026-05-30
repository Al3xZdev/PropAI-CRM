# SDD Tasks: Hardening Producción

## Overview

Dividido en 3 batches implementables secuencialmente. Cada batch es
independiente y se puede verificar por separado.

---

## ✅ Batch 1: Infrastructure — Logger + Health Check + Heartbeat (COMPLETED)

**Dependencias**: ninguna
**Archivos**: 4 nuevos, 2 modificados
**Líneas estimadas**: ~145
**Review workload**: baja

### Tarea 1.1: Instalar dependencias

```bash
cd backend
npm install pino pino-http pino-pretty
npm install -D vitest supertest
```

Agregar script `"test": "vitest run"` y `"test:watch": "vitest"` en
`backend/package.json`.

**Verificación**: `node -e "require('pino')"` no tira error.

### Tarea 1.2: Crear logger centralizado

**Archivo**: `backend/services/logger.js`

Logger Pino con:
- Nivel configurable via `LOG_LEVEL` env
- Pretty print en desarrollo, JSON en producción
- Timestamps ISO
- Exportar `logger` object

**Verificación**:
```js
const logger = require('./services/logger')
logger.info('test') // → debe mostrar en consola
```

### Tarea 1.3: Agregar request-id middleware + pino-http

**Archivo**: `backend/server.js`

Agregar después de `cookieParser()`:
```js
if (process.env.NODE_ENV === 'production') {
  const pinoHttp = require('pino-http')({ logger })
  app.use(pinoHttp)
}
```

Para desarrollo, agregar middleware manual que asigne `req.id` via `uuid`.

**Verificación**: 
- En producción: cada request loguea método, url, status, duration
- En desarrollo: `req.id` existe en cada request

### Tarea 1.4: Health check service + endpoint

**Archivo nuevo**: `backend/services/health.js`
**Modificar**: `backend/server.js`

Health service con:
- `checkDatabase()`: `SELECT 1` via Prisma
- `checkCloudinary()`: usar `testConnection()` existente
- `getHealth()`: corre checks en paralelo, devuelve status, uptime, version
- Timeout de 3s por check

Endpoint reemplaza el `/api/health` existente en `server.js`:
```js
app.get('/api/health', async (req, res) => {
  const health = await getHealth()
  res.status(health.status === 'ok' ? 200 : 503).json(health)
})
```

**Verificación**: 
```
GET /api/health → { status: "ok", uptime: 123, checks: { database: { status: "connected" }, cloudinary: { status: "connected" } } }
```

### Tarea 1.5: Crear heartbeat script

**Archivo nuevo**: `scripts/heartbeat.js`

Script Node.js que cada 5 min (configurable via `--interval` arg) hace GET
a `/api/health` y loguea resultado.

- Interval default: 300000ms (5 min)
- Target default: `http://localhost:3001/api/health`
- Log exitoso: stdout con timestamp
- Log fallido: stderr con timestamp + error

**Verificación**:
```bash
node scripts/heartbeat.js --interval 5000
# → cada 5 segundos: Heartbeat OK - {timestamp}
```

---

## ✅ Batch 2: Tests Automatizados (COMPLETED)

**Dependencias**: Batch 1 (para usar logger en tests)
**Archivos**: 5 nuevos, 1 modificado
**Líneas estimadas**: ~335
**Review workload**: media

### Tarea 2.1: Vitest config + test setup

**Archivo nuevo**: `backend/vitest.config.js`
**Archivo nuevo**: `backend/__tests__/setup.js`

Vitest config:
- globals: true, environment: node
- Timeout de 15s (los tests hacen requests reales)
- setupFiles: `./__tests__/setup.js`

Setup helpers:
- Exportar `request` (supertest con app express sin listen)
- `beforeAll`: crear tenant demo + admin user + agent user si no existen
- `afterAll`: cleanup de datos de test, desconectar prisma
- `withAuth(req)`: agrega Cookie header con auth
- `withAgentAuth(req)`: igual pero como role agent
- `createTestProperty()`: helper para crear propiedad de prueba
- `createTestLead()`: helper para crear lead de prueba

**Verificación**: `node -e "require('./__tests__/setup.js')"` no tira error

### Tarea 2.2: Tests de Auth

**Archivo nuevo**: `backend/__tests__/auth.test.js`

Casos:
- Login exitoso → 200 + user + cookies
- Login fallido (wrong password) → 401
- Login fallido (email inexistente) → 401
- GET /me sin auth → 401
- GET /me con cookie válida → 200 + user data
- Logout → limpia cookies
- Tenant isolation: user de tenant A no ve datos de tenant B

**Verificación**: `npx vitest run __tests__/auth.test.js` → all pass

### Tarea 2.3: Tests de Properties

**Archivo nuevo**: `backend/__tests__/properties.test.js`

Casos:
- POST /api/properties → 201 + property creada
- GET /api/properties → lista del tenant
- GET /api/properties/:id → detalle
- PUT /api/properties/:id → actualización
- DELETE /api/properties/:id como admin → 200
- DELETE /api/properties/:id como agent → 403
- Listado no incluye propiedades de otro tenant

**Verificación**: `npx vitest run __tests__/properties.test.js` → all pass

### Tarea 2.4: Tests de Leads

**Archivo nuevo**: `backend/__tests__/leads.test.js`

Casos:
- POST /api/leads → 201 + lead creado
- GET /api/leads → lista
- GET /api/leads?status= → filtrado
- GET /api/leads/stats/summary → estadísticas
- PUT /api/leads/:id → actualización de status
- POST /api/assignment/assign/:leadId → asignación
- DELETE /api/leads/:id → 200

**Verificación**: `npx vitest run __tests__/leads.test.js` → all pass

### Tarea 2.5: Tests de Contracts

**Archivo nuevo**: `backend/__tests__/contracts.test.js`

Casos:
- POST /api/contracts → 201 + contrato generado
- GET /api/contracts → lista
- GET /api/contracts/:id/download sin token → 401
- GET /api/contracts/:id/download con token válido → stream PDF

**Verificación**: `npx vitest run __tests__/contracts.test.js` → all pass

### Tarea 2.6: Run full test suite

**Verificación**: `npm test` corre todos los tests y pasan.

---

## ✅ Batch 3: Backups + Console.log Migration (COMPLETED)

**Dependencias**: Batch 1
**Archivos**: 2 nuevos, 5 modificados
**Líneas estimadas**: ~140
**Review workload**: ✅ Baja — 25/25 tests pasan

### ✅ Tarea 3.1: Script backup PostgreSQL

**Archivo nuevo**: `scripts/backup.ps1`

Script PowerShell que:
- Lee DATABASE_URL del `.env`
- Corre `pg_dump` con `--no-owner --no-acl`
- Guarda en `backups/backup_YYYY-MM-DD_HHmmss.sql`
- Verifica prerequisitos (pg_dump instalado, .env existe)
- Log del resultado (tamaño, path)

### ✅ Tarea 3.2: Script backup Cloudinary

**Archivo nuevo**: `scripts/backup-cloudinary.js`

Script Node.js que:
- Lee config de Cloudinary del `.env` del backend
- Lista todos los assets via Admin API (paginado, 500 por batch)
- Guarda `public_id, url, format, tags, created_at, bytes` en JSON
- Output: `backups/cloudinary_backup_YYYY-MM-DD.json`

### ✅ Tarea 3.3: Migrar console.log a logger en rutas críticas

**Archivos migrados**:
- ✅ `backend/routes/auth.js` — 8 replacements
- ✅ `backend/routes/properties.js` — 14 replacements
- ✅ `backend/routes/leads.js` — 16 replacements
- ✅ `backend/routes/contracts.js` — 10 replacements
- ✅ `backend/server.js` — 4 replacements (startup logs + webhook debug)

**Verificación**: `npx vitest run` → 4 test files, 25 tests, ALL PASS ✓

---

## Dependency Graph

```
Batch 1 (Infra)
  ├── 1.1 Instalar deps ──► 1.2 Logger ──► 1.3 Request ID ──► 1.4 Health ──► 1.5 Heartbeat
  │                              │                                    │
Batch 2 (Tests)                  ▼                                    │
  ├── 2.1 Setup ──► 2.2 Auth ──┤                                     │
  │                ├── 2.3 Properties  (independiente)                │
  │                ├── 2.4 Leads       (independiente)                │
  │                └── 2.5 Contracts   (independiente)                │
  └── 2.6 Full suite                                                   │
                                                                       ▼
Batch 3 (Backups + Migration)                                    ┌─────┘
  ├── 3.1 Backup DB  (independiente)                             │
  ├── 3.2 Backup Cloudinary (independiente)                      │
  └── 3.3 Migrar console.log ────────────────────────────────────┘ (depende del logger)
```

## Review Workload Forecast

| Batch | Archivos nuevos | Archivos modificados | Líneas estimadas | Review burden |
|-------|----------------|---------------------|------------------|---------------|
| 1 | 4 | 2 | ~145 | ✅ Baja |
| 2 | 6 | 1 | ~335 | ⚠️ Media (cerca del límite) |
| 3 | 2 | 5 | ~140 | ✅ Baja |
| **Total** | **12** | **8** | **~620** | ⚠️ Excede 400 líneas |

**Decisión necesaria antes de apply**: dividir en batches separados o
proceder con `size:exception`.
