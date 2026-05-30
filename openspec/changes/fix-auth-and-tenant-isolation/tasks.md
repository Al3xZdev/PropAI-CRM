# SDD Tasks: Fix Auth Token Flow and Tenant Isolation

## Review Workload Forecast

- **Total files changed**: ~20 (1 new, 19 modified)
- **Estimated lines changed**: ~250 (additions + removals)
- **400-line budget risk**: Low (well under limit)
- **Decision needed before apply**: No (within budget)

---

## T-01: Create centralized api.js module

**Requirement**: REQ-01
**Files**: `frontend/src/utils/api.js` (NEW)
**Estimated lines**: ~40

### Actions
1. Create `frontend/src/utils/api.js` with:
   - `apiFetch()` function with `credentials: 'include'`, default JSON headers, 401 handler
   - `api` object with `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.upload()` methods
   - Export both `apiFetch` and `api`

### Verification
- Import `{ api }` in any component and call `api.get('/api/health')` → returns response without 401
- 401 handler clears localStorage and reloads

---

## T-02: Fix backend tenant isolation

**Requirement**: REQ-03
**Files**: `backend/middleware/auth.js`, `backend/routes/chat.js`
**Estimated lines**: ~40

### Actions
1. Add `tenantFilter(req)` helper to `backend/middleware/auth.js`
2. Update `optionalAuth` to explicitly set `req.tenantId = null` when no token is present
3. Export `tenantFilter` from auth.js
4. In `backend/routes/chat.js`, replace ALL `where: { tenantId: req.tenantId }` with `where: tenantFilter(req)`
5. Import `tenantFilter` in chat routes

### Verification
- With no auth cookies: `GET /api/chat/conversations` returns `{ conversations: [], totalUnread: 0 }` (not all tenants' data)
- With valid auth: same endpoint returns only this tenant's conversations
- All 17 chat endpoints still work for authenticated requests

---

## T-03: Seed demo data

**Requirement**: REQ-04
**Files**: `backend/prisma/seed.js`
**Estimated lines**: ~80

### Actions
1. Add property creation (3 properties: casa, departamento, terreno)
2. Add lead creation (8 leads with mixed statuses, some linked to properties)
3. Add follow-up creation (at least 1 for current date)
4. Make all creations idempotent (check by unique fields before creating)

### Verification
- Running `node backend/prisma/seed.js` completes without errors
- Second run does not create duplicates
- After seeding, DB has: 1 tenant, 1 admin user, 3+ properties, 8+ leads, 1+ follow-up

---

## T-04: Refactor Group A — Simple replacements

**Requirement**: REQ-02
**Files**: 
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/HistoryPage.jsx`
- `frontend/src/pages/LeadsPage.jsx`
- `frontend/src/components/leads/LeadDetailModal.jsx`
- `frontend/src/components/followups/NewFollowUpModal.jsx`
- `frontend/src/pages/DocumentsPage.jsx`
- `frontend/src/components/contracts/LeadContractsHistory.jsx`

**Estimated lines**: ~60

### Actions
Per file:
1. Add `import { api } from '../utils/api'` (adjust relative path)
2. Replace `getAuthHeaders()` definition with import
3. Replace each `fetch(url, { headers: getAuthHeaders(), ... })` with `api.get/post/put/delete()`
4. For file downloads (.blob), use `apiFetch()` directly or `api.get()` with response `.blob()`
5. Remove the local `getAuthHeaders()` function
6. Remove the local `API_URL` constant if it was only used for these fetches

### Verification
- Build succeeds (`cd frontend && npm run build`)
- Each page loads data without 401 errors

---

## T-05: Refactor Group B — Mixed methods + prop cleanup

**Requirement**: REQ-02
**Files**:
- `frontend/src/pages/AutomationPage.jsx`
- `frontend/src/components/automation/SequenceBuilderV2.jsx`
- `frontend/src/components/automation/SequenceList.jsx`
- `frontend/src/components/ScheduleModal.jsx`
- `frontend/src/components/ScheduleTimeline.jsx`
- `frontend/src/pages/agents/AgentsPage.jsx`

**Estimated lines**: ~80

### Actions
Same pattern as Group A, plus:
- `SequenceList.jsx`: Remove `getAuthHeaders` prop, import `api` directly. Update `AutomationPage.jsx` to stop passing the prop.
- `ScheduleTimeline.jsx` and `ScheduleModal.jsx`: Handle file uploads with `api.upload()`

### Verification
- Build succeeds
- Automation sequences load, create, and assign leads
- Schedule create and timeline load work
- Agents page loads workload and assignments

---

## T-06: Refactor Group C — Complex/chat-related

**Requirement**: REQ-02
**Files**:
- `frontend/src/pages/InboxPage.jsx`
- `frontend/src/components/ChatModal.jsx`
- `frontend/src/components/GenerateContractModal.jsx`
- `frontend/src/components/PropertyImportCSV.jsx`
- `frontend/src/hooks/useNotifications.jsx`

**Estimated lines**: ~50

### Actions
Same pattern as Group A, plus:
- `PropertyImportCSV.jsx`: CSV template download uses `.blob()` response
- `GenerateContractModal.jsx`: Multiple auth patterns (headers + direct token reads)
- `useNotifications.jsx`: 6 occurrences of token reads, background polling must not cause infinite reload loops on 401

### Verification
- Build succeeds
- Inbox loads conversations (only for this tenant)
- Chat modal sends and receives messages
- Contract generation and download work
- CSV import template downloads
- Notifications poll without errors

---

## T-07: Cleanup App.jsx and LoginPage.jsx

**Requirement**: REQ-05
**Files**:
- `frontend/src/App.jsx`
- `frontend/src/pages/LoginPage.jsx`

**Estimated lines**: ~20

### Actions
1. `LoginPage.jsx`: Verify no accessToken storage. Update comments to be final.
2. `App.jsx`: 
   - Remove the 7 inline fetch calls that still read localStorage (lines 209, 247, 260, 273, 306, 340, 419) — these are legacy code paths that are no longer used (the real fetch calls use getAuthHeaders() / credentials: 'include')
   - OR replace them with api.js calls

### Verification
- Login still works, user stays logged in
- Build succeeds

---

## Task Dependencies

```
T-01 (api.js)
  ├── T-04 (Group A) ──→ T-05 (Group B) ──→ T-06 (Group C)
  │
  └── T-07 (cleanup)
      
T-02 (backend) ── independent
T-03 (seed) ──── independent
```

T-01 must be done first (Group A/B/C depend on it).
T-02 and T-03 are fully independent — can be done in parallel or any order.
T-07 can be done any time.
