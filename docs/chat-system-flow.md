# 🔄 Flujo Lógico - Sistema de Chat en Vivo

## Visión General

El sistema permite chatear en tiempo real con los leads directamente desde la aplicación, integrando múltiples canales (WhatsApp, Instagram, Messenger) y mostrando el historial de conversaciones previas.

---

## 📊 Estructura de Datos

### 1. Tabla de Conversaciones (`conversations`)

```javascript
// Nueva tabla en SQLite
{
  id: string,              // UUID
  leadId: string,          // FK a lead
  channel: 'whatsapp' | 'instagram' | 'messenger',
  status: 'active' | 'archived' | 'closed',
  startedAt: datetime,
  lastMessageAt: datetime,
  assignedTo: string | null,  // userId del agente
  createdAt: datetime,
  updatedAt: datetime
}
```

### 2. Tabla de Mensajes (`messages`)

```javascript
{
  id: string,              // UUID
  conversationId: string, // FK a conversation
  leadId: string,         // FK a lead
  direction: 'inbound' | 'outbound',  // entrada o salida
  channel: 'whatsapp' | 'instagram' | 'messenger',
  type: 'text' | 'image' | 'video' | 'audio' | 'document',
  content: string,        // texto o URL del media
  mediaUrl: string | null,
  mediaType: string | null,
  mediaId: string | null,  // ID de Meta para referencia
  status: 'sent' | 'delivered' | 'read' | 'failed',
  sentAt: datetime,
  createdAt: datetime
}
```

### 3. Integración con Leads existentes

```javascript
// En leads.json - nuevo campo
{
  ...existingFields,
  conversationId: string | null,  // conversación activa
  primaryChannel: 'whatsapp' | 'instagram' | 'messenger' | null,
  phone: string | null,           // para WhatsApp
  instagramHandle: string | null, // para Instagram
  messengerId: string | null       // para Messenger
}
```

---

## 🎯 Flujo de Usuario

### Flujo 1: Abrir chat desde un Lead

```
Usuario clickea en lead → Abrir ChatModal
                                      │
                                      ▼
                    ¿El lead tiene conversationId?
                          │
              ┌───────────┴───────────┐
              │ SI                    │ NO
              ▼                       ▼
  Cargar conversaciones    Mostrar "Iniciar Chat"
  y mensajes existentes   (elegir canal)
```

### Flujo 2: Enviar mensaje

```
Usuario escribe mensaje → Click en "Enviar"
                                  │
                                  ▼
                    ¿Tenemos API conectada?
                          │
            ┌───────────────┴───────────────┐
            │ NO (simulado)                │ SI (real)
            ▼                               ▼
  Guardar en DB como "sent"     Llamar a API de Meta
  Mostrar en UI                 │
                                  ▼
                          ¿Envío exitoso?
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            Guardar en DB          Guardar con status
            Mostrar en UI          "failed", mostrar error
```

### Flujo 3: Recibir mensaje (Webhook - Fase 2)

```
Meta envía webhook → Servidor recibe
                          │
                          ▼
              ¿Lead existe en sistema?
                    │
        ┌───────────┴───────────┐
        │ SI                   │ NO
        ▼                      ▼
  Buscar/crear           Crear nuevo lead
  conversation          con datos del remitente
        │                        │
        └────────┬───────────────┘
                 ▼
        Guardar mensaje en DB
                 │
                 ▼
        Notificar al frontend
        (via WebSocket o polling)
                 │
                 ▼
        Mostrar en chat si está abierto
```

---

## 🔌 Integración con APIs de Meta (Fase 2)

### WhatsApp Cloud API

```javascript
// Enviar mensaje
POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
{
  "messaging_product": "whatsapp",
  "to": "{LEAD_PHONE}",
  "type": "text",
  "text": { "body": "Mensaje..." }
}

// Respuesta exitosa
{
  "messages": [{
    "id": "wamid.xxx"  // Guardar como mediaId
  }]
}
```

### Instagram Graph API

```javascript
// Enviar mensaje
POST https://graph.facebook.com/v18.0/{IG_BUSINESS_ID}/messages
{
  "recipient": { "id": "{IG_USER_ID}" },
  "message": { "text": "Mensaje..." }
}
```

---

## 📱 Componentes del Frontend

### 1. ChatModal (nuevo componente)

```javascript
// Props
{
  isOpen: boolean,
  lead: LeadObject,
  onClose: function,
  onSendMessage: function  // callback para enviar
}

// Estados internos
- messages: Message[]      // mensajes de la conversación
- newMessage: string       // texto actual
- loading: boolean         // enviando mensaje
- channel: string          // canal activo (wa/ig/messenger)
- showChannelSelector: boolean
```

### 2. Integración con SendFollowupModal existente

```javascript
// Modificar SendFollowupModal para que también guarde en messages table
// Y añadir opción de "Chat en Vivo" vs "Programar"
```

---

## 🔄 Integración con Flujos Existentes

### 1. Automatizaciones (automation.js)

```javascript
// Cuando se envía un mensaje automatizado:
// 1. Crear/actualizar conversation si no existe
// 2. Guardar mensaje en messages table
// 3.linked al lead existente

{
  ...existingAutomation,
  + saveToChat: true  // nueva opción
}
```

### 2. Leads (leads.js)

