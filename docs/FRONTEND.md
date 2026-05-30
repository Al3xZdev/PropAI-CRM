# Frontend

React 18 + Vite 5 + Tailwind CSS 3. Dark/light mode con CSS variables.

## Project Structure

```
frontend/src/
├── components/          # Componentes reutilizables
│   ├── automation/      # Componentes de automatización
│   ├── contracts/       # Componentes de contratos
│   ├── crm/             # Componentes CRM
│   ├── followups/       # Componentes de seguimiento
│   ├── leads/           # Componentes de leads
│   ├── ChatModal.jsx
│   ├── ContentCard.jsx
│   ├── CopywritingContent.jsx
│   ├── GenerateContractModal.jsx
│   ├── GeneratedContent.jsx
│   ├── NotificationBell.jsx
│   ├── NotificationPopup.jsx
│   ├── PostDetailModal.jsx
│   ├── PropertyCard.jsx
│   ├── PropertyForm.jsx
│   ├── PropertyImportCSV.jsx
│   ├── PublicationPanel.jsx
│   ├── PublicationResult.jsx
│   ├── ScheduleModal.jsx
│   ├── ScheduleSuccessPopup.jsx
│   ├── ScheduleTimeline.jsx
│   ├── Sidebar.jsx
│   └── SocialPreview.jsx
├── pages/               # Páginas principales
│   ├── agents/          # Página de agentes
│   ├── AutomationPage.jsx
│   ├── Dashboard.jsx
│   ├── DocumentsPage.jsx
│   ├── HistoryPage.jsx
│   ├── InboxPage.jsx
│   ├── LeadsPage.jsx
│   └── LoginPage.jsx
├── hooks/               # Custom hooks
│   ├── useExchangeRates.js
│   ├── useNotifications.jsx
│   ├── useSimulations.js
│   └── useTheme.jsx
├── utils/               # Utilidades
│   ├── api.js           # API client
│   └── financialCalc.js # Cálculos financieros
├── assets/              # Archivos estáticos
├── App.jsx              # Componente principal (routing + state)
├── main.jsx             # Entry point
└── index.css            # Estilos globales + animaciones
```

## Routing

No hay React Router. El routing es manual via `currentPage` state en `App.jsx`.

```jsx
const [currentPage, setCurrentPage] = useState('dashboard')
```

| Página | Estado | Componente |
|--------|--------|------------|
| `dashboard` | default | `<Dashboard />` |
| `properties` | `/propiedades` | Lista con `PropertyCard[]` |
| `new-property` | `/propiedades/nueva` | `<PropertyForm />` |
| `content` | `/propiedades/:id/contenido` | Tabs: portal/redes/IG/FB/email/pub/preview |
| `leads` | `/leads` | `<LeadsPage />` |
| `inbox` | `/inbox` | `<InboxPage />` |
| `agents` | `/agentes` | `<AgentsPage />` |
| `automation` | `/automatizacion` | `<AutomationPage />` |
| `history` | `/historial` | `<HistoryPage />` |
| `documents` | `/documentos` | `<DocumentsPage />` |

## Navigation

`<Sidebar />` renderiza la navegación. Recibe `currentPage`, `onNavigate`,
stats y `user` como props. Siempre visible a la izquierda (ml-64).

## Auth Flow

1. App monta → `checkAuth()` → busca `user` en localStorage
2. Si existe → `GET /api/auth/me` con cookie httpOnly
3. Si ok → carga propiedades y stats
4. Si 401 → `logout()` → limpia todo → muestra `<LoginPage />`
5. Login → `POST /api/auth/login` → cookie httpOnly → user object → state

### Session Check

```jsx
useEffect(() => { checkAuth() }, [])
```

- `GET /api/auth/me` con cookie incluida (`credentials: 'include'`)
- Si falla en cualquier momento → `logout()` → reload

## API Client

Archivo: `utils/api.js`

```jsx
import { api } from './utils/api'

api.get('/endpoint')
api.post('/endpoint', { data })
api.put('/endpoint/:id', { data })
api.patch('/endpoint/:id', { data })
api.delete('/endpoint/:id')
api.upload('/endpoint', formData)
```

Características:
- Siempre envía cookies httpOnly (`credentials: 'include'`)
- En 401: limpia localStorage y recarga (redirige a login)
- `api.upload()` omite `Content-Type` para que el browser ponga el boundary

## Global State

Todo el estado global vive en `App.jsx`:

```jsx
// Auth
const [user, setUser] = useState(null)
const [isLoading, setIsLoading] = useState(true)

// Navigation
const [currentPage, setCurrentPage] = useState('dashboard')

// Data
const [properties, setProperties] = useState([])
const [leadsStats, setLeadsStats] = useState({})

// Content pipeline
const [selectedProperty, setSelectedProperty] = useState(null)
const [content, setContent] = useState(null)
const [schedule, setSchedule] = useState(null)
const [isGenerating, setIsGenerating] = useState(false)
const [error, setError] = useState(null)
const [activeTab, setActiveTab] = useState('portal')
const [contentVariationIndex, setContentVariationIndex] = useState(0)

// UI state
const [showImportModal, setShowImportModal] = useState(false)
const [showResult, setShowResult] = useState(false)
const [resultStatus, setResultStatus] = useState('loading')
const [showScheduleModal, setShowScheduleModal] = useState(false)
const [showScheduleSuccess, setShowScheduleSuccess] = useState(false)
```

## Content Pipeline Flow

```
Form → PropertyForm
  │ POST /properties
  ▼
Property created
  │ POST /content/generate
  ▼
Content generated (descriptions, copys, emails, hashtags)
  │ POST /schedule/create
  ▼
Schedule created (calendar of posts)
  │ User reviews → publishes
  ▼
POST /schedule/:id/publish/:index → Social preview → PublicationResult
```

## Hooks

| Hook | Propósito |
|------|-----------|
| `useTheme` | Dark/light mode con CSS variables globales |
| `useNotifications` | Sistema de notificaciones toast (sonner-style) |
| `useExchangeRates` | Consulta tipo de cambio USD/ARS |
| `useSimulations` | Simulaciones financieras para propiedades |

## Styling

- **Tailwind CSS 3**: utility-first, config en `tailwind.config.js`
- **CSS variables**: dark/light mode vía `.dark` / `.light` clases en `:root`
- **Glass effect**: `.glass` y `.glass-card` con `backdrop-filter: blur`
- **Animaciones**: keyframes en `index.css` (fadeInUp, scaleIn, shimmer, etc.)
- **Icons**: `lucide-react`

### Theme

```css
:root, .dark { --bg-primary: #0d0d0d; --text-primary: #fafafa; ... }
.light { --bg-primary: #f0f3f4; --text-primary: #0f1419; ... }
```

## Vite Config

- Proxy: no configurado (usa `VITE_API_URL` con fallback a `/api`)
- Deploy: Vercel (`npm run vercel` / `npm run vercel:prod`)
