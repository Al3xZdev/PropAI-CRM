# SDD Specs: Hardening Producción — Tests, Backups y Monitoreo

## Overview

Reforzar el sistema para venta profesional: tests automatizados de los
flujos críticos, backup de base de datos y archivos, y logging estructurado
con health check.

---

## REQ-01: Tests de Autenticación

### Description
Tests que cubren el flujo completo de auth: login exitoso, login fallido,
refresh token con rotación, logout, acceso a rutas protegidas sin token,
y verificación de tenant isolation.

### Acceptance Criteria
- AC-01.1: `POST /api/auth/login` con credenciales válidas devuelve 200 + user object
- AC-01.2: `POST /api/auth/login` con credenciales inválidas devuelve 401
- AC-01.3: `GET /api/auth/me` sin cookie devuelve 401
- AC-01.4: `GET /api/auth/me` con cookie válida devuelve 200 + datos del usuario
- AC-01.5: `POST /api/auth/logout` limpia cookies y revoca refresh token
- AC-01.6: Usuario de tenant A no puede ver datos del tenant B

### Scenarios

**Scenario 1: Login exitoso**
```
Given un usuario registrado con email "admin@demo.com" y password "Demo123456"
When POST /api/auth/login con { email: "admin@demo.com", password: "Demo123456" }
Then status 200
And response.body.success es true
And response.body.user tiene id, email, name, role, tenant
And set-cookie header incluye accessToken y refreshToken (httpOnly)
```

**Scenario 2: Login fallido**
```
Given un usuario registrado
When POST /api/auth/login con { email: "admin@demo.com", password: "wrong" }
Then status 401
And response.body.error es "Credenciales inválidas"
```

**Scenario 3: Acceso sin auth**
```
Given no hay cookies de auth
When GET /api/auth/me
Then status 401
And response.body.code es "NO_TOKEN"
```

**Scenario 4: Tenant isolation**
```
Given usuario A del tenant 1 y usuario B del tenant 2
When usuario A hace GET /api/properties
And usuario B hace GET /api/properties
Then las propiedades de A no incluyen ninguna del tenant B
And las propiedades de B no incluyen ninguna del tenant A
```

---

## REQ-02: Tests de Properties CRUD

### Description
Tests del ciclo de vida de propiedades: creación, listado, detalle,
actualización, eliminación y filtros. Validar que la subida de imágenes
no rompe el flujo y que solo admin puede eliminar.

### Acceptance Criteria
- AC-02.1: `POST /api/properties` con datos válidos + imágenes crea la propiedad
- AC-02.2: `GET /api/properties` devuelve lista del tenant actual
- AC-02.3: `GET /api/properties/:id` devuelve detalle de la propiedad
- AC-02.4: `PUT /api/properties/:id` actualiza los campos enviados
- AC-02.5: `DELETE /api/properties/:id` como admin elimina la propiedad
- AC-02.6: `DELETE /api/properties/:id` como agent devuelve 403
- AC-02.7: Propiedades creadas en tenant A no son visibles desde tenant B

### Scenarios

**Scenario 1: Crear propiedad**
```
Given usuario autenticado
When POST /api/properties con FormData { title, price, area, bedrooms, bathrooms, propertyType, images[] }
Then status 201
And response.body.property tiene id, title, price
And response.body.property.images es un array con las URLs
```

**Scenario 2: Listar propiedades**
```
Given tenant tiene 3 propiedades creadas
When GET /api/properties
Then status 200
And response.body.properties.length es 3
```

**Scenario 3: Eliminar como agent (sin permiso)**
```
Given usuario con role "agent" autenticado
When DELETE /api/properties/:id
Then status 403
And response.body.error contiene "No tienes permisos"
```

---

## REQ-03: Tests de Leads CRUD

### Description
Tests del ciclo de vida de leads: creación, listado con filtros,
actualización de estado, asignación a agente, y eliminación.

