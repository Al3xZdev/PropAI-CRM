# Workflow & Conventions

## Development

### Prerequisitos

- Node.js 18+
- PostgreSQL (via Supabase)
- Cuenta Cloudinary (para imágenes)

### Setup Inicial

```bash
# Backend
cd backend
cp .env.example .env   # Editar credenciales
npm install
npm run dev            # http://localhost:3001

# Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Scripts Disponibles

Backend (`cd backend`):

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor |
| `npm run db:push` | Sincronizar Prisma schema con DB |
| `node create-demo-user.js` | Crear usuario demo |
| `node create-admin-user.js` | Crear admin user |
| `node reset-password.js` | Reset password |

Frontend (`cd frontend`):

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build producción |
| `npm run vercel` | Deploy a Vercel |
| `npm run vercel:prod` | Deploy a Vercel (producción) |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase) |
| `JWT_SECRET` | ✅ | Secret para firmar tokens |
| `PORT` | ❌ | Puerto (default 3001) |
| `NODE_ENV` | ❌ | `development` / `production` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `FRONTEND_URL` | ❌ | URL del frontend (para CORS) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth |
| `INSTAGRAM_ACCESS_TOKEN` | ❌ | Meta/Instagram API |
| `INSTAGRAM_BUSINESS_USER_ID` | ❌ | Meta/Instagram API |
| `FACEBOOK_ACCESS_TOKEN` | ❌ | Facebook API |
| `FACEBOOK_PAGE_ID` | ❌ | Facebook API |
| `WHATSAPP_PHONE_NUMBER_ID` | ❌ | WhatsApp API |
| `WHATSAPP_ACCESS_TOKEN` | ❌ | WhatsApp API |
| `RESEND_API_KEY` | ❌ | Email service (Resend) |

### Frontend (`frontend/.env`)

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `VITE_API_URL` | ❌ | API base URL (default `/api`) |

## Database

```bash
# Sync Prisma schema with PostgreSQL
cd backend
npm run db:push
```

⚠️ Siempre usar `db push`, no `migrate dev`. `db push` es seguro con datos
existentes y no genera conflictos de migración.

### Schema Updates

1. Editar `backend/prisma/schema.prisma`
2. `npm run db:push`
3. Opcional: reiniciar servidor

## Deployment

### Vercel (Frontend)

```bash
cd frontend
npm run vercel           # Preview
npm run vercel:prod      # Producción
```

### Vercel (Backend)

El backend incluye configuración en `backend/.vercel/` y puede deployarse
como Serverless Function en Vercel.

## Git Conventions

- **Commits**: convencionales (`feat:`, `fix:`, `docs:`, `refactor:`, etc.)
- **No AI attribution**: no incluir "Co-Authored-By" en commits
- **Idioma**: mensajes en español o inglés (consistente con el proyecto)

## Troubleshooting

### Prisma: "Column does not exist"

Usar `db push` en lugar de `migrate dev`. Si el schema se desincronizó:

```bash
npx prisma db push --accept-data-loss
```

### Auth: Sesión expirada

Las cookies httpOnly no se ven en DevTools. Verificar:
1. El backend está corriendo
2. `.env` tiene `JWT_SECRET` configurado
3. La cookie `accessToken` se envió en el login (ver Network tab)

### Imágenes no se ven

El middleware sirve `/uploads` como static. Si la URL es local:
```
http://localhost:3001/uploads/nombre-archivo
```

Para URLs externas, verificar Cloudinary config.

### CORS Errors

El backend acepta cualquier origen (`origin: true`). Si hay problemas,
verificar que el frontend envía `credentials: 'include'`.
