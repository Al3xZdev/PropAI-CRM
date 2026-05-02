# 📱 Guía para encontrar WhatsApp en la nueva interfaz de Meta

## El problema
Meta cambió la interfaz. La sección "API Setup" ya no aparece de la misma manera. Está ahora dentro de la configuración de productos.

---

## 📋 Cómo encontrarlo

### Opción 1: Buscar en "Agregar productos"

1. En tu app de Meta Developers, mirá el menú izquierdo
2. Buscá la sección **"Productos"** o **"Add products to your app"**
3. Buscá **WhatsApp** y click en **Configure**

### Opción 2: Buscá en el menú lateral

Debajo de tu app name, debería haber algo como:
```
┌─────────────────────────────────┐
│ 🎯 Dashboard                    │
│ 📊 App Analytics                │
│ 🧪 Test Users                  │
│ ⚙️ Settings                    │
│ ─────────────────────────────  │
│ 🔽 PRODUCTS                     │
│   ▶️ WhatsApp (si ya está)      │
│   ➕ Add products              │
│                                  │
│ 🔽 ACCOUNTS                     │
│   ▶️ App Roles                  │
│   ▶️ Industry Choices          │
└─────────────────────────────────┘
```

### Opción 3: Ir directo

En tu navegador, probá acceder directamente:
```
https://developers.facebook.com/apps/{TU_APP_ID}/whatsapp/
```

---

## 📋 Si aún no agregaste WhatsApp como producto

Si en "Add products" no ves WhatsApp:

1. Click en **"Add products"**
2. Buscá **WhatsApp** en la lista
3. Click en **"Set Up"** o **"Configure"**

Te va a pedir crear o seleccionar una **WhatsApp Business Account** si no tenés una.

---

## 📋 Una vez que accedas a WhatsApp

Debería aparecerte una pantalla con:
- Tu **Phone Number ID**
- Tu **WhatsApp Business Account ID**  
- Un botón para **Generate Token** o ver el **Access Token**

---

## 📸 Envíame una screenshot

Si no encontrás nada de esto, tomá una captura de pantalla de:
1. El panel izquierdo de tu app
2. La sección de productos

Así te puedo guiar mejor.

---

## 🤔 Otra posibilidad

¿Tu app es nueva? ¿Es una "App de WhatsApp" o una "App de Meta" normal?

Si es una app nueva y no tiene WhatsApp agregado, primero tenés que agregar el producto WhatsApp desde "Add products".

---

*Guía actualizada para la nueva interfaz de Meta Developers*