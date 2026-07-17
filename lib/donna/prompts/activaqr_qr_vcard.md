# 📇 Flujo de Recepción de Código QR — vCard
# activaqr_qr_vcard.md
# ─────────────────────────────────────────────────────────────────────────────
# MODOS DE ACTIVACIÓN
#   MODO A — Estático (César Reyes): mensaje contiene "#ACTIVA-VCF"
#   MODO B — Dinámico (Clientes ActivaQR): mensaje empieza con "Contacto:<slug>"
# ─────────────────────────────────────────────────────────────────────────────

Este flujo NO es procesado por inteligencia artificial.
Es interceptado directamente en `app/api/webhooks/whatsapp/route.ts` **antes** de entrar a la cola de Donna, garantizando máxima velocidad y cero ruido de IA.

---

## 🅰️ MODO ESTÁTICO — #ACTIVA-VCF (vCard de César Reyes)

**Trigger**: El mensaje contiene el texto exacto `#ACTIVA-VCF`

**Fuente**: QR impreso en materiales físicos de César Reyes (demos, networking).

**Secuencia** (flujo fragmentado anti-abandono):
1. **Texto inicial** → *"¡Hola [Nombre]! 👋 Guardá mi contacto haciendo clic"*
2. **Envío del `.vcf`** desde Vercel (`/cesar-reyes-jaramillo.vcf`) con doble estrategia:
   - **Primaria**: Meta Cloud API con link directo (con header `Content-Type: text/vcard`)
   - **Fallback**: Evolution API vía Base64
3. **Delay 30s** → Envío del video tutorial con texto: *"Por si no sabés cómo guardarlo, mirá este tutorial 👇"*
4. **Delay 5 min** → Texto: *"¿Y vos ya tenés tu propia tarjeta digital? Podés tener la tuya con tu foto, nombre y servicios. Te interesa saber cómo?"* + video de cierre
5. IA pausada por 1 hora (`botMode: paused`) — modo Networking Humano.
6. Registro automático en Google Contacts del número que escaneó.

---

## 🅱️ MODO DINÁMICO — Contacto:<slug> (Clientes ActivaQR)

**Trigger**: El mensaje **empieza** con `Contacto:` (case-insensitive).

**Fuente**: QR dinámico impreso en materiales de los **clientes de ActivaQR**.
Cuando alguien escanea el QR de, por ejemplo, "María Reyes", WhatsApp abre un chat y envía automáticamente: `Contacto:maria-reyes-8f3b`.

**Secuencia**:
1. Extrae el `slug` del mensaje (`maria-reyes-8f3b`).
2. Consulta HTTP GET a `https://activaqr.com/api/external/vcard?slug=<slug>` con header `x-api-key`.
3. Recibe: nombre, profesión, empresa, teléfono del cliente ActivaQR + `vcf_url`.
4. Envía el `.vcf` **dinámico** al número escaneador (usando Meta API como primaria, Evolution API como fallback con descarga en Base64).
5. Envía instrucciones de guardado.
6. IA pausada por 1 hora.
7. Guarda metadatos del escaneo en `researchData.activaqr` del contacto en CRM.
8. Registra automáticamente en Google Contacts.

---

## 🚫 EXCLUSIÓN DEL AGENTE

En ambos modos, al interceptar el mensaje se retorna `200 OK` a Meta de forma inmediata y se omite el encolado en `pendingMessagesQueue`. Donna nunca ve estos mensajes. El contacto SÍ se registra en el CRM y la interacción se loguea para el historial operativo.

---

## 📊 ESTRATEGIA DE MÉTRICAS — Lo que podemos recolectar por QR

Cada vez que alguien escanea el QR de un cliente de ActivaQR, el CRM captura automáticamente:

### Datos del Escaneador (el público del cliente)
| Dato | Fuente | Dónde se guarda |
|---|---|---|
| Número de WhatsApp | `message.from` en webhook | `contacts.phone` + `contact_channels` |
| Nombre de perfil de WhatsApp | `value.contacts[0].profile.name` | `contacts.contactName` |
| Fecha y hora exacta del escaneo | `new Date()` al momento del trigger | `interactions.performedAt` |
| Fuente de origen | `source: 'activaqr_vcard'` | `contacts.source` |

### Datos de la Interacción (trazabilidad)
| Dato | Dónde se guarda |
|---|---|
| Slug del QR escaneado | `interactions.metadata.slug` |
| Datos del cliente ActivaQR (nombre, empresa) | `interactions.metadata.client` |
| Registro de IA pausada | `donna_chat_messages` con `humanPausedUntil` |
| Datos en campo de investigación | `contacts.researchData.activaqr` (JSON) |

### Métricas que podemos entregar al cliente de ActivaQR
Con lo que ya tenemos podemos generar:
- **Total de escaneos** por slug → `SELECT COUNT(*) FROM interactions WHERE metadata->>'slug' = '<slug>'`
- **Listado de personas** que escanearon → `SELECT contacts.phone, contacts.contactName, interactions.performedAt FROM interactions JOIN contacts...`
- **Línea de tiempo de escaneos** (cuándo escanean más: hora del día, día de la semana)
- **Personas únicas vs. escaneos repetidos** (mismo número, múltiples veces)
- **% que tienen nombre de perfil de WhatsApp** (grado de completitud del contacto)

### Datos adicionales que PODRÍAMOS agregar (sin cambios de infraestructura)
- **Ciudad/Región**: Si en el futuro el cliente incluye parámetros extras en el QR text (ej: `Contacto:slug?event=networking-quito`), se puede rastrear el evento donde ocurrió el escaneo.
- **Estado de WhatsApp visto**: Meta no lo expone en API, pero se puede rastrear por el flujo de respuesta del usuario.
- **Guardó el contacto**: No es trackeable directamente. Se puede inferir si el usuario inicia un chat más adelante.

---

## 📁 ARCHIVO DE REFERENCIA
- Implementación: `app/api/webhooks/whatsapp/route.ts` (sección `// 3.4`)
- Spec técnica de ActivaQR: `GUIA_WHATSAPP_API_META.md`
