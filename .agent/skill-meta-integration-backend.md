---
name: meta-integration-backend
description: Guía técnica definitiva sobre la integración funcional de la API de Meta (Facebook/Instagram) en el backend del CRM (Vercel + Render + Supabase).
---

# Integración Backend de Meta: Guía Técnica y Solución de Problemas

Este documento detalla la arquitectura, configuración y el código preciso que logró estabilizar la mensajería bidireccional entre el CRM Objetivo y la plataforma de Meta (Instagram Direct, Comentarios y Facebook Messenger). 

Se basa exclusivamente en las implementaciones que probaron ser exitosas en producción.

## 1. Arquitectura General del Flujo de Mensajes

El sistema utiliza una arquitectura distribuida para evitar los "tiempos de espera agotados" (timeouts) de Vercel y sortear las limitaciones de las plataformas Free-Tier como Render.

1. **Recepción (Vercel):** Un único endpoint en Next.js (`/api/webhooks/instagram`) que recibe todos los webhooks de Meta (tanto Facebook como Instagram). Su única función es guardar la interacción cruda en la base de datos (Supabase) en la tabla `pending_messages_queue` y responder inmediatamente con un HTTP 200 a Meta.
2. **Almacenamiento (Supabase):** Actúa como la cola de mensajes en tiempo real.
3. **Procesamiento y Envío (Render Worker):** Un proceso en segundo plano de Node.js (`scripts/message_worker.ts`) que monitorea Supabase constantemente. Extrae los mensajes pendientes, los envía al `Cortex Router` (la IA Donna) para generar la respuesta, y luego utiliza los Adaptadores de Mensajería para devolver la respuesta a Meta.

## 2. El Worker de Render: Estabilidad y Persistencia

Uno de los mayores retos fue evitar que Render (en su capa gratuita) "durmiera" el proceso por inactividad a los 15 minutos (error SIGTERM).
**La solución implementada:**
Se creó un servidor HTTP interno de "salud" (Health Check) acoplado al worker, el cual responde a *cualquier* petición entrante. Más importante aún, el worker realiza un auto-ping hacia su **URL Pública externa** cada 9 minutos. Un ping a `localhost` no sirve, ya que Render monitorea el tráfico a través de su enrutador de red (ingress router).

```typescript
// scripts/message_worker.ts (Fragmento Clave)
const port = Number(process.env.PORT) || 10000;
const server = http.createServer((req, res) => {
    // IMPORTANTE: Responder 200 a todo mantiene a Render tranquilo
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Worker Active');
});

// Auto-ping a la URL externa (A través del proxy de Render)
setInterval(async () => {
    try {
        const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://crm-nbul.onrender.com';
        await fetch(`${renderUrl}/api/health`);
    } catch (e) {}
}, 9 * 60 * 1000); // 9 Minutos
```

## 3. Adaptadores de Mensajería: Configuración Precisa de Endpoints

Meta Graph API es extremadamente estricto con sus endpoints y formatos.

### A. Endpoint para Instagram DMs (Mensajes Directos)
A diferencia de otras APIs, para responder un DM de Instagram **no se envía la petición al ID del Usuario de Instagram**. El estándar oficial de Messenger API para Instagram exige que se envíe al **ID de la Página de Facebook** vinculada.

```typescript
// Solución Funcional en InstagramAdapter.ts
const pageId = await this.getPageId(); 
const url = `https://graph.facebook.com/v19.0/${pageId}/messages?access_token=${token}`;
```

### B. Endpoint para Responder Comentarios en Instagram
Para los comentarios, Meta **no** acepta el Token de Acceso en el encabezado `Authorization: Bearer`. El token **debe ser un parámetro Query en la URL**, y el cuerpo del mensaje debe enviarse como `application/x-www-form-urlencoded`.

```typescript
// Solución Funcional
const url = `https://graph.facebook.com/v19.0/${commentId}/replies?access_token=${token}`;
const params = new URLSearchParams({ message: text });
```

## 4. Depuración de Errores Críticos (Meta API)

Durante la implementación en producción, el error más severo encontrado fue el rechazo por parte de Meta para entregar mensajes:

**Error #3: OAuthException - Application does not have the capability to make this API call**
*   **Significado Real:** La aplicación carece de permisos de "Acceso Avanzado" (Advanced Access).
*   **Diagnóstico:** El código funciona perfectamente, la petición está bien estructurada, pero Meta intercepta el mensaje como protección de privacidad. Ocurre al intentar enviar un mensaje a un usuario de Instagram/Facebook que **no es Tester ni Administrador** de la App de Meta.
*   **Solución en Backend:** No hay solución a nivel de código. La API solo funcionará íntegramente tras solicitar y aprobar la Revisión de la App para los scopes `pages_messaging` e `instagram_manage_messages` junto con la Verificación del Negocio.

## 5. Glosario de Permisos del Webhook (App Dashboard)

Para que el webhook `https://[DOMINIO]/api/webhooks/instagram` reciba la información correcta, en la configuración de *Messenger -> Webhooks* deben estar marcados **únicamente** los siguientes campos para la Página:
- `messages`: Escucha los mensajes entrantes.
- `messaging_postbacks`: Escucha los clics en botones integrados en el chat.
- `feed`: (A nivel webhook global) Escucha los comentarios en posts de Instagram/Facebook.
