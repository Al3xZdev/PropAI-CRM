# RealEstate AI Demo

MVP funcional para demostración de producto de marketing inmobiliario con IA.

## 🚀 Cómo Ejecutar

### 1. Backend
```bash
cd backend
npm install
npm start
```
Backend correrá en: http://localhost:3001

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend correrá en: http://localhost:5173

---

## ✨ Funcionalidades

### Flujo Completo:
1. **Subir fotos** y datos de la propiedad
2. **Generación IA simulada**:
   - Descripción larga para portales inmobiliarios
   - Descripción corta para redes
   - 3 variaciones de copy (Instagram, Facebook, TikTok)
   - Email marketing listo para enviar
   - Hashtags optimizados
3. **Scheduling automático**:
   - Día 1: Fotos + Just Listed
   - Día 3: Video/Reel
   - Día 5: Open House
   - Día 10: Price Update
4. **Preview visual** de cómo se verá en:
   - Instagram
   - Facebook
   - TikTok
   - Twitter/X
   - Portales inmobiliarios
5. **Publicar** (simulado) directamente a redes

---

## 📁 Estructura del Proyecto

```
DemoRealState/
├── backend/
│   ├── routes/
│   │   ├── properties.js   # Upload y gestión de propiedades
│   │   ├── content.js      # Generación de contenido IA
│   │   └── schedule.js     # Programación de publicaciones
│   ├── services/
│   │   ├── contentGenerator.js  # Templates de contenido
│   │   └── scheduler.js        # Lógica de scheduling
│   ├── uploads/             # Imágenes subidas
│   └── server.js           # Entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── PropertyForm.jsx     # Formulario de carga
    │   │   ├── GeneratedContent.jsx # Contenido IA
    │   │   ├── ScheduleTimeline.jsx # Timeline visual
    │   │   └── SocialPreview.jsx     # Previews de redes
    │   ├── App.jsx          # Componente principal
    │   └── main.jsx         # Entry point
    └── index.html
```

---

## 🎯 Para tu Demo de Ventas

Durante la llamada, puedes mostrar:

1. **El formulario** - cómo el agente carga fotos y datos en 30 segundos
2. **La generación** - el "thinking" de la IA mientras crea todo el contenido
3. **El contenido** - descripciones, copies, email marketing generados
4. **El calendario** - timeline visual de publicaciones escalonadas
5. **Los previews** - cómo se verá en cada red social
6. **La publicación** - botón para "publicar ahora" y ver el estado cambiar

---

## 🔧 Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **APIs**: Simuladas (listo para conectar OpenAI/Claude cuando tengas keys)
