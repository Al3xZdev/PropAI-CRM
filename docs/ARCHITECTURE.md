# Architecture

## Overview

Sistema CRM inmobiliario multi-tenant con generación de contenido IA. SPA con
backend Express y frontend React, auth por cookies httpOnly, PostgreSQL con
Prisma ORM sobre Supabase.

```
┌──────────────┐     httpOnly cookie     ┌──────────────┐
│   Frontend   │ ◄──────────────────────► │   Backend    │
│  React/Vite  │     JSON REST API        │ Express/Prisma│
│  Tailwind    │     /api/*               │  PostgreSQL  │
└──────────────┘                          └──────┬───────┘
       │                                         │
       │                                          ├── Cloudinary (files)
       │                                          ├── Resend (email)
       │                                          ├── Meta API (social)
       │                                          └── Supabase (DB)
       │
       └── Vercel deploy ───────────────────► Express on Vercel
```

## Multi-Tenant

Cada `Tenant` es una agencia inmobiliaria independiente. Todos los modelos
tienen un `tenantId` que los aísla. El middleware `requireAuth` extrae el
tenant del JWT y lo inyecta en `req.tenantId`.

Dos tenants pueden tener usuarios con el mismo email — la unicidad es
`@@unique([tenantId, email])`.

### Tenancy Flow

1. User login → se genera JWT con `{ id, email, role, tenantId }`
2. JWT se envía como cookie `httpOnly` (no localStorage)
3. Cada request → `requireAuth` → decodifica JWT → `req.tenantId`
4. Routes usan `req.tenantId` en todos los Prisma queries

### Auth

- **Access token**: 30 minutos, en cookie `accessToken`
- **Refresh token**: 7 días, en cookie `refreshToken`, con rotación
- Logout revoca el refresh token y limpia cookies
- `requireAuth` (middleware): falla si no hay token válido
- `optionalAuth`: no falla, pero deja `req.tenantId = null`
- `tenantFilter(req)`: helper que evita data leak entre tenants

### Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Full access, puede crear/modificar usuarios y permisos |
| `manager` | Puede asignar leads, crear/editar propiedades y leads |
| `agent` | Puede crear/editar propiedades y leads, no puede eliminar ni administrar |

El middleware `rbac.js` define exactamente qué método + ruta necesita qué rol.

## Security

- **Helmet**: Content-Security-Policy restrictiva, HSTS 1 año, frameguard deny
- **CORS**: con credentials y `origin: true`
- **Cookies httpOnly**: el frontend NUNCA tiene acceso al token
- **Rate limiting**: auth (10 intentos/15min), general (100/min), rates (30/min)
- **RBAC en writes**: chequea método + ruta contra `WRITE_PERMISSIONS`

## State Management

No hay Redux/Zustand. El estado vive en `App.jsx` con `useState` y se pasa
como props a los componentes. Para estado global menor:

- `useNotifications` → cola de notificaciones toast
- `useTheme` → dark/light mode con CSS variables

## Background Jobs

- **Automation Service** (`services/automationService.js`): cron cada 30s,
  procesa secuencias de leads (WhatsApp, Messenger, Email)
- **Scheduler** (`services/scheduler.js`): cron cada 30s, publica posts
  programados en redes sociales

## External Services

| Servicio | Uso | Archivo clave |
|----------|-----|---------------|
| **Cloudinary** | Almacenamiento de imágenes | `services/cloudinaryService.js` |
| **Resend** | Envío de emails | `services/emailService.js` |
| **Supabase** | Base de datos PostgreSQL | `services/db.js` |
| **Meta/Instagram** | Publicación en redes | `services/instagramPublisher.js` |
| **n8n** | Workflows automatizados | Root `.json` files |
