<div align="center">

# Prop.AI CRM

**Intelligent Real Estate CRM with AI-Powered Content Automation**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

</div>

---

## Overview

Prop.AI CRM is a full-stack, multi-tenant SaaS platform designed for real estate businesses. It combines traditional CRM capabilities — lead management, agent tracking, commission management, and automated follow-ups — with AI-powered content generation and social media publishing.

Built with a production-grade architecture, it is designed to be deployed, maintained, and scaled by engineering teams.

### Key Capabilities

| Area | Description |
|------|-------------|
| **Lead Management** | Multi-channel capture (Facebook, Instagram, WhatsApp, Web, Phone, Email), AI-powered scoring, stage pipeline tracking |
| **Agent Management** | Workload balancing, performance analytics, commission tracking with pending/paid lifecycle |
| **Content Automation** | AI-generated Instagram posts, captions, hashtags, and image compositions with direct publishing |
| **Follow-up Sequences** | Automated multi-step lead nurturing with configurable timing and message templates |
| **Contract Generation** | Dynamic Word document creation from templates with property and agent data injection |
| **Commission System** | Automatic commission creation on deal closure, admin payment management, monthly reporting |
| **Notifications** | Real-time in-app notifications with read/unread state and overdue alerts |
| **Document Management** | Hierarchical folder system with file upload, storage, and organization |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│                   React 18 + Vite + Tailwind                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────▼──────────────────────────────────┐
│                    API Server (Express.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   RBAC   │  │  Rate    │  │  Audit   │   │
│  │  (JWT)   │  │ Middleware│  │ Limiter  │  │  Logger  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Route Handlers (17 modules)              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Business Logic (22 services)               │   │
│  └─────────────────────────────────────────────────────┘   │
└──────┬───────────┬───────────┬───────────┬─────────────────┘
       │           │           │           │
┌──────▼───┐ ┌─────▼────┐ ┌───▼───┐ ┌────▼─────┐
│ Prisma   │ │Cloudinary│ │ Resend│ │ Instagram│
│  (ORM)   │ │  (CDN)   │ │(Email)│ │  (API)   │
└──────┬───┘ └──────────┘ └───────┘ └──────────┘
       │
┌──────▼───────────────────────────────────┐
│         PostgreSQL (Supabase)             │
│    Multi-tenant with Row-Level Security   │
└──────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| **Node.js 18+** | Runtime environment |
| **Express.js 4.18** | REST API framework |
| **Prisma 7** | Type-safe ORM with schema-first approach |
| **PostgreSQL** | Primary database (via Supabase) |
| **JWT (httpOnly cookies)** | Authentication with access + refresh token rotation |
| **Passport.js** | OAuth 2.0 (Google) integration |
| **Helmet.js** | Security headers (CSP, HSTS, X-Frame-Options) |
| **Cloudinary** | Image/file CDN with on-the-fly transformations |
| **Resend** | Transactional email delivery |
| **docxtemplater** | Dynamic Word document generation |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | Component-based UI with hooks |
| **Vite 5** | Build tool with instant HMR |
| **Tailwind CSS 3.4** | Utility-first styling with dark theme |
| **Lucide React** | Consistent icon system |
| **Sonner** | Toast notifications |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| **Supabase** | Managed PostgreSQL + file storage |
| **Vercel** | Frontend deployment and CDN |
| **GitHub Actions** | CI/CD pipeline (recommended) |

---

## Project Structure

```
prop-ai-crm/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (10+ models)
│   │   └── migrations/            # Schema versioning
│   ├── routes/                    # API endpoint handlers
│   │   ├── auth.js                # Authentication & OAuth
│   │   ├── leads.js               # Lead CRUD & pipeline
│   │   ├── properties.js          # Property management
│   │   ├── commissions.js         # Commission tracking
│   │   ├── automation.js          # Follow-up sequences
│   │   ├── schedule.js            # Content scheduling
│   │   ├── content.js             # AI content generation
│   │   ├── contracts.js           # Document generation
│   │   ├── chat.js                # Real-time messaging
│   │   ├── stats.js               # Analytics & reporting
│   │   └── ...                    # 17 route modules total
│   ├── services/                  # Business logic layer
│   │   ├── commissionService.js   # Commission calculations
│   │   ├── leadScoringService.js  # AI lead scoring
│   │   ├── automationService.js   # Sequence execution
│   │   ├── contentGenerator.js    # Content templates
│   │   ├── instagramPublisher.js  # Instagram API integration
│   │   ├── contractService.js     # Document generation
│   │   └── ...                    # 22 service modules total
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   ├── rbac.js                # Role-based access control
│   │   ├── rateLimiter.js         # API rate limiting
│   │   ├── auditLogger.js         # Operation logging
│   │   └── errorHandler.js        # Global error handling
│   └── server.js                  # Application entry point
│
├── frontend/
│   └── src/
│       ├── pages/                 # Route-level components
│       │   ├── Dashboard.jsx      # Analytics overview
│       │   ├── LeadsPage.jsx      # Lead management
│       │   ├── InboxPage.jsx      # Messaging center
│       │   ├── DocumentsPage.jsx  # Document management
│       │   ├── AutomationPage.jsx # Sequence builder
│       │   ├── LoginPage.jsx      # Authentication
│       │   └── agents/            # Agent management
│       ├── components/            # Reusable UI components
│       │   ├── PropertyForm.jsx   # Property CRUD
│       │   ├── PropertyCard.jsx   # Property display
│       │   ├── ChatModal.jsx      # Real-time chat
│       │   ├── Sidebar.jsx        # Navigation
│       │   └── ...                # 23 components total
│       ├── hooks/                 # Custom React hooks
│       └── utils/                 # API client & helpers
│
└── docs/                          # Documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 15+ (or Supabase account)
- **Cloudinary** account (for image storage)
- **Resend** API key (for email)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Al3xZdev/prop-ai-crm.git
   cd prop-ai-crm
   ```

2. **Backend setup**

   ```bash
   cd backend
   npm install
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your database URL, JWT secret, API keys
   
   # Push database schema
   npx prisma db push
   
   # Start development server
   npm run dev
   ```

   Backend runs at `http://localhost:3001`

3. **Frontend setup**

   ```bash
   cd frontend
   npm install
   
   # Start development server
   npm run dev
   ```

   Frontend runs at `http://localhost:5173`

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/propai_crm"

# Authentication
JWT_SECRET="your-64-character-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# External Services
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
RESEND_API_KEY="your-resend-key"

# Instagram (optional)
INSTAGRAM_ACCESS_TOKEN="your-instagram-token"
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/google` | Google OAuth login |

### Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List all leads |
| POST | `/api/leads` | Create new lead |
| PUT | `/api/leads/:id` | Update lead |
| PUT | `/api/leads/:id/status` | Change lead stage |
| DELETE | `/api/leads/:id` | Delete lead |

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List all properties |
| POST | `/api/properties` | Create property |
| PUT | `/api/properties/:id` | Update property |
| DELETE | `/api/properties/:id` | Delete property |

### Commissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/commissions` | Monthly summary |
| GET | `/api/commissions/detail` | Detailed commission list |
| POST | `/api/commissions` | Create manual commission |
| PUT | `/api/commissions/:id` | Update status (pending → paid) |
| GET | `/api/commissions/config` | Agent commission rates |
| POST | `/api/commissions/config` | Set agent commission rate |

### Content & Scheduling

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/content/generate` | Generate AI content |
| POST | `/api/schedule/create` | Schedule publication |
| GET | `/api/schedule/property/:id` | Get property schedule |
| POST | `/api/schedule/manual/:id` | Manual schedule |

> Full API documentation available at `/api/docs` (Swagger) — coming soon.

---

## Features Deep Dive

### Lead Pipeline

```
Nuevo → Contactado → Respondió → Propuesta → Negociación → Cerrado / Perdido
```

- **Auto-assignment** to agents based on workload balancing
- **AI scoring** based on recency, engagement, and source quality
- **Status history** audit trail for every stage transition
- **Multi-channel tracking** (Facebook, Instagram, WhatsApp, Web, Phone, Email)

### Commission Management

- **Automatic creation** when a lead reaches "Cerrado" status
- **Configurable rates** per agent (default: 3%)
- **Status lifecycle**: Pending → Paid with timestamp tracking
- **Monthly reporting** with per-agent breakdowns
- **Overdue alerts** for commissions pending > 7 days

### Automated Follow-ups

- **Multi-step sequences** with configurable timing
- **Channel-specific messages** (WhatsApp, Email, SMS)
- **Pause/resume** automation per lead
- **Exit conditions** (lead responds, deal closed, etc.)

### Content Generation

- **AI-powered captions** optimized for each platform
- **Hashtag generation** based on property type and location
- **Image composition** with property photos and branding
- **Direct publishing** to Instagram via Graph API
- **Publication scheduling** with conflict detection

---

## Security

- **JWT Authentication** with httpOnly secure cookies (no localStorage)
- **Token rotation** on refresh (refresh token invalidation after use)
- **RBAC** with 4 roles: superadmin, admin, manager, agent
- **Multi-tenant isolation** via tenantId on every database query
- **Rate limiting** on auth endpoints and general API
- **Helmet.js** security headers (CSP, HSTS, X-Frame-Options)
- **Audit logging** for all mutating operations
- **Input validation** on all API endpoints

---

## Deployment

### Production Build

```bash
# Backend
cd backend
NODE_ENV=production node server.js

# Frontend
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```

### Recommended Stack

| Layer | Service | Reason |
|-------|---------|--------|
| **Database** | Supabase (PostgreSQL) | Managed, free tier, real-time |
| **Backend** | Railway / Render | Easy Node.js deployment |
| **Frontend** | Vercel | Zero-config React deployment |
| **Storage** | Cloudinary | Image CDN with transformations |
| **Email** | Resend | Modern transactional email |

---

## Roadmap

- [ ] WhatsApp Business API integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Webhook system for third-party integrations
- [ ] Batch operations (mass email, mass assignment)
- [ ] Two-factor authentication (2FA)
- [ ] API rate limit dashboard

---

## Contributing

This is a proprietary project. For contribution inquiries, please contact the maintainers.

---

## License

**Proprietary Software** — All rights reserved.

This software is owned by [Alejandro Zdev](https://github.com/Al3xZdev). Unauthorized copying, modification, distribution, or use of this software is strictly prohibited without explicit written permission.

For licensing inquiries, please contact: **[your-email@example.com]**

---

<div align="center">

**Built with precision by [Alejandro Zdev](https://github.com/Al3xZdev)**

*Connecting real estate professionals with intelligent automation*

</div>
