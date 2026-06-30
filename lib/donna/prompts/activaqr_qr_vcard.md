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

2. **Envío de vCard (Estrategia Dual Meta + Evolution API)**:
   Debido a problemas de MIME con la API oficial de Meta, se envía un archivo físico `.vcf` usando una de dos estrategias:
   *   **Meta Cloud API (Primaria)**: Descarga el archivo desde una URL estática de Vercel configurada explícitamente con headers `Content-Type: text/vcard`.
   *   **Evolution API (Fallback)**: Si Meta rechaza el archivo silenciosamente, se usa Evolution API (`sendMedia`) para enviarlo en `Base64` garantizando la entrega.

3. **Demora (20 Segundos)**:
   Se introduce un delay intencional asíncrono para dar tiempo a Meta a procesar y entregar el archivo VCF, y simular tiempo de escritura, asegurando el orden cronológico en el chat del usuario.

4. **Mensaje Instructivo**:
   > "Para guardar el contacto: \n1. Toca la tarjeta de arriba.\n2. Selecciona 'Guardar' o 'Añadir a contactos'.\n\n¡Perfecto! Ya quedaste registrado en mi agenda también. 📱\nMientras guardas mi contacto, échale un ojo a mi Estado de WhatsApp — tengo algo interesante que quiero mostrarte. 👀"

---

## 🚫 EXCLUSIÓN DEL AGENTE
Al interceptarse este mensaje en el Webhook, se omite enviarlo a la cola de procesamiento de Donna (`pendingMessagesQueue`) para evitar que la IA responda por duplicado. Sin embargo, el contacto SÍ se registra en el CRM (estado `sin_contacto`) y se loguea la interacción para el registro operativo.
