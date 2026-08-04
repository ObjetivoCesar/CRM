# 📋 PLAN DE VERIFICACIÓN POR HITOS (CHECKLIST DE PRUEBAS)

Este documento te guiará paso a paso para comprobar manualmente todo el sistema de **Adquisición Geo-Targeted + Pitch Auditor IA** en tu entorno.

---

## 🎯 HITO 1: Verificación de Navegación y Creación de Campaña

- [ ] **Acceso a la vista**: Entra a tu CRM y haz clic en la nueva pestaña **"Adquisición"** (`/adquisicion`) en la barra lateral.
- [ ] **Crear nueva campaña**:
  1. Haz clic en el botón **"+ Nueva"**.
  2. Llena los datos:
     - **Nombre**: `Imprentas Cayambe Pruebas`
     - **Ciudad**: `Cayambe`
     - **Categoría**: `Imprentas y Rotulación`
  3. Haz clic en **"Crear Campaña"**.
- [ ] **Resultado esperado**: La campaña aparece seleccionada en el menú desplegable y los contadores en la tarjeta muestran `0 Prospectos | 0 Llamadas | 0 Ventas`.

---

## 📥 HITO 2: Ingesta Masiva de Prospectos (Prueba de API)

Para probar la ingesta de prospectos scrapeados o de CSV sin esperar al scraper externo, puedes ejecutar una petición simple a la API.

- [ ] **Ejecutar importación de prueba**:
  Abre una terminal en VSCode o PowerShell y ejecuta este comando curl (o usa Postman):

```bash
curl -X POST http://localhost:3000/api/v1/campaigns/SU_CAMPAIGN_ID/import \
  -H "Content-Type: application/json" \
  -d '{
    "prospects": [
      {
        "nombreNegocio": "Imprenta y Graficas Cayambe",
        "telefono": "0998765432",
        "ciudad": "Cayambe",
        "categoria": "Impresión y Gigantografías"
      },
      {
        "nombreNegocio": "Agencia Publicidad Creativa",
        "telefono": "0223456789",
        "ciudad": "Cayambe",
        "categoria": "Social Media"
      }
    ]
  }'
```

- [ ] **Resultado esperado**:
  - En la lista de prospectos del panel izquierdo aparecerá `"Imprenta y Graficas Cayambe"`.
  - El contador de prospectos de la campaña cambiará a `2`.
  - El teléfono `0998765432` se habrá formateado automáticamente a `+593998765432`.

---

## 🎙️ HITO 3: Guion en Vivo (Live Script Tracker)

- [ ] **Seleccionar prospecto**: En el panel izquierdo de `/adquisicion`, haz clic sobre el prospecto importado.
- [ ] **Comprobar Stepper del Guion**:
  - Observa la columna central. El guion de **ActivaQR** (o el activo) aparecerá dividido en pasos (Paso 1: Identidad, Paso 2: Problema, etc.).
  - El primer paso estará resaltado con borde azul.
- [ ] **Avance interactivo**:
  - Haz clic en el **Paso 2**. Verás que el Paso 1 se marca con `✓` verde y el Paso 2 se activa.
  - Haz clic en **"Reiniciar"** arriba a la derecha para resetear el avance a cero.

---

## 🤖 HITO 4: Auditoría de Pitch en Vivo con Llama 3.3 (Groq API)

- [ ] **Grabar Llamada**:
  1. Con un prospecto seleccionado, ve al panel derecho (**Pitch Auditor IA**).
  2. Haz clic en el botón circular rojo 🔴 de micrófono.
  3. Habla al micrófono imitando la llamada de ventas (ejemplo):
     > *"Buenas tardes, ¿hablo con el encargado? Le saluda César Reyes de Objetivo. Le llamo rápido porque muchos negocios de impresión tienen el problema de que sus clientes no los ubican. Nosotros creamos un QR que conecta su local físico con digital, empieza en $7 y 1 de cada 3 lo activa. ¿Le puedo hacer una demo en vivo de 2 minutos?"*
  4. Haz clic en el botón cuadrado para **detener la grabación**.
- [ ] **Auditoría de IA**:
  - Verás el estado *"Auditando pitch con Groq Llama 3.3..."*.
  - En 3 a 5 segundos aparecerá la tarjeta de evaluación con:
    - **Score Global**: ⭐ (ej. `85 / 100`)
    - **Criterios**: `✓ Gancho Temprano`, `✓ Demo Ofrecida`, etc.
    - **Puntos Fuertes** y **Áreas de Mejora** detalladas por la IA.

---

## 🧹 HITO 5: Verificación de Limpieza de Audio (TTL 30 Días)

- [ ] **Comprobar registro en BD**: La grabación se guardó en la tabla `call_analyses` con el campo `audio_expires_at` configurado exactamente a **+30 días** de la fecha actual.
- [ ] **Aviso visual**: En el widget de la UI se muestra el badge explicativo: `🎬 Audios guardados 30 días`.
- [ ] **CronJob de limpieza**: El endpoint `/api/cron/cleanup-audio` se ejecutará automáticamente todas las noches a las 02:00 AM UTC para liberar espacio en disco borrando archivos antiguos.
