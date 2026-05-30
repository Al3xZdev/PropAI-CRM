# Backend

Express.js + Prisma 7.x + PostgreSQL (Supabase). Puerto 3001.

## Project Structure

```
backend/
├── routes/           # Route handlers (controllers)
├── middleware/       # Auth, RBAC, rate limiting, error handling
├── services/         # Business logic, external integrations
├── prisma/           # Schema + migrations
├── templates/        # Document templates (contratos, etc.)
├── uploads/          # Archivos locales (fallback)
├── scripts/          # Scripts de utilidad (DB, debug)
└── server.js         # Entry point
```

## Routes (`backend/routes/`)

### Auth — `/api/auth`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/auth/login` | POST | No | Login multi-tenant (email + password) |
| `/auth/refresh` | POST | No | Refrescar access token con rotación |
| `/auth/logout` | POST | Sí | Invalidar refresh token + limpiar cookies |
| `/auth/me` | GET | Sí | Info del usuario actual |
| `/auth/admin/create-user` | POST | Sí (admin) | Crear usuario en el tenant |
| `/auth/admin/users` | GET | Sí (admin) | Listar usuarios del tenant |
| `/auth/admin/users/:id` | PUT | Sí (admin) | Actualizar usuario |
| `/auth/admin/users/:id` | DELETE | Sí (admin) | Desactivar usuario (soft delete) |

### Properties — `/api/properties`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/properties` | GET | Listar propiedades del tenant |
| `/properties` | POST | Crear propiedad (con imágenes) |
| `/properties/:id` | GET | Detalle de propiedad |
| `/properties/:id` | PUT | Actualizar propiedad |
| `/properties/:id` | DELETE | Eliminar propiedad (solo admin) |

### Content — `/api/content`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/content/generate` | POST | Generar contenido completo IA |
| `/content/generate/platform/:platform` | POST | Regenerar copys para una plataforma |

### Schedule — `/api/schedule`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/schedule/create` | POST | Crear calendario de publicaciones |
| `/schedule/:id/publish/:postIndex` | POST | Publicar un post |
| `/schedule/:id` | DELETE | Eliminar schedule |
| `/schedule/posts` | GET | Obtener posts programados |

### Leads — `/api/leads`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/leads` | GET | Listar leads (filtros, paginación) |
| `/leads` | POST | Crear lead |
| `/leads/:id` | GET | Detalle lead |
| `/leads/:id` | PUT | Actualizar lead |
| `/leads/:id` | DELETE | Eliminar lead (admin/manager) |
| `/leads/stats/summary` | GET | Estadísticas de leads |
| `/leads/:id/assign` | POST | Asignar lead a agente |
| `/leads/recent` | GET | Últimos leads creados |

### Automation — `/api/automation`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/automation` | GET | Listar secuencias |
| `/automation` | POST | Crear secuencia |
| `/automation/:id` | GET | Detalle secuencia |
| `/automation/:id` | PUT | Actualizar secuencia |
| `/automation/:id` | DELETE | Eliminar secuencia |
| `/automation/leads/:leadId/sequences` | GET | Secuencias de un lead |
| `/automation/test-trigger` | POST | Test manual de secuencia |

### Chat — `/api/chat`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/chat/webhook/:channel` | GET/POST | No | Webhook público (Messenger/WhatsApp) |
| `/chat/messages` | GET | Sí | Mensajes recientes |
| `/chat/send` | POST | Sí | Enviar mensaje |
| `/chat/conversations` | GET | Sí | Listar conversaciones |
| `/chat/conversations/:id` | GET | Sí | Detalle conversación |
| `/chat/conversations/:id/assign` | POST | Sí | Asignar conversación |

### Contracts — `/api/contracts`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/contracts` | POST | Sí | Generar contrato |
| `/contracts` | GET | Sí | Listar contratos |
| `/contracts/:id` | GET | Sí | Detalle contrato |
| `/contracts/:id` | DELETE | Sí | Eliminar contrato |
| `/contracts/:id/download` | GET | No* | Descargar PDF (*usa query param `?token=`) |

### Notifications — `/api/notifications`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/notifications` | GET | Listar notificaciones |
| `/notifications/:id/read` | PATCH | Marcar como leída |
| `/notifications/read-all` | POST | Marcar todas como leídas |
| `/notifications/unread-count` | GET | Contador de no leídas |

### Stats — `/api/stats`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/stats/dashboard` | GET | Dashboard stats (leads, propiedades, etc.) |
| `/stats/leads-by-source` | GET | Leads agrupados por fuente |
| `/stats/automation-performance` | GET | Performance de secuencias |
| `/stats/activity-timeline` | GET | Timeline de actividad |

