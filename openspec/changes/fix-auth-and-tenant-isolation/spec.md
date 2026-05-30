# SDD Specs: Fix Auth Token Flow and Tenant Isolation

## Overview

Complete the auth migration, fix tenant isolation, and add demo seed data. The app currently sends empty Bearer tokens without cookies on all API calls except login, causing 401 errors and a critical multi-tenant data leak.

---

## REQ-01: Centralized API Client

### Description
Create a single `api.js` module that all frontend components use to communicate with the backend. It must handle cookies automatically, redirect on 401, and support all HTTP methods including file uploads.

### Acceptance Criteria
- AC-01.1: Module exports `api` object with `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.upload()` methods
- AC-01.2: All fetch calls use `credentials: 'include'` automatically
- AC-01.3: No `Authorization` header is set manually — auth happens exclusively via httpOnly cookies
- AC-01.4: On 401 response, the module clears `localStorage('user')` and `localStorage('tenant')` and reloads the page
- AC-01.5: On network error, the error propagates to the caller (no silent swallowing)
- AC-01.6: The `upload()` method omits `Content-Type` so the browser sets the correct multipart boundary
- AC-01.7: No existing API call behavior changes except the auth mechanism

### Scenarios

**Scenario 1: Successful API call**
```
Given the user is logged in (httpOnly cookies set)
When any component calls api.get('/leads')
Then the request includes credentials: 'include'
And cookies are sent automatically
And the response is returned as-is to the caller
```

**Scenario 2: Expired session**
```
Given the user's session has expired
When any component calls api.get('/leads')
And the backend returns 401
Then localStorage('user') and localStorage('tenant') are cleared
And the page reloads (showing login screen)
```

**Scenario 3: File upload**
```
Given the user wants to upload a file via FormData
When a component calls api.upload('/properties/upload', formData)
Then the request does NOT include Content-Type header
And the browser sets the correct multipart/form-data boundary
```

---

## REQ-02: Remove localStorage Token Reads

### Description
Remove all 37 occurrences of `localStorage.getItem('accessToken')` across 15 files. Remove or replace all local `getAuthHeaders()` definitions. Each component must use the centralized `api.js` instead.

### Acceptance Criteria
- AC-02.1: Zero occurrences of `localStorage.getItem('accessToken')` in `frontend/src/`
- AC-02.2: Zero local `getAuthHeaders()` function definitions that read from localStorage
- AC-02.3: Each component's fetch calls are replaced with `api.get()`, `api.post()`, etc.
- AC-02.4: Components that need custom headers (e.g., non-JSON Content-Type) can pass them via the options parameter without breaking the auth flow
- AC-02.5: `SequenceList.jsx` no longer receives `getAuthHeaders` as a prop — it imports `api` directly

### Scenario

**Scenario 1: Dashboard loads its data**
```
Given the user is logged in
When Dashboard.jsx mounts
And it calls api.get('/leads')
And api.get('/followups?range=today')
Then all three parallel requests succeed without 401
And the dashboard displays leads, stats, and follow-ups
```

**Scenario 2: Inbox loads conversations**
```
Given the user is logged in
When InboxPage.jsx mounts
And it calls api.get('/chat/conversations')
Then the request includes credentials: 'include'
And cookies are sent
And optionalAuth receives valid tokens
And only conversations for this tenant are returned
```

---

## REQ-03: Fix Tenant Isolation in Auth Middleware

### Description
Fix `optionalAuth` and all chat routes so that when no valid auth is present, queries return empty results instead of all rows across all tenants.

### Acceptance Criteria
- AC-03.1: `optionalAuth` sets `req.tenantId = null` explicitly when no valid token is present (instead of leaving it undefined)
- AC-03.2: A helper `tenantFilter(req)` returns `{ tenantId: req.tenantId }` when tenantId is set, or `{ tenantId: null }` when not set
- AC-03.3: All Prisma queries in chat routes use `tenantFilter(req)` instead of raw `{ tenantId: req.tenantId }`
- AC-03.4: When `tenantId: null`, Prisma returns empty array (correctly filtered out)
- AC-03.5: Authenticated requests continue to work exactly as before
- AC-03.6: Webhook endpoints (Facebook/Meta) that hit chat routes without auth still work — they return empty data instead of all tenants' data

### Scenarios

**Scenario 1: Authenticated user loads inbox**
```
Given the user is logged in (valid httpOnly cookies)
When InboxPage calls api.get('/chat/conversations')
Then req.tenantId is set from the JWT
And the query filters by tenantId
And only this tenant's conversations are returned
```

**Scenario 2: Unauthenticated request hits chat route**
```
Given no valid auth token exists
When a webhook or unauthenticated request hits GET /api/chat/conversations
Then optionalAuth sets req.tenantId = null (not undefined)
And tenantFilter returns { tenantId: null }
And Prisma returns [] (empty array)
And no conversation data from any tenant is leaked
```

**Scenario 3: Empty Bearer token sent**
```
Given the frontend accidentally sends Authorization: Bearer  (empty)
When the request hits any chat route
Then extractToken returns empty string ''
And optionalAuth treats it as no token (falsy)
And req.tenantId = null
And the query is safe (returns empty)
```

---

## REQ-04: Seed Demo Data

### Description
Extend `backend/prisma/seed.js` to create realistic demo data: properties, leads with various statuses, and follow-ups.

### Acceptance Criteria
- AC-04.1: After running `node backend/prisma/seed.js`, the demo tenant has at least 3 properties
- AC-04.2: At least 8 leads exist with varying statuses (nuevo, contactado, respondio, cerrado)
- AC-04.3: At least one follow-up exists for the current date
- AC-04.4: Leads reference properties where applicable
- AC-04.5: Running the seed again does NOT create duplicates (idempotent via upsert or findFirst checks)

### Scenarios

**Scenario 1: First-time setup**
```
Given a fresh database
When seed.js is executed
Then tenant "Demo RealState" is created
And admin user admin@demo.com / Demo123456 exists
And 3+ properties exist
And 8+ leads exist with mixed statuses
And follow-ups are linked to leads
```

**Scenario 2: Re-running seed**
```
Given the database already has seeded data
When seed.js is executed again
Then no duplicate records are created
And existing data is preserved
```

---

## REQ-05: Login Cleanup

### Description
Clean up the login flow so it no longer references localStorage token storage (since tokens are only in httpOnly cookies).

### Acceptance Criteria
- AC-05.1: LoginPage.jsx stores user and tenant data in localStorage (for UI state) but NOT accessToken
- AC-05.2: The comment about "Ya NO guardamos tokens en localStorage" is updated to be clear and final
- AC-05.3: Login still uses `credentials: 'include'`
- AC-05.4: Backend login route does NOT need to change (it already works correctly — sets cookies + returns user)

---

## Dependency Graph

```
REQ-01 (api.js) → REQ-02 (refactor components) → REQ-03 (backend fix)
                                                      ↓
REQ-05 (login cleanup) ───── independent ──────→  REQ-04 (seed data)
```

- REQ-01 must be done first (api.js is the foundation)
- REQ-02 depends on REQ-01 (components need the new module)
- REQ-03 is independent of REQ-01/02 (backend-only change)
- REQ-04 is fully independent
- REQ-05 is independent but trivial
