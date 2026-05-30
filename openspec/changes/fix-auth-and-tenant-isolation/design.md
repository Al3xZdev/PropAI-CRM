# SDD Design: Fix Auth Token Flow and Tenant Isolation

## Architecture Overview

### Current Flow (BROKEN)
```
Login ──► httpOnly cookie set (OK)
    │
    └── App.jsx ──► credentials: 'include' ──► 200 (OK)
    │
    └── Dashboard.jsx ──► Authorization: Bearer [empty] ──► 401 (BROKEN)
    └── LeadsPage.jsx  ──► Authorization: Bearer [empty] ──► 401 (BROKEN)
    └── InboxPage.jsx  ──► Authorization: Bearer [empty] ──► optionalAuth → undefined tenantId → DATA LEAK
    └── ...
```

### Target Flow (FIXED)
```
Login ──► httpOnly cookie set
    │
    └── ANY component ──► api.get('/endpoint') ──► credentials: 'include' ──► cookie sent ──► 200
                              │
                              └── 401 → localStorage.clear() → page reload (login)
```

---

## Component Design

### 1. `frontend/src/utils/api.js` — Centralized API Client

```
┌─────────────────────────────────────────────────────────┐
│ api.js                                                  │
│                                                         │
│  apiFetch(endpoint, options)                            │
│    ├─ always: credentials: 'include'                    │
│    ├─ default: headers: { Content-Type: 'application/json' }
│    ├─ on 401: clearStorage() + window.location.reload() │
│    └─ returns Response (caller handles .json())         │
│                                                         │
│  api = {                                                │
│    get, post, put, patch, delete, upload                │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

Key decisions:
- `apiFetch` returns the raw `Response` object, NOT parsed JSON. This lets the caller decide how to handle the response (`.json()`, `.blob()`, `.text()`, error handling)
- The 401 handler is a safety net. Individual components can still catch errors before the global handler by checking `response.status` themselves
- File uploads use `api.upload()` which strips Content-Type so the browser can set the multipart boundary
- No `Authorization` header is ever set — auth is 100% cookie-based

### 2. Component Refactoring Pattern

Each component follows the same transformation:

```js
// BEFORE:
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

const response = await fetch(`${API_URL}/leads`, { headers: getAuthHeaders() })
const data = await response.json()

// AFTER:
import { api } from '../utils/api'

const response = await api.get('/leads')
const data = await response.json()
```

For posts with a body:
```js
// BEFORE:
const response = await fetch(`${API_URL}/leads`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(leadData)
})

// AFTER:
const response = await api.post('/leads', leadData)
```

For file uploads:
```js
// BEFORE:
const response = await fetch(`${API_URL}/properties/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    // NO Content-Type — browser sets multipart boundary
  },
  body: formData
})

// AFTER:
const response = await api.upload('/properties/upload', formData)
```

For custom headers (rare):
```js
// Pass additional headers via options — they merge with defaults
const response = await api.get('/endpoint', {
  headers: { 'X-Custom': 'value' }
})
```

### 3. Refactoring Order

Components are grouped by refactoring complexity:

**Group A — Simple getAuthHeaders replacement** (mechanical):
1. `Dashboard.jsx` — only reads leads + followups
2. `HistoryPage.jsx` — one fetch call
3. `LeadsPage.jsx` — reads leads + sequences
4. `LeadDetailModal.jsx` — reads lead data
5. `NewFollowUpModal.jsx` — reads leads
6. `DocumentsPage.jsx` — reads documents
7. `LeadContractsHistory.jsx` — reads contracts

**Group B — Multiple API calls + mixed methods**:
8. `AutomationPage.jsx` — GET + POST to automation endpoints
9. `SequenceBuilderV2.jsx` — POST automation sequences
10. `SequenceList.jsx` — receives getAuthHeaders as prop (needs prop removal)
11. `ScheduleModal.jsx` — POST schedule + file upload
12. `ScheduleTimeline.jsx` — GET + POST + file upload
13. `AgentsPage.jsx` — GET + POST + PUT assignments

**Group C — Complex or chat-related**:
14. `InboxPage.jsx` — many API calls, must fix tenant isolation
15. `ChatModal.jsx` — real-time chat, message sending
16. `GenerateContractModal.jsx` — document generation + download
17. `PropertyImportCSV.jsx` — CSV download + file upload
18. `useNotifications.jsx` — background polling (sensitive to 401 handling)

**App.jsx** — already uses credentials: 'include', but some inline fetch calls still read localStorage. Cleanup only.

**LoginPage.jsx** — verify it doesn't save accessToken (it already doesn't). Add comment clarification.

---

## Backend Design

### 4. `tenantFilter` Helper

Add to `backend/middleware/auth.js`:

