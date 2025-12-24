# Plan de Integración Técnica: Agente "Donna" & Automatización

Este documento detalla la sección técnica para integrar a "Donna" (n8n/Evolution API) con el CRM Objetivo V2.

## 1. Visión General Técnica
"Donna" actuará como el orquestador inteligente de comunicaciones externas.
- **Entrada:** Recibe mensajes de WhatsApp/Redes Sociales (via Evolution API -> n8n).
- **Procesamiento:** n8n procesa la lógica, usa LLMs para generar respuestas.
- **Salida/Integración:**
    - Registra la interacción en el CRM (`POST /api/interactions`).
    - Actualiza el estado del Lead en el CRM.
    - El CRM puede "pedirle" a Donna que envíe mensajes o publique contenido.

## 2. Lo nuevo por implementar (CRM Side)

### A. Endpoints de Webhook (Receptores)
1.  **`/api/webhooks/donna/incoming-message`**
    - **Propósito:** Recibir mensajes entrantes y actualizaciones de estado.
    - **Seguridad:** Validar header `x-donna-api-key`.
    - **Lógica:** Buscar lead por teléfono -> Crear/Actualizar Lead -> Registrar en `interactions`.

### B. Endpoints de Acción (Triggers)
1.  **UI para "Enviar Mensaje"**
    - Llamada desde el CRM a un webhook de n8n con payload: `{ phone, message, context }`.
2.  **UI para "Crear Post Social"**
    - Llamada desde el CRM a un webhook de n8n con payload: `{ network, content, mediaUrl }`.

### C. Seguridad
- Implementar `DONNA_API_KEY` en `.env.local` y verificarla en el middleware o en el route handler de los webhooks.

## 3. Workflows Específicos (Lógica)

### Flujo 1: Recepción de Mensaje (Whatsapp)
1.  **n8n:** Recibe webhook de Evolution API.
2.  **n8n:** Consulta CRM (GET /leads?phone=...) para ver si existe.
3.  **n8n:**
    - Si Lead existe: POST `/api/interactions` (type: 'whatsapp', direction: 'inbound').
    - Si Lead no existe: POST `/api/leads` (crear nuevo) -> luego POST interaction.
4.  **n8n:** Genera respuesta con IA (si está habilitado auto-reply).
5.  **n8n:** Envía respuesta por Evolution API.
6.  **n8n:** POST `/api/interactions` (type: 'whatsapp', direction: 'outbound').

### Flujo 2: Post de Redes Sociales
1.  **CRM:** Usuario define post en UI "Marketing/Donna".
2.  **CRM:** `sendToDonna('publish_social', { ...data })`.
3.  **n8n:** Recibe, procesa multimedia, publica en API de red social.
4.  **n8n:** Responde éxito/error al CRM (o CRM asume éxito si 200 OK y espera webhook de confirmación).

## 4. Estructura de Datos (Interactions Table)
La tabla `interactions` ya existe y es adecuada:

```typescript
interface Interaction {
  id: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'social_post'; // Expandir enum
  direction: 'inbound' | 'outbound';
  content: string; // El mensaje o resumen
  prospect_id?: string;
  client_id?: string;
  // ...
}
```

---
*Extracto Técnico del Expediente Donna*
