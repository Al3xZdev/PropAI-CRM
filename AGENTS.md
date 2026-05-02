# RealEstate AI - Agent Guide

## Project Structure
- **Backend**: Express.js + Prisma (PostgreSQL) - runs on `http://localhost:3001`
- **Frontend**: React + Vite + Tailwind CSS - runs on `http://localhost:5173`
- **Database**: PostgreSQL with Prisma ORM

## Quick Start Commands

```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev

# Database sync (after schema changes)
cd backend && npx prisma db push

# Build frontend for production
cd frontend && npm run build
```

## Key Conventions

- **No commits** until explicitly requested by user
- **Step-by-step** development with user verification
- **Test after changes** - verify build succeeds before calling it done

## Database

- Schema: `backend/prisma/schema.prisma`
- Sync: `npx prisma db push` (not migrate dev - existing data requires push)
- The app uses PostgreSQL with Supabase as hosting provider

## Important Patterns

### Folder System (Google Drive style)
- Folder model uses `parentId` for hierarchy (null = root folder)
- Deleting folders moves documents to root (NOT deleted)
- Frontend builds tree visually from flat folder list
- Key files:
  - `backend/routes/folders.js` - CRUD with hierarchy support
  - `frontend/src/pages/DocumentsPage.jsx` - Complete UI

### Auth
- JWT-based via `backend/middleware/auth.js`
- Tenant isolation enforced on all routes

## Known Issues / Gotchas
- Prisma drift with existing data - use `db push` not `migrate dev`
- React import required: `import React, { useState }` (not just `useState`)
- Cloudinary and Supabase configured via `.env` in backend

## External Services
- **Cloudinary**: Image/file storage (configured in backend/.env)
- **Supabase**: Database hosting + file storage bucket
- **Resend**: Email sending
- **n8n**: Workflow automation (workflows in root .json files)