```js
/**
 * Safe tenant filter for Prisma queries.
 * When tenantId is undefined/null, returns { tenantId: null }
 * so Prisma returns empty results instead of ignoring the filter.
 */
function tenantFilter(req) {
  return req.tenantId ? { tenantId: req.tenantId } : { tenantId: null }
}
```

Update `optionalAuth` to be explicit:

```js
async function optionalAuth(req, res, next) {
  const token = extractToken(req)
  if (token) {
    const decoded = verifyToken(token)
    if (decoded) {
      req.user = { ... }
      req.tenantId = decoded.tenantId
      req.userId = decoded.id
    }
  }
  // ALWAYS set tenantId — null if no auth
  if (!req.tenantId) {
    req.tenantId = null
  }
  next()
}
```

### 5. Chat Routes Update

All 17 chat endpoints change from:
```js
where: { tenantId: req.tenantId }
```
to:
```js
const { tenantFilter } = require('../middleware/auth')
// ...
where: tenantFilter(req)
```

This is a mechanical substitution across all routes.

### 6. Seed Data Schema

```js
// Properties (3)
const properties = [
  { title: 'Casa Moderna en Palermo', address: 'Av. Dorrego 1234', price: 350000, area: 180, bedrooms: 3, bathrooms: 2, propertyType: 'casa' },
  { title: 'Departamento en Recoleta', address: 'Av. Alvear 567', price: 220000, area: 90, bedrooms: 2, bathrooms: 1, propertyType: 'departamento' },
  { title: 'Terreno en Nordelta', address: 'Lote 45, Barrio Los Alamos', price: 150000, area: 500, bedrooms: 0, bathrooms: 0, propertyType: 'terreno' },
]

// Leads (8) — mixed statuses, some linked to properties
const leads = [
  { name: 'Juan Pérez', email: 'juan@example.com', phone: '+5491112345678', status: 'nuevo', channel: 'whatsapp', ... },
  { name: 'María García', email: 'maria@example.com', phone: '+5491123456789', status: 'contactado', channel: 'email', propertyId: prop1.id },
  // ... 6 more
]
```

---

## Data Flow Diagrams

### Normal Request Flow
```
Component ──► api.get('/leads')
                 │
                 ▼
          apiFetch('/leads', { method: 'GET' })
                 │
                 ├── credentials: 'include'
                 ├── headers: { Content-Type: 'application/json' }
                 │
                 ▼
          Backend → 200 OK
                 │
                 ▼
          Component handles response.json()
```

### 401 Flow
```
Component ──► api.get('/leads')
                 │
          backend returns 401
                 │
                 ▼
          apiFetch detects 401
                 │
                 ├── localStorage.removeItem('user')
                 ├── localStorage.removeItem('tenant')
                 └── window.location.reload()
                          │
                          ▼
                    Login page
```

### Webhook/Unauthenticated Flow (Chat Routes)
```
Facebook Webhook ──► POST /api/chat/messages/to-lead
                         │
                    optionalAuth
                         │
                    token: none → req.tenantId = null
                         │
                         ▼
                    tenantFilter(req) → { tenantId: null }
                         │
                         ▼
                    Prisma: where: { tenantId: null }
                         │
                    Returns: [] (empty)
```

---

## Risks and Mitigations

### 1. SameSite Cookie Behavior
- **Risk**: `sameSite: 'strict'` may prevent cookie sending on initial page load after redirect from external link
- **Status**: Acceptable. The auth flow calls `/auth/me` on mount with credentials: 'include' → if cookie is missing, it logs out → user sees login. Same as current behavior.

### 2. CORS in Development
- **Risk**: `localhost:5173` → `localhost:3001` is cross-origin. Credentials require specific CORS config.
- **Mitigation**: Already configured: `cors({ origin: true, credentials: true })` in server.js.

### 3. Background Polling (useNotifications)
- **Risk**: The hook polls every 30s. If session expires, the 401 handler will reload the page mid-use.
- **Mitigation**: Acceptable — this is correct behavior. User should be redirected to login when session expires.

### 4. File Uploads
- **Risk**: Forgetting to exclude Content-Type on FormData uploads breaks multipart boundary
- **Mitigation**: `api.upload()` explicitly strips Content-Type. All existing upload calls use this pattern.

### 5. SequenceList prop drilling
- **Risk**: SequenceList.jsx receives `getAuthHeaders` as a prop from AutomationPage.jsx. After refactor, this prop must be removed.
- **Mitigation**: When refactoring AutomationPage.jsx, remove the prop passing. SequenceList.jsx imports `api` directly.

### 6. Merge Conflicts
- **Risk**: Multiple files were recently modified for the financial calculator feature
- **Status**: The financial calculator changes (LeadDetailModal, FinanceCalculator, etc.) are already committed. No merge conflicts expected.
