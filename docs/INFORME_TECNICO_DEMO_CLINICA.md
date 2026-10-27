# 🏥 INFORME TÉCNICO Y AUDITORÍA DE IMPLEMENTACIÓN: DEMO CLÍNICA SAN AGUSTÍN (HCSA)
**Fecha:** 27 de Octubre de 2026  
**Proyecto:** CRM OBJETIVO V2 (Next.js 16 + Vercel + Supabase + Render Worker)  
**Canal:** WhatsApp Cloud API Oficial de Meta (`+593 96 342 5323`, Phone Number ID: `639433412590000`)  
**Destinatario:** César Reyes & Argon4 (Revisión y Recomendación Técnica)

---

## 1. OBJETIVO DEL NEGOCIO Y VISIÓN COMERCIAL

César necesita realizar una **demostración comercial de alto impacto** para una clínica médica privada (**Hospital Clínica San Agustín - HCSA** de Loja, Ecuador).
- **Especialidad elegida para el demo:** Alergología ([https://hcsa.ec/alergologia-en-loja/](https://hcsa.ec/alergologia-en-loja/)).
- **Trigger de activación:** El usuario envía al número oficial el mensaje: `san_agustin_demo`.
- **Resultado deseado por César:**
  1. Mostrar un **carrusel / slide horizontal de tarjetas (cards)** dentro de WhatsApp.
  2. Cada tarjeta debe incluir:
     - Foto del médico especialista.
     - Nombre y especialidad médica.
     - **Botón interactivo táctil** para *"Agendar Cita"* (que abra WhatsApp directo al número asignado o redirija).
  3. Demostrar la tecnología de **ActivaQR (Contacto Digital)** enviando una vCard (`.vcf`), para que la clínica vea cómo un paciente puede guardar todos los datos del médico en su agenda telefónica con un solo clic.
- **Regla de oro técnica:** **CERO afectación a producción**. El software ya gestiona activamente la línea de ActivaQR (`contacto:slug` y `#activa-vcf`), por lo que el código debía operar 100% aislado.

---

## 2. DIAGNÓSTICO DEL RESULTADO ACTUAL (¿QUÉ SE LOGRÓ Y QUÉ FALLÓ?)

### ✅ Lo que funcionó correctamente:
- El webhook interceptó el trigger `san_agustin_demo` de forma instantánea.
- Se respetó la idempotencia y se devolvió `HTTP 200` en `<100ms` a Meta para evitar retries.
- Se pausó a la IA (Donna) por 1 hora para dar control humano a la conversación.
- Las imágenes y textos de los médicos de HCSA se enviaron, junto con la vCard `.vcf`.

### ❌ La discrepancia visual (Motivo de esta auditoría):
En lugar de un **carrusel horizontal deslizable (swipeable cards)** con botones táctiles integrados, WhatsApp entregó **mensajes verticales secuenciales separados**:
1. Un mensaje con imagen y texto largo con un link URL azul (`https://wa.me/...`).
2. Un segundo mensaje de texto separado con otro link URL azul.
3. Un documento adjunto `.vcf`.

**Causa raíz:**  
El método ejecutado utilizó llamadas secuenciales a `whatsappService.sendMessage(...)` con `type: 'image'` y `type: 'text'`, en lugar de construir un mensaje nativo de tipo `interactive` (carrusel o botones nativos).

---

## 3. CÓDIGO IMPLEMENTADO ACTUALMENTE

### A. Interceptor en Webhook (`app/api/webhooks/whatsapp/route.ts`)
Ubicado en la **Sección 3.7**, aislado e independiente de los flujos de ActivaQR:

```typescript
// 3.7. INTERCEPT DEMO CLÍNICA SAN AGUSTÍN (HCSA)
const cleanLowerContent = content.toLowerCase().trim();
const isSanAgustinDemo = cleanLowerContent.includes('san_agustin_demo') || 
                         cleanLowerContent.includes('san-agustin-demo') ||
                         cleanLowerContent.includes('san agustin demo');

if (isSanAgustinDemo) {
    console.log(`🏥 [DEMO_HCSA] Intercepted San Agustín Demo request from ${from}`);

    const messageId = message.id;
    if (messageId) {
        const { webhookEventsProcessed } = await import('@/lib/db/schema');
        const [alreadyProcessed] = await db.select()
            .from(webhookEventsProcessed)
            .where(and(
                eq(webhookEventsProcessed.provider, 'whatsapp'),
                eq(webhookEventsProcessed.externalId, `demo_hcsa_${messageId}`)
            ))
            .limit(1);

        if (alreadyProcessed) {
            console.log(`⚠️ [DEMO_HCSA] Duplicate detected. Skipping. MsgID: ${messageId}`);
            return NextResponse.json({ status: 'demo_hcsa_duplicate_ignored' });
        }

        try {
            await db.insert(webhookEventsProcessed).values({
                provider: 'whatsapp',
                externalId: `demo_hcsa_${messageId}`,
            });
        } catch (idempErr) {
            console.log(`⚠️ [DEMO_HCSA] Race condition caught. Skipping duplicate.`);
            return NextResponse.json({ status: 'demo_hcsa_race_condition_ignored' });
        }
    }

    // Log interaction for CRM
    try {
        await db.insert(interactions).values({
            contactId: contactId,
            discoveryLeadId: discoveryLeadId,
            type: 'whatsapp',
            content: content,
            direction: 'inbound',
            performedAt: new Date(),
            createdAt: new Date(),
            metadata: { source: 'demo_san_agustin_trigger' }
        });
    } catch (e) {
        console.warn('⚠️ [DEMO_HCSA] Error logging interaction:', e);
    }

    // Background execution with waitUntil
    waitUntil((async () => {
        try {
            // 1. Pausa de IA por 1 hora
            try {
                if (contactId) {
                    await db.update(contacts).set({ botMode: 'paused' as any }).where(eq(contacts.id, contactId));
                }
                const pauseUntil = new Date(Date.now() + 60 * 60 * 1000);
                await db.insert(donnaChatMessages).values({
                    chatId: from,
                    role: 'assistant',
                    content: '[Sistema] IA pausada por 1 hora por Demo Clínica San Agustín',
                    platform: 'whatsapp',
                    messageTimestamp: new Date(),
                    metadata: { 
                        source: 'crm_human_agent', 
                        humanPausedUntil: pauseUntil.toISOString() 
                    }
                });
            } catch (pauseErr) {
                console.error('❌ [DEMO_HCSA] Error pausando IA:', pauseErr);
            }

            // 2. Mensaje de Cabecera Institucional
            const headerMsg = 
`🏥 *Hospital Clínica San Agustín — Especialidad de Alergología*

Hola, bienvenido al servicio de atención y agendamiento médico en Loja. Ponemos a su disposición a nuestros especialistas de primer nivel:`;

            await whatsappService.sendMessage(from, headerMsg);

            // Pausa estética de 1.5s
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 3. Tarjeta Médico 1 — Dra. Daniela Hidalgo
            const dr1Caption = 
`👩‍⚕️ *Dra. Daniela Hidalgo*
Especialista en Alergología e Inmunología
Hospital Clínica San Agustín (HCSA)

📅 *Agendar consulta directa:*
https://wa.me/593990070606?text=Quiero%20una%20cita%20con%20Alergolog%C3%ADa%20Dra.%20Daniela%20Hidalgo`;

            await whatsappService.sendMessage(from, '', { source: 'demo_hcsa_dr1' }, {
                type: 'image',
                url: 'https://hcsa.ec/wp-content/uploads/2021/08/Dra-Daniela-Hidalgo-HCSA.jpg',
                caption: dr1Caption
            });

            // Pausa estética de 2s
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Tarjeta Médico 2 — Dr. Andrés Torres
            const dr2Caption = 
`👨‍⚕️ *Dr. Andrés Torres*
Especialista en Alergología
Hospital Clínica San Agustín (HCSA)

📅 *Agendar consulta directa:*
https://wa.me/593990070606?text=Quiero%20una%20cita%20con%20Alerg%C3%B3logo%20Dr.%20Andr%C3%A9s%20Torres`;

            await whatsappService.sendMessage(from, dr2Caption);

            // Pausa estética de 2s
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 5. Demostración de Venta Cruzada — Contacto Digital ActivaQR (.vcf)
            const vcardMedia = {
                type: 'document' as const,
                url: 'https://crm-z2kv.vercel.app/cesar-reyes-jaramillo.vcf',
                filename: 'Cesar_Reyes_Jaramillo.vcf'
            };
            await whatsappService.sendMessage(from, '', { source: 'demo_hcsa_vcard' }, vcardMedia);

            const vcardExplMsg = 
`📇 *Innovación de Contacto Digital (ActivaQR):*
Al tocar el archivo de contacto arriba 👆, todos los datos se guardan automáticamente en la agenda del teléfono del paciente (nombre, celular, clínica y foto) en 1 solo clic, sin escribir nada a mano.`;

            await whatsappService.sendMessage(from, vcardExplMsg);

            console.log(`✅ [DEMO_HCSA] Secuencia completa enviada a ${from}`);
        } catch (err: any) {
            console.error('❌ [DEMO_HCSA] Error ejecutando secuencia demo:', err.message);
        }
    })());

    return NextResponse.json({ status: 'san_agustin_demo_intercepted' });
}
```

---

### B. El Motor de Envío (`lib/whatsapp/WhatsAppService.ts`)
Actualmente este servicio despacha peticiones directamente a Meta Graph API (`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`).

Fragmento clave de cómo construye los payloads:
```typescript
// Soporta:
// 1. Interactive (Reply buttons: max 3)
if (interactive) {
    payload.type = "interactive";
    payload.interactive = {
        type: interactive.type, // 'button'
        body: { text: interactive.bodyText },
        action: {
            buttons: interactive.buttons.map(btn => ({
                type: 'reply',
                reply: { id: btn.id, title: btn.title }
            }))
        },
        ...(interactive.footerText ? { footer: { text: interactive.footerText } } : {})
    };
} 
// 2. Media (image, video, document, contacts)
else if (media) {
    payload.type = media.type;
    payload[media.type] = {
        ...(media.id ? { id: media.id } : { link: media.url }),
        ...(media.caption ? { caption: media.caption } : {}),
        ...(media.type === 'document' && media.filename ? { filename: media.filename } : {})
    };
} 
// 3. Simple Text
else {
    payload.type = "text";
    payload.text = { body: text, preview_url: true };
}
```

---

## 4. DILEMA TÉCNICO DE META CLOUD API: ¿CÓMO SE HACE UN CARRUSEL REAL?

Para que **Argon4** pueda evaluar la mejor arquitectura, aquí está el estado actual del soporte de Carruseles en la API oficial de WhatsApp:

### Ruta 1: Carousel Templates (`type: "template"`)
- Meta introdujo el formato de carrusel deslizable horizontal (2 a 10 tarjetas con foto/video + botones).
- **Restricción habitual de Meta:** Se crean como plantillas pre-aprobadas dentro de Meta Business Manager (categoría Marketing o Utilidad).
- **Payload:**
  ```json
  {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "593...",
    "type": "template",
    "template": {
      "name": "catalogo_medicos_demo",
      "language": { "code": "es" },
      "components": [
        {
          "type": "carousel",
          "cards": [
            {
              "card_index": 0,
              "components": [
                { "type": "header", "parameters": [{ "type": "image", "image": { "link": "https://..." } }] },
                { "type": "button", "sub_type": "quick_reply", "index": 0, "parameters": [{ "type": "payload", "payload": "CITA_DR_1" }] }
              ]
            }
          ]
        }
      ]
    }
  }
  ```

### Ruta 2: Mensaje Interactivo en Sesión Libre (`type: "interactive"`)
- Algunos endpoints de la Cloud API v21.0/v22.0 permiten enviar `interactive: { type: "carousel", ... }` con tarjetas dinámicas sin necesidad de plantilla aprobada (dentro de la ventana de 24 horas).
- **Pregunta técnica para Argon4:** ¿Meta Cloud API permite hoy en producción enviar `type: "carousel"` dinámico en sesión libre para números sin catálogo de eCommerce, o devuelve el error `(#100) Invalid parameter / unsupported interactive type`?

### Ruta 3: Alternativas de Alta Calidad Visual dentro de Sesión Libre (Sin esperar aprobación de Meta)
Si Meta restringe el carrusel a plantillas pre-aprobadas, existen 2 alternativas de impacto inmediato:
1. **Interactive List Message (`type: "interactive", type: "list"`)**:
   - Menú interactivo profesional con botón desplegable *"Ver Especialistas"*.
   - Secciones por especialidad con descripción de cada doctor y botón de agendamiento.
2. **Interactive Reply Buttons (`type: "interactive", type: "button"`)**:
   - Cada médico se envía con su imagen de cabecera en alta definición + texto + **botones nativos táctiles** (ej: `[📅 Agendar con Dra. Daniela]` y `[📇 Guardar Contacto Digital]`), en lugar de URLs de texto plano.
3. **WhatsApp Flows**:
   - Flujo nativo interactivo con pantallas modales nativas para reservar citas directamente en WhatsApp.

---

## 5. PREGUNTAS CLAVE PARA ARGON4

1. **Sobre el Carrusel Nativo:**  
   Para este número oficial (`Phone Number ID: 639433412590000`), ¿es viable enviar un carrusel dinámico en vivo vía `POST /messages` con `type: "interactive"` y `interactive: { type: "carousel", ... }`, o es estrictamente mandatorio dar de alta un template en Meta Business Manager?
2. **Sobre la Experiencia de Usuario (UI/UX en WhatsApp):**  
   Para impresionar al cliente de la clínica médica en este demo:
   - ¿Cuál es la estructura recomendada para que los botones de *"Agendar Cita"* sean botones nativos táctiles en lugar de enlaces azules de texto?
3. **Implementación Recomendada:**  
   ¿Qué código de payload y adaptador debemos extender en `WhatsAppService.ts` para que renderice exactamente el slide visual deseado por César sin romper la estabilidad de producción?

---
*Fin del informe. Código protegido y sin modificaciones adicionales.*