```javascript
// Already tiene followUps array
// Ahora también guardamos en messages table para chat histórico unificado

{
  ...existingLead,
  + conversationId: string | null,
  + primaryChannel: string
}
```

### 3.Historial (HistoryPage)

```javascript
// Nuevo tab "Conversaciones" que muestra:
// - Lista de conversaciones activas
// - Último mensaje de cada una
// - Click para abrir ChatModal
```

---

## 🚀 Plan de Implementación por Fases

### Fase 1: Chat Simulado (Inmediato)

**Objetivo**: Mostrar historial existente y enviar mensajes "simulados"

**Archivos a modificar/crear**:
1. `backend/services/chatService.js` - nuevo servicio
2. `backend/routes/chat.js` - nuevo router
3. `frontend/src/components/ChatModal.jsx` - nuevo componente
4. Modificar `LeadsPage.jsx` - integrar ChatModal

**Funcionalidades**:
- Mostrar `lead.followUps` como "historial de chat"
- Enviar mensaje manual → guardar en archivo local
- Simular "enviado" sin API real

### Fase 2: Integración con APIs de Meta

**Archivos a crear**:
1. `backend/services/whatsappService.js`
2. `backend/services/instagramService.js`
3. Webhook endpoint en `server.js`

**Funcionalidades**:
- Envío real de mensajes
- Recepción de webhooks
- Estados de entrega (sent/delivered/read)

### Fase 3: Mejoras

- Notificaciones en tiempo real (WebSocket)
- Adjuntos (imágenes, documentos)
- Plantillas de WhatsApp
- Métricas de chat (tiempo de respuesta, etc.)

---

## 📋 Variables Existentes a Utilizar

### Del Backend

```javascript
// leads.js - campos existentes a reutilizar
lead.name
lead.email
lead.phone
lead.channel        // 'whatsapp', 'email', 'instagram', 'formulario'
lead.followUps      // array de mensajes anteriores
lead.propertyTitle // propiedad de interés
lead.status         // para mostrar estado del lead

// automation.js - para contexto
leadsInAutomation
leadsInSequences
```

### Del Frontend

```javascript
// ChatModal heredará configuración de canales
CHANNEL_CONFIG = {
  whatsapp: { icon: MessageCircle, color: 'emerald' },
  email: { icon: Mail, color: 'blue' },
  instagram: { icon: Instagram, color: 'pink' },
  messenger: { icon: Facebook, color: 'blue' }
}

// SendFollowupModal - templates existentes
defaultMessages
aiMessages
```

---

## 🎨 Consideraciones de UI/UX

### En LeadsPage - Detalle del Lead

```
┌─────────────────────────────────────────────────┐
│  Información del Lead                          │
│  ───────────────────────────────────────────   │
│  Nombre: Juan Pérez                            │
│  Canal: 📱 WhatsApp                             │
│  Estado: Activo                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 📱 Chatear con Juan                      │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Historial de Conversación                     │
│  ───────────────────────────────────────────   │
│  [12:30] Juan: Hola, tengo una pregunta        │
│  [12:35] Tú: Claro, dime                       │
│  [12:36] Juan: Hay garage?                     │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ Escribir mensaje...           Enviar 📤  │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### En HistoryPage - Nueva Pestaña

```
┌─────────────────────────────────────────────────┐
│  Programaciones │ Automatizaciones │ Chats 🔴   │
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ Activos │ │ Archiv. │ │Todos    │            │
│  └─────────┘ └─────────┘ └─────────┘            │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 👤 Juan Pérez - WhatsApp           12:35  │  │
│  │    "Hay garage?"                          │  │
│  ├───────────────────────────────────────────┤  │
│  │ 👤 María G. - Instagram             11:20  │  │
│  │    "Me interesa la casa"                  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos Propuesta

```
backend/
├── routes/
│   └── chat.js              ← NUEVO: CRUD de conversaciones
├── services/
│   ├── chatService.js       ← NUEVO: Lógica de chat
│   ├── whatsappService.js  ← NUEVO: API de WhatsApp
│   └── instagramService.js ← NUEVO: API de Instagram
└── server.js               ← Modificar: agregar rutas y webhooks

frontend/src/
├── components/
│   └── ChatModal.jsx       ← NUEVO: Modal de chat
├── pages/
│   ├── LeadsPage.jsx       ← Modificar: integrar ChatModal
│   └── HistoryPage.jsx     ← Modificar: nueva pestaña Chats
└── hooks/
    └── useChat.js          ← NUEVO: hook para gestionar chat
```

---

## ✅ Checklist de Implementación

- [ ] 1. Crear tabla `conversations` en DB
- [ ] 2. Crear tabla `messages` en DB
- [ ] 3. Crear `chatService.js` con funciones CRUD
- [ ] 4. Crear ruta `/api/chat/...` 
- [ ] 5. Crear `ChatModal.jsx` componente
- [ ] 6. Integrar ChatModal en LeadsPage
- [ ] 7. Migrar `followUps` existentes a `messages`
- [ ] 8. Agregar pestaña "Chats" en HistoryPage
- [ ] 9. (Fase 2) Integrar WhatsApp API
- [ ] 10. (Fase 2) Configurar webhooks
- [ ] 11. (Fase 3) Agregar notificaciones tiempo real

---

*Documento creado para参考 - Revisar y ajustar según necesidades específicas del proyecto*