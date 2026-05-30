# SDD Proposal: Hardening Producción — Tests, Backups y Monitoreo

## Intent

Reforzar el sistema para poder venderlo como producto profesional. Esto
implica tres pilares:

1. **Tests automatizados** — cubrir los flujos críticos (auth, properties,
   leads, contracts) para poder garantizar que el sistema funciona después
   de cualquier cambio
2. **Backups automáticos** — de la base de datos (Supabase PostgreSQL) y
   archivos (Cloudinary) para evitar pérdida de datos
3. **Monitoreo** — logging estructurado (reemplazar `console.log`), health
   checks, y alertas básicas para enterarse si algo se rompe

## Current State

### Tests — ❌ Inexistente

- No hay test runner instalado
- No hay test suite en backend ni frontend
- No hay test scripts en `package.json`
- La única forma de validar es manual (navegar y probar clicks)

**Riesgo**: un cambio que rompa auth, un lead que no se guarde, o un contrato
que no se genere — y no te enterás hasta que el cliente lo reporte.

### Backups — ❌ Inexistente

- Supabase tiene backups automáticos en su plan, pero no hay un script
  propio para hacer dumps o restaurar
- Las imágenes en Cloudinary no tienen backup fuera de la plataforma
- No hay un `backup.sh` / `backup.ps1` que el cliente pueda ejecutar

**Riesgo**: si alguien borra datos por error, o si la cuenta de Supabase
tiene un problema, no hay forma de recuperar rápido.

### Monitoreo — ❌ Console.log()

- Todo el logging es `console.log()` y `console.error()` crudo
- No hay logging estructurado (JSON, niveles, timestamps)
- No hay health check endpoint que verifique la conexión a DB, Cloudinary, etc.
- No hay alertas si el sistema se cae
- Si el servidor crashea a las 3 AM, no te enterás hasta el día siguiente

**Riesgo**: imposible diagnosticar problemas en producción sin tener que
meterte al servidor a mirar logs planos sin estructura.

## Scope

### In Scope

1. Tests automatizados
   - Instalar test runner (Vitest para frontend, Supertest/Jest para backend)
   - Tests de auth: login, refresh, logout, me, acceso a rutas protegidas
   - Tests de properties: CRUD completo
   - Tests de leads: CRUD completo
   - Tests de contracts: generación y listado
   - Health check endpoint test

2. Backups automáticos
   - Script `scripts/backup.ps1` que haga dump de PostgreSQL
   - Script que backup de Cloudinary (lista de URLs + metadatos)
   - Documentación de cómo restaurar

3. Monitoreo
   - Reemplazar `console.log` con logger estructurado (pino/winston)
   - Endpoint `/api/health` mejorado que verifique DB + Cloudinary + uptime
   - Heartbeat simple que alerte si el health check falla

### Out of Scope

- Tests E2E con Playwright/Cypress (solo unit + integration)
- Dashboard de monitoreo tipo Grafana/Datadog (solo heartbeat básico)
- CI/CD pipeline (GitHub Actions, etc.)
- Tests de frontend components (solo backend API tests)

## Approach

### Tests

Usar **Vitest** como test runner (ya está como devDependency del frontend,
se puede usar también para backend con `vitest --config vitest.backend.config`).

Estructura:
```
backend/
├── __tests__/
│   ├── auth.test.js
│   ├── properties.test.js
│   ├── leads.test.js
│   └── contracts.test.js
```

Dependencias a instalar:
- `vitest` (ya está en frontend, instalar como dev en backend también)
- `supertest` (para hacer requests HTTP contra express)
- Opcional: `@supabase/supabase-js` mock o usar una test DB separada

Cada test:
- Crea un usuario de prueba via API
- Corre los escenarios contra el server real (con una DB de test o mockeando Prisma)
- Limpia al final

### Backups

Script PowerShell (`scripts/backup.ps1`):
- `pg_dump` de Supabase PostgreSQL → archivo `.sql` con timestamp
- Sube el backup a Cloudinary o deja local
- Log del resultado

Script `scripts/backup-cloudinary.ps1`:
- Usa Cloudinary Admin API para listar todos los assets
- Guarda la metadata localmente (URLs, public_ids, tags)
- Documenta cómo restaurar

### Monitoreo

**Logger**: usar `pino` (más rápido que winston, JSON por defecto).

Implementación:
- `backend/services/logger.js` — logger centralizado
- Niveles: `fatal`, `error`, `warn`, `info`, `debug`
- Timestamps ISO + request IDs en cada request
- Reemplazar gradualmente `console.log` en rutas críticas

**Health check mejorado**:
```json
GET /api/health
{
  "status": "ok",
  "uptime": 123456,
  "database": "connected",
  "cloudinary": "connected",
  "timestamp": "2026-05-29T..."
}
```

**Heartbeat**: script que cada 5 min hace GET a `/api/health` y loguea si
falla (futuro: integrar con Slack/email).

## Success Criteria

1. `npm test` corre todos los tests y pasan
2. Los tests cubren auth, properties, leads, contracts
3. `scripts/backup.ps1` genera un dump de la DB
4. `scripts/backup-cloudinary.ps1` exporta metadata de Cloudinary
5. No hay `console.log` en rutas críticas (reemplazado por logger)
6. `/api/health` verifica DB + Cloudinary + uptime
7. El heartbeat alerta si el sistema no responde

## Risks

| Risk | Mitigation |
|------|------------|
| Tests contra DB real pueden dejar datos basura | Usar `afterAll` cleanup o transactions que se rollbackean |
| pg_dump requiere PostgreSQL client instalado | Documentar prerequisitos en el script |
| Cloudinary no tiene API de backup masivo | Backup de metadata + URLs (las imágenes se pueden re-subir) |
| Reemplazar console.log puede introducir bugs si hay typos | Hacerlo por módulo, testear después de cada uno |
| heartbeat requiere un proceso separado corriendo | Incluir como npm script opcional |

## Estimated Impact

- **New files**: ~8 (4 test files + 2 backup scripts + logger + heartbeat)
- **Modified files**: ~20+ (backend routes to replace console.log)
- **Lines changed**: ~400-600

## Next Steps

1. Write detailed specs
2. Design the technical approach
3. Break into implementation tasks
4. Implement in batches (tests → backups → monitoreo)
5. Verify end-to-end