### Acceptance Criteria
- AC-03.1: `POST /api/leads` con datos mínimos crea un lead
- AC-03.2: `GET /api/leads` devuelve lista paginada/filtrada
- AC-03.3: `GET /api/leads/stats/summary` devuelve estadísticas
- AC-03.4: `PUT /api/leads/:id` actualiza status, notes, etc.
- AC-03.5: `DELETE /api/leads/:id` como admin/manager elimina
- AC-03.6: `POST /api/assignment/assign/:leadId` asigna lead a un agente

### Scenarios

**Scenario 1: Crear lead y asignar**
```
Given usuario autenticado
When POST /api/leads con { name, email, phone, status: "nuevo" }
Then status 201
And response.body.lead.name es el nombre enviado
And response.body.lead.status es "nuevo"

When POST /api/assignment/assign/:leadId con { assignedTo: userId }
Then status 200
And response.body.lead.assignedTo es userId
```

**Scenario 2: Filtro por status**
```
Given tenant tiene leads en status "nuevo", "contactado", "cerrado"
When GET /api/leads?status=contactado
Then response.body.leads all tienen status "contactado"
```

---

## REQ-04: Tests de Contracts

### Description
Tests de generación y listado de contratos. Validar que se genera el
documento correctamente y que el download con token funciona.

### Acceptance Criteria
- AC-04.1: `POST /api/contracts` con datos de propiedad + lead genera contrato
- AC-04.2: `GET /api/contracts` lista contratos del tenant
- AC-04.3: `GET /api/contracts/:id/download?token=` sin token devuelve 401
- AC-04.4: `GET /api/contracts/:id/download?token=` con token válido descarga PDF

### Scenarios

**Scenario 1: Generar contrato**
```
Given usuario autenticado
And existe una propiedad y un lead
When POST /api/contracts con { propertyId, leadId, contractType: "buy" }
Then status 201
And response.body.contract tiene id, propertyId, leadId, status "draft"
```

**Scenario 2: Descargar contrato sin auth**
```
Given existe un contrato generado
When GET /api/contracts/:id/download (sin token)
Then status 401
```

---

## REQ-05: Logger Estructurado

### Description
Reemplazar `console.log` / `console.error` con un logger centralizado
que use Pino. El logger debe escribir en JSON, con timestamps ISO,
niveles (fatal, error, warn, info, debug), y request IDs correlativos.

### Acceptance Criteria
- AC-05.1: `backend/services/logger.js` exporta logger con métodos .info, .error, .warn, .debug, .fatal
- AC-05.2: Cada request HTTP tiene un requestId único (uuid) y se loguea automáticamente
- AC-05.3: Las rutas críticas (auth, properties, leads, contracts) usan logger en vez de console.log
- AC-05.4: El output del logger es JSON válido en una línea por entrada
- AC-05.5: En desarrollo, el logger tiene formato legible (pretty print opcional)
- AC-05.6: `server.js` loguea startup con puerto y modo

### Scenarios

**Scenario 1: Request logueado**
```
Given el logger está configurado
When un request entra a POST /api/auth/login
Then se loguea un evento con { level, time, reqId, method, url, status, duration }
```

**Scenario 2: Error logueado**
```
Given el logger está configurado
When un request falla con 500
Then se loguea un error con { level: "error", err, stack, reqId }
```

---

## REQ-06: Health Check Mejorado

### Description
Endpoint `/api/health` mejorado que verifique el estado de la base de datos,
la conexión a Cloudinary, el uptime del servidor, y devuelva un summary en
JSON. Agregar también un script heartbeat que monitoree periódicamente.

### Acceptance Criteria
- AC-06.1: `GET /api/health` devuelve status 200, uptime, DB status, Cloudinary status
- AC-06.2: Si DB está caída, status es "degraded" y database.status es "error"
- AC-06.3: Si Cloudinary está caído, status es "degraded" (no fatal)
- AC-06.4: El endpoint incluye timestamp ISO y version del proyecto
- AC-06.5: Servicio responde en menos de 2s incluso si un servicio externo está lento (timeout de 3s por check)

