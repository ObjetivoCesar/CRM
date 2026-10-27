# 🏥 Flujo Demo Clínica — Hospital Clínica San Agustín (HCSA)
# demo_clinica_san_agustin.md
# ─────────────────────────────────────────────────────────────────────────────
# ACTIVACIÓN: Mensaje contiene "san_agustin_demo" (o variaciones)
# ESPECIALIDAD: Alergología en Loja (https://hcsa.ec/alergologia-en-loja/)
# ─────────────────────────────────────────────────────────────────────────────

Este flujo sigue la misma arquitectura de alto rendimiento y cero fricción de `activaqr_qr_vcard.md`:
- NO es procesado por inteligencia artificial.
- Es interceptado directamente en `app/api/webhooks/whatsapp/route.ts` antes de la cola de Donna.
- Retorna un `HTTP 200` a Meta en <100ms para evitar reintentos.
- Ejecuta la entrega secuencial en segundo plano usando `waitUntil`.
- Pausa la IA por 1 hora para permitir una demo humana limpia.

---

## 🎯 OBJETIVOS DE LA DEMO COMERCIAL

1. **Impacto Visual Inmediato**: Mostrar cómo un paciente que consulta por WhatsApp recibe al instante las fichas de los especialistas con fotos y acceso directo a citas.
2. **Venta Cruzada ActivaQR**: Presentar la tecnología de contacto digital (vCard `.vcf`), demostrando que el paciente puede guardar el contacto médico o de la clínica en su agenda telefónica con 1 solo toque.

---

## ⚡ SECUENCIA DE ENVÍO (DINÁMICA Y ESCALONADA)

### 1. Mensaje de Cabecera Institucional
> 🏥 *Hospital Clínica San Agustín — Especialidad de Alergología*
> 
> Hola, bienvenido al servicio de atención y agendamiento médico en Loja. Ponemos a su disposición a nuestros especialistas de primer nivel:

---

### 2. Médico 1 — Dra. Daniela Hidalgo
- **Formato**: Imagen oficial con texto descriptivo y enlace directo a WhatsApp.
- **Imagen**: `https://hcsa.ec/wp-content/uploads/2021/08/Dra-Daniela-Hidalgo-HCSA.jpg`
- **Texto**:
  > 👩‍⚕️ *Dra. Daniela Hidalgo*
  > Especialista en Alergología e Inmunología
  > Hospital Clínica San Agustín (HCSA)
  > 
  > 📅 *Agendar consulta directa:*
  > https://wa.me/593990070606?text=Quiero%20una%20cita%20con%20Alergolog%C3%ADa%20Dra.%20Daniela%20Hidalgo

---

### 3. Médico 2 — Dr. Andrés Torres
- **Formato**: Ficha médica informativa con agendamiento directo.
- **Texto**:
  > 👨‍⚕️ *Dr. Andrés Torres*
  > Especialista en Alergología
  > Hospital Clínica San Agustín (HCSA)
  > 
  > 📅 *Agendar consulta directa:*
  > https://wa.me/593990070606?text=Quiero%20una%20cita%20con%20Alerg%C3%B3logo%20Dr.%20Andr%C3%A9s%20Torres

---

### 4. Venta Cruzada — Contacto Digital ActivaQR (.vcf)
- **Formato**: Documento interactivo descargable `.vcf` + mensaje de valor.
- **Archivo**: `https://crm-z2kv.vercel.app/cesar-reyes-jaramillo.vcf` (`Cesar_Reyes_Jaramillo.vcf`)
- **Texto explicativo**:
  > 📇 *Innovación de Contacto Digital (ActivaQR):*
  > Al tocar el archivo de contacto arriba 👆, todos los datos se guardan automáticamente en la agenda del teléfono del paciente (nombre, celular, clínica y foto) en 1 solo clic, sin escribir nada a mano.

---

## 🔒 PROTECCIÓN Y AISLAMIENTO EN PRODUCCIÓN

- **Idempotencia**: Se registra `demo_hcs_${message.id}` en `webhookEventsProcessed` para evitar dobles envíos si Meta reintenta la petición.
- **Pausa de IA**: Se registra una pausa de 1 hora en `donnaChatMessages` (`humanPausedUntil = now + 1h`) para que el bot de Donna no interfiera durante la demo.
- **Cero conflicto con ActivaQR**: Las condiciones de `contacto:slug` y `#activa-vcf` permanecen 100% aisladas e intactas.
