# 📹 Guía de Registro - Dashboard Kanban y Email PDF

**Fecha:** 14 Diciembre 2025  
**Propósito:** Documentar las funcionalidades implementadas

---

## 🎬 Escenas a Grabar

### Escena 1: Dashboard Kanban de Leads (3-4 minutos)

**URL:** http://localhost:3000/leads

#### Tomas sugeridas:

1. **Vista General (10 segundos)**
   - Mostrar las 4 columnas del Kanban
   - Zoom out para ver todo el layout
   - Señalar el contador de leads en cada columna

2. **Detalle de Lead Card (15 segundos)**
   - Hacer zoom a una card individual
   - Mostrar la información visible:
     - Nombre del negocio
     - Nombre de contacto
     - Teléfono
     - Badge de actividad

3. **Cambio de Estado - Método 1: Dropdown (30 segundos)**
   - Click en el menú ⋮ de un lead en "Sin Contacto"
   - Mostrar las 4 opciones del dropdown
   - Seleccionar "1er Contacto"
   - **Mostrar cómo el lead se mueve a la segunda columna**
   - Esperar 2 segundos para que se vea la transición

4. **Verificar Persistencia (20 segundos)**
   - Hacer refresh de la página (F5)
   - Mostrar que el lead permanece en "1er Contacto"
   - Esto demuestra que se guardó en la base de datos

5. **Modal de Detalles (40 segundos)**
   - Click en cualquier lead card
   - Mostrar el modal completo con:
     - Información del negocio
     - Perfil humano
     - Diagnóstico y metas
     - Datos del negocio
     - Contexto estratégico
     - Análisis FODA
   - Scroll down para mostrar toda la información
   - Mostrar los 3 botones del footer:
     - "Convertir a Cliente"
     - "Crear Cotización"
     - "Editar"
   - Cerrar el modal (X)

6. **Mover Otro Lead (30 segundos)**
   - Seleccionar otro lead de "Sin Contacto"
   - Moverlo a "2do Contacto"
   - Mostrar que ahora hay leads en múltiples columnas

7. **Responsividad (opcional, 30 segundos)**
   - Abrir DevTools (F12)
   - Toggle device toolbar
   - Mostrar vista mobile (375px)
   - Mostrar cómo las columnas se apilan verticalmente

---

### Escena 2: Email con PDF Adjunto (2-3 minutos)

**URL:** http://localhost:3000/cotizaciones

#### Tomas sugeridas:

1. **Seleccionar Lead (15 segundos)**
   - Click en el dropdown de "Lead a Cotizar"
   - Buscar y seleccionar un lead
   - Mostrar que se carga la información del lead

2. **Seleccionar Plantilla (10 segundos)**
   - Click en dropdown de "Plantilla"
   - Seleccionar "Propuesta Comercial (Restaurantes/Hoteles) ⭐"

3. **Generar Cotización (30 segundos)**
   - Click en "Generar Cotización (IA)"
   - Mostrar el loading spinner
   - Esperar a que se genere el contenido
   - Hacer scroll para mostrar el texto generado

4. **Guardar Cotización (10 segundos)**
   - Click en botón "Guardar"
   - Mostrar el mensaje de éxito

5. **Vista Previa PDF (30 segundos)**
   - Click en "Vista Previa PDF"
   - Mostrar el modal con el PDF renderizado
   - Hacer scroll en el PDF para mostrar:
     - Header con logo
     - Contenido de la propuesta
     - Footer con información de contacto

6. **Enviar Email con PDF (45 segundos)**
   - **IMPORTANTE:** Abrir DevTools (F12) → Console ANTES de enviar
   - Click en botón "Email"
   - **Mostrar los logs en la consola:**
     ```
     🔄 Generando PDF...
     ✅ PDF generado: XXXX bytes
     ✅ PDF convertido a base64: YYYY caracteres
     📧 Preparando email...
     📤 Enviando email...
     ```
   - Mostrar el mensaje de éxito: "✅ Email enviado exitosamente con PDF adjunto"

