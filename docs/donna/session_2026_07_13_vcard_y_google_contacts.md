# Sesión de Desarrollo: 13 de Julio de 2026
**Proyecto:** CRM OBJETIVO V2
**Áreas:** WhatsApp Webhook (vCard), Integración Google Contacts (OAuth 2.0).

## 1. Ajuste de Flujo vCard + Video Tutorial (ActivaQR)
**Problema:** Al enviar la vCard y el video tutorial al mismo tiempo, WhatsApp a veces procesaba el video primero, dejándolo "arriba" de la vCard en la interfaz del chat.
**Solución:** 
- Se implementó un delay asíncrono (`await new Promise(r => setTimeout(r, 5000))`) justo después de enviar la vCard y antes de enviar el video.
- Se verificó que el **MODO B** (clientes) lee correctamente el `data.mensaje` dinámico que viene de la API de ActivaQR y ejecuta el reemplazo `{nombre}` por el nombre de perfil de WhatsApp de quien escanea.

## 2. Resolución de Error OAuth `invalid_grant` (Google Contacts)
**Problema:** El CRM fallaba al guardar contactos con el error `❌ [GoogleContacts] Failed to create contact: invalid_grant`.
**Causa:** El proyecto en Google Cloud estaba en modo "En pruebas" (Testing), lo que provoca que Google caduque los *Refresh Tokens* automáticamente a los 7 días por seguridad.
**Solución Permanente:**
1. Se cambió el estado de la aplicación en la Pantalla de Consentimiento de OAuth de Google Cloud a **"En producción"** para que los tokens sean eternos.
2. Se generó un nuevo `Refresh Token` a través de Google OAuth 2.0 Playground.
3. Se guardaron las variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN` en `.env.local` y Vercel.
**Aprendizaje Crítico:** Al pegar credenciales en el dashboard de Vercel, **NUNCA usar comillas (`""`)**. Si se incluyen, el parser de Vercel inyecta las comillas en la variable de entorno, corrompiendo la firma del token ante Google.

## 3. Resolución de Error 403 (Token lacks CONTACTS scope)
**Problema:** Tras reparar el token, se generó un falso positivo de Scope insuficiente.
**Causa:** La **Google People API** no estaba habilitada en la biblioteca del proyecto en Google Cloud.
**Solución:** Habilitar explícitamente "Google People API" en Google Cloud Console.

## 4. Prevención de Duplicados en Google Contacts
**Problema:** Escanear el QR múltiples veces creaba clones del mismo contacto en la agenda de César. La API `people.createContact` no filtra duplicados por defecto.
**Solución:**
- Se refactorizó `ContactsService.ts` (`createContact`).
- Ahora realiza una pre-validación utilizando `people.searchContacts` buscando por el número de teléfono limpio (`cleanPhone`).
- Si `searchRes.data.results` contiene elementos, la función retorna inmediatamente, evitando enviar un POST de creación y manteniendo la agenda limpia.
