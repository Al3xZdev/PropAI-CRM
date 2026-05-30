# SDD Proposal: Fix Auth Token Flow and Tenant Isolation

## Intent

Complete the **migration from localStorage token storage to httpOnly cookies** that was started but never finished, fix the **critical tenant data leak** caused by `optionalAuth` ignoring missing tenant IDs, and add **seed demo data** so the application is usable out of the box.

## Current State

### Problem 1 — Auth Migration Left Incomplete
- `LoginPage.jsx` was updated to use `credentials: 'include'` and comment `// Ya NO guardamos tokens en localStorage`
- But the login endpoint **does not return the accessToken in the response body**, and LoginPage **does not save it to localStorage**
- All other 15 components/hooks still read `localStorage.getItem('accessToken')` (37 total occurrences)
- Only `App.jsx` and `LoginPage.jsx` use `credentials: 'include'`
- Result: every API call from any component other than App.jsx sends `Authorization: Bearer ` (empty) with no cookies → **401 on every request**

### Problem 2 — Critical Tenant Isolation Leak (Security)
- 17 chat endpoints use `optionalAuth` middleware
- When the frontend sends an empty Bearer token without cookies, `optionalAuth` never sets `req.tenantId`
- Prisma queries use `where: { tenantId: req.tenantId }` where `tenantId` is `undefined`
- In Prisma, `undefined` in a `where` clause means **ignore the filter**
- Result: queries return ALL conversations across ALL tenants
- This is why conversations from "Diego Ramirez" appear in a different account's inbox

### Problem 3 — No Demo Data
- `backend/prisma/seed.js` creates only a tenant and an admin user
- No leads, properties, conversations, or follow-ups exist after seeding
- The application looks empty after first-time setup

## Scope

### In Scope
1. Create `frontend/src/utils/api.js` — centralized fetch wrapper with `credentials: 'include'`, global error handling, and convenience methods
2. Refactor all 15 components/pages/hooks to use the centralized `api.js`
3. Remove all `localStorage.getItem('accessToken')` reads from components
4. Remove or consolidate all local `getAuthHeaders()` definitions
5. Fix `backend/middleware/auth.js` — make `optionalAuth` safe when no token is present
6. Fix `backend/routes/chat.js` — ensure tenant-qualified queries return empty results when tenantId is missing, not all rows
7. Add demo leads, properties, and related seed data to `backend/prisma/seed.js`

### Out of Scope
- Refactoring the backend to use a different auth strategy (JWT, OAuth, etc.)
- Adding automated tests (the project has no testing framework)
- Changing the frontend routing/library (React Router vs current manual state)
- Modifying cookie configuration (sameSite, secure, httpOnly flags stay as they are)

## Approach

### Frontend: Centralized `api.js` Module

Create a single `fetch` wrapper that all components will use:

```js
// frontend/src/utils/api.js
const API_URL = import.meta.env.VITE_API_URL || '/api'

async function apiFetch(endpoint, options = {}) {
  const config = {
    credentials: 'include', // cookies httpOnly se envían automáticamente
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }

  // Si options trae headers, mergear sin pisar Content-Type default
  if (options.headers) {
    config.headers = { ...config.headers, ...options.headers }
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)

  if (response.status === 401) {
    // Token inválido o expirado → redirigir a login
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
    window.location.reload()
    throw new Error('Sesión expirada')
  }

  return response
}

// Convenience methods
export const api = {
  get: (url, opts) => apiFetch(url, { method: 'GET', ...opts }),
  post: (url, body, opts) => apiFetch(url, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: (url, body, opts) => apiFetch(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch: (url, body, opts) => apiFetch(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: (url, opts) => apiFetch(url, { method: 'DELETE', ...opts }),
  // For FormData / file uploads (no Content-Type header)
  upload: (url, formData, opts) => apiFetch(url, { method: 'POST', body: formData, headers: {}, ...opts }),
}
```

Each component will:
1. Import `{ api }` from `../utils/api`
2. Replace `fetch(url, { headers: getAuthHeaders() })` with `api.get('/endpoint')`
3. Remove the local `getAuthHeaders()` function
4. Handle response errors normally (the 401 redirect is handled globally)

### Backend: Safe `optionalAuth`

The `optionalAuth` middleware will be updated to:
- Still NOT fail when no token is present (it's "optional")
- But set `req.tenantId = null` explicitly instead of leaving it `undefined`
- Add a helper function `tenantFilter(req)` that chat routes use:
  ```js
  function tenantFilter(req) {
    return req.tenantId ? { tenantId: req.tenantId } : { tenantId: null }
  }
  ```
  When `tenantId: null`, Prisma returns empty results (no rows have null tenantId in a correct schema) instead of ignoring the filter.

Alternative: make `optionalAuth` return a 401 when used on protected routes. But chat routes intentionally allow unauthenticated access for webhooks (Facebook/Meta webhooks hit these endpoints without auth). So the `tenantFilter` approach is safer.

### Seed Data
Extend `seed.js` to create:
- 2-3 demo properties
- 5-10 demo leads with various statuses
- A few follow-ups for the current date

## Success Criteria

1. Login works and user stays authenticated across page navigation
2. Dashboard shows leads, stats, and follow-ups
3. Inbox shows only conversations belonging to the logged-in tenant
4. CSV import template download works
5. Property detail opens on click
6. All API calls return 200 (not 401)
7. No `accessToken` reads from localStorage in any component
8. Chat endpoints return empty array (not all tenants' data) when unauthenticated

## Risks

| Risk | Mitigation |
|------|------------|
| `sameSite: 'strict'` cookies not sent on cross-origin requests in dev (localhost:5173 → localhost:3001) | CORS config already has `credentials: true`. SameSite strict should work for same-site (sub)domain. Test in dev. |
| `secure: false` cookies not sent by browser on production HTTPS | Only applies in dev. Production sets `secure: true`. |
| Components that use non-JSON payloads (FormData, file uploads) might break with Content-Type header | `api.upload()` helper strips Content-Type so browser can set multipart boundary. |
| `SequenceList.jsx` receives `getAuthHeaders` as a prop from `AutomationPage.jsx` | Refactor to import `api` directly instead of passing the function as prop. |
| Performance: 37+ API call sites need manual refactoring | Each replacement is mechanical. Can batch-replace with search-and-replace for simple cases. |

## Estimated Impact

- **New files**: 1 (`frontend/src/utils/api.js`)
- **Modified files**: ~17 frontend + 3 backend = ~20 files
- **Lines changed**: ~150-200 removed (getAuthHeaders definitions + localStorage reads) + ~50 added (api.js + replacements)

## Next Steps

1. Write detailed specs
2. Design the technical architecture
3. Break into implementation tasks
4. Implement in batches
5. Verify end-to-end