### Emails — `/api/emails`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/emails` | GET | Listar emails |
| `/emails/send` | POST | Enviar email (vía Resend) |
| `/emails/:id/thread` | GET | Hilo de conversación |
| `/emails/reply` | POST | Responder email |

### Follow-ups — `/api/followups`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/followups` | GET | Listar follow-ups |
| `/followups` | POST | Crear follow-up |
| `/followups/:id/complete` | PATCH | Marcar como completado |

### Documents — `/api/documents`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/documents` | GET | Listar documentos |
| `/documents/upload` | POST | Subir documento |
| `/documents/:id` | GET | Descargar documento |
| `/documents/:id` | DELETE | Eliminar documento |
| `/documents/generate/contract` | POST | Generar documento de contrato |

### Folders — `/api/folders`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/folders` | GET | Listar carpetas (jerarquía) |
| `/folders` | POST | Crear carpeta |
| `/folders/:id` | PUT | Renombrar/mover carpeta |
| `/folders/:id` | DELETE | Eliminar carpeta (mueve docs a root) |

### Permissions — `/api/permissions`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/permissions` | GET | Sí | Obtener permisos del usuario |
| `/permissions/user/:userId/role` | PUT | Admin | Cambiar rol de usuario |
| `/permissions/user/:userId` | PUT | Admin | Actualizar permisos específicos |

### Assignment — `/api/assignment`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/assignment/assign/:leadId` | POST | Admin/Manager | Asignar lead |
| `/assignment/auto-assign` | POST | Admin/Manager | Auto-asignación round-robin |
| `/assignment/unassign/:leadId` | DELETE | Admin/Manager | Desasignar lead |

### Rates — `/api/rates`
| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/rates` | GET | No | Tipo de cambio USD/ARS (público) |

### Debug — `/api/debug`
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/debug/facebook` | GET | Ver estado de variables Facebook |
| `/debug/me` | GET | Info del usuario autenticado |

### Health
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/test-webhook` | GET | Verificar ngrok |
| `/api/cloudinary/test` | GET | Test conexión Cloudinary |
| `/api/instagram/test` | GET | Test conexión Instagram |

## Middleware (`backend/middleware/`)

| Archivo | Propósito |
|---------|-----------|
| `auth.js` | JWT: extraer token (cookie > header), `requireAuth`, `optionalAuth`, `tenantFilter` |
| `rbac.js` | Role-based access control por método+ruta |
| `rateLimiter.js` | Rate limiting para auth (10/15min) y general (100/min) |
| `errorHandler.js` | `notFoundHandler` + `errorHandler` centralizado |
| `auditLogger.js` | Registro de eventos de auth (login, logout, fallos) |

## Key Services (`backend/services/`)

| Archivo | Propósito |
|---------|-----------|
| `db.js` | Prisma client con adapter PostgreSQL |
| `authService.js` | Generación/verificación de JWT, refresh token con rotación |
| `contentGenerator.js` | Templates de contenido IA (descripciones, copys, emails) |
| `cloudinaryService.js` | Upload de imágenes a Cloudinary |
| `emailService.js` | Envío de emails vía Resend |
| `automationService.js` | Cron que procesa secuencias de leads |
| `scheduler.js` | Cron que publica posts programados |
| `instagramPublisher.js` | Publicación a Instagram vía Meta API |
| `facebookPublisher.js` | Publicación a Facebook vía Meta API |
| `metaService.js` | Meta API wrapper unificado |
| `whatsappService.js` | WhatsApp Business API |
| `messengerService.js` | Messenger API |
| `chatService.js` | Lógica de conversaciones multi-canal |
| `documentService.js` | Generación de documentos (docx, PDF) |
| `contractService.js` | Lógica de contratos |
| `permissionsService.js` | Verificación de permisos |
| `leadScoringService.js` | Score de leads basado en actividad |
| `assignmentService.js` | Lógica de asignación de leads |
| `publicationLog.js` | Log de publicaciones |

## Database

Prisma schema en `backend/prisma/schema.prisma`. PostgreSQL en Supabase.

Para sincronizar cambios en el schema:
```bash
cd backend
npm run db:push
```

⚠️ Usar `db push`, NO `migrate dev` — hay datos existentes y `db push` no
genera conflictos con el schema actual.

## Scripts Útiles

```bash
node create-demo-user.js     # Crear usuario demo
node create-admin-user.js    # Crear admin user
node reset-password.js       # Reset password de un usuario
node check-messages.js       # Debug de mensajes
node debug-user.js           # Debug de usuario
```
