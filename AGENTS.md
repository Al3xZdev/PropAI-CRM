# Prop.AI CRM — Agent Guide

## Project Overview
- **Prop.AI CRM** — Intelligent Real Estate CRM with AI-Powered Content Automation
- **Backend**: Express.js + Prisma 7 (PostgreSQL) — runs on `http://localhost:3001`
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 3.4 — runs on `http://localhost:5173`
- **Database**: PostgreSQL 15+ via Supabase, accessed through Prisma ORM

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Database sync (after schema changes)
cd backend && npx prisma db push

# Production build
cd frontend && npm run build
```

## Key Conventions

- **No commits** until explicitly requested by user
- **Step-by-step** development with user verification
- **Test after changes** — verify build succeeds before calling it done
- **Feature branches** with atomic commits (never direct to main)

## Database

- **Schema**: `backend/prisma/schema.prisma`
- **Sync command**: `npx prisma db push` (not `migrate dev` — existing data requires push)
- **Hosting**: Supabase (PostgreSQL)
- **Multi-tenant**: Every table has `tenantId` foreign key for isolation

## Architecture Patterns

### Backend Layers
- **Routes** → HTTP handlers (request validation, response formatting)
- **Services** → Business logic (commission calculation, lead scoring, content generation)
- **Middleware** → Cross-cutting concerns (auth, RBAC, rate limiting, audit logging)
- **Prisma Client** → Data access layer (auto-generated from schema)

### Frontend Components
- **Pages** → Route-level containers (Dashboard, Leads, Agents, etc.)
- **Components** → Reusable UI elements (PropertyCard, ChatModal, etc.)
- **Hooks** → Custom logic (useTheme for dark mode)
- **Utils** → API client (fetch wrapper with auth), helpers

### Authentication
- JWT with httpOnly secure cookies (no localStorage)
- Access token + refresh token rotation
- Google OAuth 2.0 via Passport.js
- RBAC: superadmin, admin, manager, agent

### Folder System (Google Drive style)
- Folder model uses `parentId` for hierarchy (null = root)
- Deleting folders moves documents to root (NOT deleted)
- Frontend builds tree visually from flat folder list
- Key files:
  - `backend/routes/folders.js` — CRUD with hierarchy support
  - `frontend/src/pages/DocumentsPage.jsx` — Complete UI

## Known Issues / Gotchas

- **Prisma drift**: Use `db push` not `migrate dev` with existing data
- **Prisma 7**: Requires explicit `PrismaPg` driver adapter for PostgreSQL
- **`.env` values**: May be quoted in PowerShell — use `.Trim('"')` when parsing
- **Cloudinary/Supabase**: Configured via `backend/.env`
- **Instagram token**: Expires periodically — check and refresh as needed

## External Services

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| **Supabase** | PostgreSQL hosting + file storage | `backend/.env` |
| **Cloudinary** | Image/file CDN with transformations | `backend/.env` |
| **Resend** | Transactional email delivery | `backend/.env` |
| **Instagram Graph API** | Social media publishing | `backend/.env` |
| **Google OAuth** | Social login | `backend/.env` |

## API Routes (17 modules)

- `auth.js` — Authentication & OAuth
- `leads.js` — Lead CRUD & pipeline management
- `properties.js` — Property management
- `commissions.js` — Commission tracking & payments
- `automation.js` — Follow-up sequences
- `schedule.js` — Content scheduling
- `content.js` — AI content generation
- `contracts.js` — Document generation
- `chat.js` — Real-time messaging
- `stats.js` — Analytics & reporting
- `notifications.js` — In-app notifications
- `documents.js` — Document management
- `folders.js` — Folder hierarchy
- `assignment.js` — Lead assignment
- `emails.js` — Email sending
- `permissions.js` — Permission management
- `followups.js` — Follow-up tracking

## Service Modules (22 modules)

Business logic layer handling commission calculations, lead scoring, content generation, automation execution, Instagram publishing, contract generation, and more.