7. **Verificar Email Recibido (60 segundos)**
   - Abrir nueva pestaña
   - Ir a Gmail: https://mail.google.com
   - Login con: objetivo.cesar@gmail.com
   - Buscar el email más reciente
   - **Mostrar:**
     - Asunto: "Propuesta Comercial - [Nombre del Negocio]"
     - Cuerpo del email
     - **CRÍTICO: Mostrar el PDF adjunto (📎)**
   - Click en el PDF para descargarlo
   - Abrir el PDF descargado
   - Mostrar que el PDF se abre correctamente

8. **Logs del Servidor (opcional, 20 segundos)**
   - Cambiar a la terminal donde corre `pnpm dev`
   - Hacer scroll para mostrar los logs del servidor:
     ```
     📧 Email Debug: { to, subject, filename, hasAttachment: true, attachmentLength: XXXX }
     📎 Attachment added: Propuesta Comercial para [Negocio].pdf
     📤 Sending email via Resend...
     ✅ Email sent successfully
     ```

---

## 📸 Capturas de Pantalla Clave

Si prefieres capturas estáticas en lugar de video, toma estas:

### Dashboard Kanban:
1. `kanban_vista_general.png` - Vista completa de las 4 columnas
2. `kanban_dropdown_menu.png` - Menú desplegable abierto
3. `kanban_lead_movido.png` - Lead en nueva columna después de mover
4. `kanban_modal_detalles.png` - Modal de detalles completo

### Email PDF:
5. `cotizaciones_generando.png` - Proceso de generación con IA
6. `pdf_preview.png` - Vista previa del PDF en modal
7. `console_logs_email.png` - Logs de la consola del navegador
8. `gmail_email_recibido.png` - Email en bandeja de entrada
9. `gmail_pdf_adjunto.png` - PDF adjunto visible
10. `pdf_descargado_abierto.png` - PDF abierto en visor

---

## 🎯 Puntos Clave a Destacar

### Dashboard Kanban:
- ✅ **4 columnas claras** para seguimiento de contacto
- ✅ **Menú dropdown** fácil de usar (no requiere drag & drop)
- ✅ **Persistencia** en base de datos (refresh mantiene cambios)
- ✅ **Modal de detalles** con toda la información del lead
- ✅ **Responsive** (funciona en mobile/tablet/desktop)

### Email PDF:
- ✅ **PDF se genera correctamente** con logo y footer
- ✅ **Logs detallados** en consola del navegador
- ✅ **PDF llega como adjunto** (no como link)
- ✅ **PDF es descargable** y se abre correctamente
- ✅ **Nombre de archivo descriptivo** (incluye nombre del negocio)

---

## 🔧 Troubleshooting

### Si el Dashboard no carga:
```bash
# Verificar que el servidor esté corriendo
# Debería ver: ▲ Next.js 14.2.16 - Local: http://localhost:3000
```

### Si el email no llega:
1. Verificar logs en consola del navegador (F12)
2. Verificar logs en terminal del servidor
3. Revisar carpeta de Spam en Gmail
4. Recordar que Resend en modo prueba solo envía a `objetivo.cesar@gmail.com`

### Si el PDF no se adjunta:
1. Verificar que los logs muestren: `hasAttachment: true`
2. Verificar que el tamaño del base64 sea > 0
3. Si falla, revisar `lib/email/resend.ts` línea 28

---

## 📝 Notas para el Video

- **Duración total sugerida:** 5-7 minutos
- **Resolución:** 1920x1080 (Full HD)
- **FPS:** 30 fps mínimo
- **Audio:** Opcional, pero recomendado para explicar lo que haces
- **Herramientas sugeridas:**
  - OBS Studio (gratuito)
  - Windows Game Bar (Win + G)
  - Loom (online)

---

**Creado por:** Antigravity AI  
**Fecha:** 14 Diciembre 2025  
**Propósito:** Documentación visual de funcionalidades implementadas