### Scenarios

**Scenario 1: Todo funciona**
```
Given DB conectada y Cloudinary conectado
When GET /api/health
Then status 200
And response.body.status es "ok"
And response.body.database.status es "connected"
And response.body.cloudinary.status es "connected"
And response.body.uptime es un número > 0
```

**Scenario 2: DB caída**
```
Given DB no responde
When GET /api/health
Then status 200 (el endpoint no crashea)
And response.body.status es "degraded"
And response.body.database.status es "error"
And response.body.database.error contiene el mensaje de error
```

---

## REQ-07: Backup Automático

### Description
Scripts PowerShell que generen backups de la base de datos PostgreSQL
y de los metadatos de Cloudinary. El backup de DB debe ser un dump SQL
que se pueda restaurar con `psql`. El backup de Cloudinary debe exportar
public_ids, URLs, y tags en formato JSON.

### Acceptance Criteria
- AC-07.1: `scripts/backup.ps1` corre `pg_dump` y genera un .sql con timestamp
- AC-07.2: `scripts/backup.ps1` loguea éxito/fracaso con timestamp
- AC-07.3: `scripts/backup-cloudinary.ps1` lista assets de Cloudinary y los guarda como JSON
- AC-07.4: Los scripts verifican prerequisitos (pg_dump instalado, env vars seteadas)
- AC-07.5: Hay documentación de cómo restaurar en el script mismo (comentarios)

### Scenarios

**Scenario 1: Backup de DB exitoso**
```
Given pg_dump está instalado y DATABASE_URL está configurada
When se ejecuta scripts/backup.ps1
Then se genera un archivo backup_2026-05-29_193000.sql
And el archivo no está vacío
And se loguea "Backup completed: backup_2026-05-29_193000.sql"
```

**Scenario 2: Backup de Cloudinary**
```
Given CLOUDINARY_URL está configurada
When se ejecuta scripts/backup-cloudinary.ps1
Then se genera cloudinary_backup_2026-05-29.json
And el JSON tiene un array con { public_id, url, format, tags, created_at }
```

---

## REQ-08: Heartbeat

### Description
Script Node.js que cada N minutos hace GET a `/api/health` y loguea
el resultado. Si el health check falla, escribe a stderr con timestamp
para que pueda ser capturado por systemd/supervisor.

### Acceptance Criteria
- AC-08.1: `scripts/heartbeat.js` hace GET a `http://localhost:3001/api/health`
- AC-08.2: Si status es "ok", loguea "Heartbeat OK" con timestamp
- AC-08.3: Si status no es "ok" o hay error de red, loguea "Heartbeat FAIL" a stderr
- AC-08.4: Se puede configurar intervalo via argumento `--interval 300000` (default 5 min)

### Scenarios

**Scenario 1: Heartbeat exitoso**
```
Given el servidor está corriendo en localhost:3001
When se ejecuta node scripts/heartbeat.js
Then cada 5 minutos loguea "Heartbeat OK - {timestamp}"
And exit code es 0
```

**Scenario 2: Heartbeat fallido**
```
Given el servidor NO está corriendo
When se ejecuta node scripts/heartbeat.js
Then loguea "Heartbeat FAIL - {timestamp} - {error}" a stderr
```

---

## Dependency Graph

```
REQ-01 (auth tests) ──┤
REQ-02 (properties tests) ──┤
REQ-03 (leads tests) ──┤   ← independientes entre sí
REQ-04 (contracts tests) ──┤

REQ-05 (logger) ──→ REQ-06 (health check) ──→ REQ-08 (heartbeat)
                      │
                      └──→ REQ-07 (backups) ← independiente
```

- REQ-01, 02, 03, 04 son independientes entre sí (se pueden hacer en cualquier orden)
- REQ-05 (logger) es base para REQ-06 (health check) porque el health check usa el logger
- REQ-06 (health check) es base para REQ-08 (heartbeat) porque el heartbeat consulta el health check
- REQ-07 (backups) es independiente de todo
