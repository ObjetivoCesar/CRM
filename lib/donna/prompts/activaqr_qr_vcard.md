# 📇 Flujo de Recepción de Código QR — vCard (Contacto de César Reyes)
# activaqr_qr_vcard.md
# ─────────────────────────────────────────────────────────────────────────────
# USO: Se activa automáticamente en la capa más externa (Webhook) cuando un 
#      usuario escanea un código QR en una demostración.
# Señales de activación:
#   - El mensaje entrante contiene el texto exacto: "#ACTIVA-VCF"
# ─────────────────────────────────────────────────────────────────────────────

## ⚙️ MECÁNICA DE RESPUESTA (NATIVA)

Este flujo NO es procesado por inteligencia artificial para garantizar máxima velocidad y precisión. Es interceptado directamente en `app/api/webhooks/whatsapp/route.ts`.

Cuando el sistema detecta el código `#ACTIVA-VCF`, ejecuta secuencialmente:

1. **Mensaje de Saludo**:
   > "¡Gracias por escribirnos! Aquí tienes el contacto de César Reyes 👇"

2. **Envío de vCard (Nativo Meta API)**:
   Se envía un payload nativo de tipo `contacts` usando `WhatsAppService`.
   Esto renderiza la "tarjetita" de WhatsApp, no un archivo adjunto que deba descargarse.

3. **Mensaje Instructivo**:
   > "Para guardar el contacto: \n1. Toca la tarjeta de arriba.\n2. Selecciona 'Guardar' o 'Añadir a contactos'.\n\n¡Listo! Así nos aseguramos de estar conectados. 🤝"

---

## 🚫 EXCLUSIÓN DEL AGENTE
Al interceptarse este mensaje en el Webhook, se omite enviarlo a la cola de procesamiento de Donna (`pendingMessagesQueue`) para evitar que la IA responda por duplicado. Sin embargo, el contacto SÍ se registra en el CRM (estado `sin_contacto`) y se loguea la interacción para el registro operativo.
