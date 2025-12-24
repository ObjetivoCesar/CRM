# 📱 Turismo CRM - Aplicación de Gestión de Leads

<div align="center">
  
![PWA](https://img.shields.io/badge/PWA-Enabled-blue)
![React](https://img.shields.io/badge/React-19.2.1-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646cff)

**Sistema CRM completo para gestión de leads de turismo con envío masivo de WhatsApp**

</div>

---

## 🎯 Descripción

**Turismo CRM** es una Progressive Web App (PWA) diseñada para gestionar leads de turismo de manera eficiente. Permite organizar contactos, enviar mensajes masivos de WhatsApp, realizar seguimiento de interacciones y exportar datos para campañas de email marketing.

### ✨ Características Principales

- 🗂️ **Gestión de Leads**: Base de datos completa con información de contactos
- 📊 **Dashboard Interactivo**: Estadísticas en tiempo real (pendientes, contactados, respondidos, no interesados)
- 💬 **WhatsApp Masivo**: Envío de mensajes personalizados a múltiples contactos
- 📧 **Puente Marketing**: Exportación de datos para campañas de email
- 💾 **Backup Local**: Sistema de respaldo automático en LocalStorage
- 📝 **Historial de Interacciones**: Registro de todas las comunicaciones con clientes
- 🔄 **Sincronización**: Control de contactos sincronizados con sistemas externos
- 📱 **PWA Instalable**: Funciona como aplicación nativa en Windows, Mac y móviles

---

## 🚀 Tecnologías

- **Frontend**: React 19.2.1 con TypeScript
- **Build Tool**: Vite 6.2.0
- **Estilos**: CSS moderno con diseño responsive
- **PWA**: Service Worker + Manifest para instalación
- **Almacenamiento**: LocalStorage para persistencia de datos

---

## 📦 Instalación

### Requisitos Previos

- Node.js (versión 16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/ObjetivoCesar/AppWhatsApp.git
   cd AppWhatsApp
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crea un archivo `.env.local` en la raíz del proyecto:
   ```bash
   GEMINI_API_KEY=tu_api_key_aqui
   ```
   
   > **Nota**: Puedes obtener tu API key de Gemini en [Google AI Studio](https://ai.google.dev/)

4. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```
   
   La aplicación estará disponible en `http://localhost:3000`

5. **Construir para producción**
   ```bash
   npm run build
   ```

---

## 💻 Instalación como PWA (Aplicación de Escritorio)

### En Google Chrome o Microsoft Edge:

1. Abre la aplicación en el navegador
2. Busca el icono de instalación en la barra de direcciones (⬇️ o +)
3. Haz clic en **"Instalar Turismo CRM"**
4. La aplicación se instalará como programa independiente en tu PC

**Ventajas de instalar como PWA:**
- ✅ Acceso directo desde el escritorio
- ✅ Funciona sin barra de navegador
- ✅ Icono en la barra de tareas
- ✅ Experiencia similar a una app nativa

---

## 📖 Uso

### Dashboard Principal

- **Vista de estadísticas**: Visualiza el estado de todos tus leads
- **Tabla de contactos**: Filtra, ordena y gestiona tu base de datos
- **Selección múltiple**: Marca contactos para acciones masivas

### Envío de WhatsApp

1. Selecciona uno o varios contactos
2. Haz clic en **"Iniciar Sesión"**
3. Personaliza el mensaje para cada contacto
4. Envía directamente desde la interfaz

### Puente Marketing

- Exporta contactos en formato CSV
- Sincroniza con plataformas de email marketing
- Marca contactos como sincronizados

### Backup y Restauración

- **Backup automático**: Los datos se guardan en LocalStorage
- **Exportar backup**: Descarga un archivo JSON con todos tus datos
- **Restaurar backup**: Importa backups anteriores
- **Resetear fábrica**: Vuelve a los datos iniciales

---

## 🗂️ Estructura del Proyecto

```
App_WhatsaApp/
├── components/              # Componentes React
│   ├── BackupManager.tsx
│   ├── BatchWhatsAppSender.tsx
│   ├── EmailExportView.tsx
│   ├── EmailSimulator.tsx
│   ├── InteractionModal.tsx
│   ├── LeadTable.tsx
│   └── WhatsAppGenerator.tsx
├── utils/                   # Utilidades
│   ├── csvExporter.ts
│   ├── csvParser.ts
│   └── textHelpers.ts
├── data/                    # Datos iniciales
│   └── initialData.ts
├── App.tsx                  # Componente principal
├── types.ts                 # Definiciones TypeScript
├── index.tsx                # Punto de entrada
├── service-worker.js        # Service Worker para PWA
├── manifest.json            # Configuración PWA
└── vite.config.ts           # Configuración Vite
```

---

## 🔒 Seguridad

- ✅ Las claves API se gestionan mediante variables de entorno
- ✅ El archivo `.env.local` está protegido por `.gitignore`
- ✅ Los datos se almacenan localmente (no se envían a servidores externos)
- ✅ Los backups son opcionales y controlados por el usuario

---

## 🛠️ Scripts Disponibles

```bash
npm run dev      # Ejecuta el servidor de desarrollo
npm run build    # Construye la aplicación para producción
npm run preview  # Previsualiza la build de producción
```

---

## 📝 Licencia

Este proyecto es privado y de uso interno.

---

## 👨‍💻 Autor

**Grupo Empresarial Reyes**

---

## 🤝 Contribuciones

Este es un proyecto privado. Para sugerencias o reportes de bugs, contacta al equipo de desarrollo.

---

## 📞 Soporte

Para soporte técnico o consultas, contacta al administrador del sistema.
