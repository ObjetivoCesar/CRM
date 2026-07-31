# Informe Técnico — Número WhatsApp como Call Center Unificado

**Fecha:** 2026-07-30
**Proyecto:** CRM Objetivo V2
**Autor del análisis:** GitHub Copilot
**Destinatario:** César Reyes (no programador, pero dueño del producto)
**Propósito:** Evaluar si un único número de WhatsApp puede servir como **call center automatizado** que atiende público externo y dispara información para múltiples servicios, identificando archivos, flujos, riesgos actuales y camino de evolución.

---

## 0. Contexto y Disclaimer del lector

> ⚠️ Este documento fue preparado para que un **humano que no sabe programar** pueda entender qué hace hoy el sistema, qué puede fallar, y qué se necesita para convertir un número de WhatsApp en una pieza estable de negocio. **Todo lo que aparece aquí es viable técnicamente** — la pregunta no es "¿se puede?", sino "¿cuánto cuesta mantenerlo y blindarlo?". Al final hay un mapa claro de archivos para que un programador externo (o el autor) pueda ejecutar los cambios.

**Lectura recomendada:**
1. Sección 1 → qué hace hoy el número.
2. Sección 2 → cómo se decide qué hacer con cada mensaje.
3. Sección 3 → archivos involucrados (lista para abrir y leer).
4. Sección 4 → riesgos actuales (lo que puede romperse mañana).
5. Sección 5 → escenarios críticos encontrados.
6. Sección 6 → roadmap para llegar a "call center blindado".
7. Sección 7 → preguntas abiertas para discutir con calma.

---

## 1. ¿Qué hace hoy el número de WhatsApp?

El número recibe mensajes por la **Meta WhatsApp Cloud API** y los enruta por **4 flujos automáticos + 1 fallback a un bot conversacional (Donna)**. Todos comparten el mismo endpoint de entrada.

### 1.1 Resumen ejecutivo

| # | Flujo | Disparador | Salida al usuario | Persistencia |
|---|---|---|---|---|
| **3.1** | Referral (BarberosPlus) | Mensaje contiene `REF:CODIGO` o variantes | Video + pregunta + botones | BD `referral_leads` |
| **3.2** | Referral respuesta | Lead ya capturado en estado `AWAITING_QUESTION_ANSWER` | Mensaje largo + botones finales | BD `referral_leads` |
| **3.3** | Referral cierre | Estado `SEQUENCE_COMPLETED` + botón o texto | Link registro **o** vCard César | BD `referral_leads` |
| **3.4** | vCard dinámica (ActivaQR) | Mensaje empieza con `contacto:slug` | Tarjeta de contacto + tutorial | `contacts.researchData` |
| **3.5** | vCard estática (César) | Mensaje contiene `#activa-vcf` | vCard César + pausa IA 1h | `contacts.botMode = 'paused'` |
| **fallback** | Donna IA | Cualquier otro mensaje | Respuesta conversacional | `pending_messages_queue` + worker |

> 📌 **Conclusión sección 1:** Sí, el número ya opera como multi-flujo. Lo que **no** tiene hoy es un registro central de "qué servicio se le vendió a este cliente" — los flujos se pisan entre sí.

---

## 2. Árbol de decisión: ¿qué pasa cuando llega un mensaje?

```
Mensaje entrante (webhook POST)
│
├─► [1-2] Normaliza + identifica contacto (BD)
│
├─► [3.1] ¿Contiene REF:CODE o "vengo de parte de X"?
│       ├─ SÍ y es nuevo     → Capturar referral_lead + enviar video
│       └─ SÍ pero ya existe → cae a 3.2/3.3 según sessionState
│
├─► [3.2] ¿Lead existe y espera respuesta?
│       └─ SÍ → Marcar SEQUENCE_COMPLETED + mensaje + botones finales
│
├─► [3.3] ¿Lead ya completó sequence?
│       ├─ Botón BP_REGISTER → Link
│       ├─ Botón BP_HUMAN    → vCard César
│       └─ Texto libre       → vCard César (⚠️ ver riesgo R3)
│
├─► [3.4] ¿Mensaje empieza con "contacto:"?
│       └─ SÍ → Llamar API externa → entregar vCard
│
├─► [3.5] ¿Mensaje contiene "#activa-vcf"?
│       └─ SÍ → vCard César + pausa IA + sync Google Contacts
│
└─► [4-5] Fallback
        └─ Encolar en pending_messages_queue (25s debounce)
           → message_worker.ts agrupa y enruta a cortexRouter (Donna IA)
```

> ⚠️ **Orden importa:** los `if` están en cascada. **El primer match gana.** Si una regex matchea varios triggers, gana el que aparece antes en el código. Hoy esto "funciona por accidente", no por diseño robusto.

---

## 3. Archivos involucrados (mapa completo para análisis externo)

Esta es la lista exhaustiva. **Cada archivo tiene una razón para estar en este informe.** Un programador que lea solo estos puede entender el 100% del flujo.

### 3.1 Punto de entrada (críticos)

| Archivo | Líneas | Rol | Por qué importa |
|---|---|---|---|
| [app/api/webhooks/whatsapp/route.ts](../../app/api/webhooks/whatsapp/route.ts) | 876 | **El orquestador.** Recibe TODOS los mensajes de WhatsApp y decide qué hacer. | Contiene los 4 interceptores. Cualquier cambio al comportamiento del número pasa por aquí. |
| [lib/whatsapp/WhatsAppService.ts](../../lib/whatsapp/WhatsAppService.ts) | ~400 | Cliente HTTP a Meta API. Envía textos, multimedia y mensajes interactivos. | Es la única vía de salida. Si falla, **ningún mensaje sale**. |

### 3.2 Lógica de flujos específicos

| Archivo | Rol |
|---|---|
| [app/api/webhook/referral-sale/route.ts](../../app/api/webhook/referral-sale/route.ts) | Endpoint inverso: lo llama BarberosPlus cuando un lead **compra**, para marcar `converted = true` y atribuir comisión. Es el cierre del círculo Referral. |
| [lib/donna/services/CortexRouterService.ts](../../lib/donna/services/CortexRouterService.ts) | Router conversacional del bot Donna (fallback). Decide qué agente IA responde cuando no hay trigger. |

### 3.3 Worker y persistencia

| Archivo | Rol |
|---|---|
| [scripts/message_worker.ts](../../scripts/message_worker.ts) | **Worker desacoplado** que drena `pending_messages_queue` cada 25s y enruta a Donna. Single Writer Pattern. |
| [lib/db/schema.ts](../../lib/db/schema.ts) | Define tablas clave: `referral_leads`, `pending_messages_queue`, `webhook_events_processed`, `contacts`, `interactions`, `donna_chat_messages`. |

### 3.4 Endpoints y scripts de soporte

| Archivo | Rol |
|---|---|
| [app/api/admin/queue-health/route.ts](../../app/api/admin/queue-health/route.ts) | Monitoreo del estado de la cola (debugging). |
| [app/api/webhooks/n8n/route.ts](../../app/api/webhooks/n8n/route.ts) | Webhook desde n8n (orquestador externo). |
| [scratch/check_my_referrals.ts](../../scratch/check_my_referrals.ts) | Script de inspección manual (sandbox, no se ejecuta en prod). |
| [scratch/check_referrals.ts](../../scratch/check_referrals.ts) | Idem. |
| [scratch/delete_referrals.ts](../../scratch/delete_referrals.ts) | Idem. |

### 3.5 Tablas de base de datos involucradas

| Tabla | Schema ref | Función |
|---|---|---|
| `referral_leads` | [schema.ts:968](../../lib/db/schema.ts#L968) | Estado del funnel BarberosPlus por teléfono. |
| `pending_messages_queue` | [schema.ts:811](../../lib/db/schema.ts#L811) | Cola con debounce 25s. |
| `webhook_events_processed` | [schema.ts:955](../../lib/db/schema.ts#L955) | Idempotencia (anti-duplicados Meta). |
| `contacts` | — | Maestro de contactos. Campo `botMode` controla pausa IA. |
| `interactions` | — | Bitácora de todo mensaje entrante/saliente. |
| `donna_chat_messages` | — | Historial del bot Donna. |

---

## 4. Riesgos actuales (lo que puede romperse mañana)

### 🔴 R1 — Race condition entre flujos concurrentes

**Síntoma:** Un usuario envía `REF:JUAN`, espera, y antes de los 60s envía `contacto:slugX`. El Referral sigue corriendo en background (`waitUntil`) y la pregunta llega después de la vCard.

**Impacto:** Confusión para el cliente, posible doble venta.

**Causa raíz:** No hay un mutex/lock por `from`. Cada webhook procesa en paralelo sin saber del otro.

**Archivo afectado:** `app/api/webhooks/whatsapp/route.ts` líneas 220-340.

### 🔴 R2 — Dos QRs escaneados en rápida sucesión

**Síntoma:** Usuario escanea QR ActivaQR y luego el QR de César casi inmediatamente. Recibe 2 vCards casi simultáneas, IA se pausa y se reescribe el `botMode` de forma competitiva.

**Impacto:** UX rota, posibles datos corruptos.

**Causa raíz:** Los flujos 3.4 y 3.5 ambos modifican `contacts.botMode` y `contacts.researchData` sin transacción.

**Archivo afectado:** `app/api/webhooks/whatsapp/route.ts` líneas 400-630 (3.4) y 638-841 (3.5).

### 🔴 R3 — Texto libre "Registrarme" no se detecta como botón

**Síntoma:** En la fase final del Referral (3.3), si el usuario escribe "Registrarme" en lugar de presionar el botón, el código lo manda al **fallback de César** (vCard), no al link de registro.

**Impacto:** Embudo roto. El usuario quería registrarse y termina hablando con César.

**Causa raíz:** Solo `buttonId === 'BP_REGISTER'` activa el link. El `buttonTitle` se loguea pero no se evalúa contra el texto.

**Archivo afectado:** `app/api/webhooks/whatsapp/route.ts` líneas 313-340.

### 🟡 R4 — Regex sin anclar disparan falsos positivos

**Síntoma:** Cualquier mensaje que contenga la palabra "REF-" en contexto normal (ej. "soy REFerente de ventas") activa el flujo Referral.

**Causa:** Las regex usan `\b` pero no `^`, y no excluyen prefijos `contacto:` o `#activa-vcf`.

**Archivo afectado:** `app/api/webhooks/whatsapp/route.ts` línea 224-228.

### 🟡 R5 — El Referral NO pausa la IA conversacional

**Síntoma:** Mientras Referral 3.1/3.2/3.3 está activo (60s + pregunta + botones), **el bot Donna sigue activo** porque solo 3.4 y 3.5 setean `botMode: 'paused'`. Si el usuario responde algo raro, Donna puede contestar encima.

**Impacto:** Doble respuesta, conversación sin coherencia.

**Archivo afectado:** `app/api/webhooks/whatsapp/route.ts` (ausencia de pausa en líneas 240-340).

### 🟡 R6 — Estados del Referral no se limpian

**Síntoma:** Si un lead Referral abandona a mitad del funnel, queda en `AWAITING_QUESTION_ANSWER` para siempre. Si vuelve a escribir semanas después, **el sistema asume que sigue esperando respuesta** y le manda los mensajes de la sequence otra vez.

**Causa:** No hay timeout ni expiración de `referral_leads.sessionState`.

**Archivo afectado:** `lib/db/schema.ts` línea 968 (tabla sin campo `expires_at`).

---

## 5. Escenarios críticos (los 3 que más probabilidad tienen de ocurrir)

### Escenario A — El Referral es interrumpido por un Dynamic

```
T+0s  : "REF:JUAN"
        → 3.1 captura → video enviado → waitUntil 60s
T+5s  : "contacto:slugX"
        → 3.4 lo intercepta
        → vCard entregada
T+65s : waitUntil del Referral se reactiva, pregunta llega
        → Cliente confundido: "¿qué tengo que responder?"
```

### Escenario B — Texto "Registrarme" como texto plano

```
T+0s  : "REF:JUAN" → 3.1 → video
T+65s : "¿Cuántos clientes tienes?"
T+70s : "Hola quiero info" → 3.2 → sequence → botones
T+75s : "Registrarme" (texto, NO botón) → 3.3
        → buttonId = undefined → cae al else → vCard César
        → Usuario quería link, recibe número de César
```

### Escenario C — Doble QR

```
T+0s  : QR ActivaQR → "contacto:slug1"
T+2s  : QR César → "#activa-vcf"
        → Ambos corren en paralelo en waitUntil
        → 2 vCards casi simultáneas
        → botMode se sobreescribe competitivamente
```

> Estos tres escenarios **pueden ocurrir hoy**, no son teóricos. El Escenario B es el más urgente porque rompe el funnel comercial directamente.

---

## 6. Roadmap para llegar a "Call Center Blindado"

### Fase 0 — Estabilización inmediata (1-2 horas)

| Acción | Esfuerzo | Impacto |
|---|---|---|
| **F0.1** Solucionar R3: detectar "Registrarme"/"Atención personal" como texto equivalente al botón | 30 min | Alto (arregla funnel) |
| **F0.2** Anclar regex con `^` y excluir prefijos `contacto:` y `#activa-vcf` | 1 hora | Medio (reduce falsos positivos) |

### Fase 1 — Refactor centralizado de triggers (4-8 horas)

Crear `lib/whatsapp/triggers.ts` con una función pura:

```ts
type Trigger =
  | { kind: 'referral_new'; code: string }
  | { kind: 'referral_continuation'; sessionState: string }
  | { kind: 'dynamic_vcard'; slug: string }
  | { kind: 'static_vcard' }
  | { kind: 'fallback' };

function detectTrigger(content: string, existingReferralLead: any): Trigger
```

**Beneficios:**
- Un solo match por mensaje (elimina R1, R4).
- Lógica testeable unitariamente.
- Añadir un nuevo servicio = 1 línea en el switch.
- Documentación implícita en el código.

### Fase 2 — Mutex por conversación (1 día)

- Tabla `conversation_locks` con `chatId` PK.
- Al recibir un mensaje, intentar `INSERT ... ON CONFLICT DO NOTHING`.
- Si falla el lock, esperar 2s y reintentar (max 3 veces).
- Elimina R1, R2 y la raíz de R5.

### Fase 3 — Catálogo de servicios (lo que habilita "vender más")

```
services table
├── id, slug, name, trigger_regex
├── response_template, media_assets[]
├── bot_pause_minutes
└── attribution (ref_code, commission_pct, etc.)
```

Cada vez que César contrate un nuevo servicio:
1. Agregar fila en `services`.
2. Subir media (video, vCard) al CDN.
3. Listo. El trigger se activa solo.

### Fase 4 — Observabilidad y SLAs (2-3 días)

| Métrica | Para qué |
|---|---|
| Latencia p50/p95/p99 de respuesta | Detectar cuando Meta está lento |
| Tasa de conversión por flujo | Saber cuál servicio vende más |
| Cola `pending_messages_queue` size | Detectar cuando Donna se atasca |
| Falsos positivos de triggers | Medir calidad de regex |
| Tiempo en cada `sessionState` | Optimizar funnels |

---

## 7. Preguntas abiertas para discutir con cabeza fría

> Estas son las preguntas que un humano de negocio debe responder antes de invertir en blindar el sistema.

### 7.1 Sobre el modelo de negocio

1. **¿Cuántos servicios distintos venderá este número?** Si son 2-3, el refactor de Fase 1 es suficiente. Si son 10+, hace falta Fase 3 (catálogo).

2. **¿Cada servicio tendrá su propia marca o todos vivirán bajo "Objetivo"?** Esto afecta si cada vCard/video debe vivir en el CDN de la marca cliente o en el de Objetivo.

3. **¿Habrá comisiones por servicio?** El Referral hoy tiene un sistema de first-touch attribution (ver `referral-sale/route.ts`). ¿Es el patrón que se replica para cada nuevo servicio, o cada uno tendrá el suyo?

4. **¿Qué pasa cuando un cliente ya compró un servicio y llega por otro?** Hoy los flujos no comparten memoria. Necesita decisión: ¿el cliente debe estar en un solo "estado de funnel" o varios simultáneos?

### 7.2 Sobre la operación

5. **¿Quién atenderá el handover humano?** Hoy César es el único (`+593963410409`). Si crecen los servicios, ¿se necesitan varios humanos por servicio? ¿Rotación?

6. **¿Cuál es la SLA aceptable?** Hoy el Referral tiene 60s de espera entre mensajes. ¿Eso es OK para todos los servicios, o cada uno tiene su propio ritmo?

7. **¿Hay horario de atención?** Hoy el bot responde 24/7. ¿Algunos servicios deben pausarse de noche?

8. **¿Qué pasa con mensajes multimedia (imagen, audio, documento) que NO son parte de un trigger?** Hoy caen al fallback de Donna. ¿Es correcto?

### 7.3 Sobre lo técnico (para discutir con programador)

9. **¿Meta Cloud API aguanta el volumen proyectado?** Hay límites: 1000 msgs/día gratis, después cobro por conversación. Si el call center opera 24/7 con 50+ servicios, hay que pensar en upgrade de tier.

10. **¿Un solo número de WhatsApp puede tener múltiples "display names"?** No — Meta exige un nombre fijo. Esto es branding, no técnico.

11. **¿WhatsApp Business API permite múltiples números en una sola cuenta Meta Business?** Sí (multi-WABA). Si algún servicio requiere aislamiento completo, se puede. Pero el plan actual (un número, muchos servicios) es válido y más barato.

12. **¿Vale la pena mover a Twilio o 360dialog en lugar de Meta directo?** Hoy se usa Meta directo. Alternativas dan mejor DX (SDK, plantillas) pero más costo. Decisión de negocio.

---

## 8. Veredicto final (no técnico, para César)

> **¿Es posible usar este mismo número como call center para múltiples servicios?**

**Sí, técnicamente es posible y ya está pasando en parte.** El número ya opera como multi-flujo desde 2025.

**Lo que falta para producción seria:**

1. **Arreglar los 3 escenarios críticos de la sección 5** (especialmente el B). Es trabajo de 1 día.
2. **Refactor de triggers a un solo punto de decisión** (Fase 1). 1 semana.
3. **Catálogo de servicios** (Fase 3). 2 semanas para el primero, después cada nuevo servicio es 1-2 días.

**Lo que NO es problema:**

- Meta Cloud API soporta el patrón.
- La arquitectura actual (webhook → orquestador → flujos) es la correcta.
- La BD ya tiene las tablas necesarias (`referral_leads`, `contacts`, etc.).

**Riesgo principal:** seguir añadiendo servicios al webhook sin refactorizar. Cada nuevo servicio agregará más `if` en cascada y los bugs se multiplicarán.

**Recomendación:** invertir 1-2 semanas en el refactor (Fase 1 + 2) antes de aceptar un nuevo cliente. Después, cada nuevo servicio es barato.

---

## 9. Anexo — Glosario para no programadores

| Término | Qué significa |
|---|---|
| **Webhook** | Puerta de entrada automática: Meta nos avisa por HTTP cuando llega un mensaje. |
| **Trigger** | Patrón que reconoce el mensaje para decidir qué hacer (ej: la palabra "REF:" dispara el flujo BarberosPlus). |
| **Bot IA / Donna** | Bot conversacional que responde como humano cuando no hay un trigger específico. |
| **vCard** | Tarjeta de contacto digital (archivo .vcf) que se guarda en el teléfono. |
| **Botón interactivo (Meta)** | Botón que aparece debajo de un mensaje en WhatsApp. El usuario presiona y el bot recibe el ID. |
| **Meta Cloud API** | Servicio oficial de WhatsApp Business. Es el "cartero" que entrega los mensajes. |
| **CDN** | Red de servidores que entrega archivos rápido. Hoy usamos Bunny CDN. |
| **Idempotencia** | Mecanismo para no procesar el mismo mensaje 2 veces (Meta reintenta si respondemos lento). |
| **First-touch attribution** | En comisiones, el primero que trajo al cliente se lleva el crédito, no el último. |
| **Single Writer Pattern** | Solo un proceso (el worker) escribe en `donna_chat_messages`, evita conflictos. |
| **waitUntil** | Función de Vercel: responde a Meta en <100ms pero deja el trabajo pesado corriendo en background. |
| **Mutex / Lock** | Candado que impide que dos procesos hagan lo mismo a la vez (evita choques). |

---

## 10. Anexo — Cronología de cambios relevantes (este commit y anteriores)

| Commit | Qué cambió |
|---|---|
| `9fd63cf` dos botones | Agrega botones interactivos (Registrarme / Atención personal) al final del funnel Referral. |
| `e690d85` actualizacion-video | Cambia URL del video Barberos a nueva versión sin tilde. |
| `15597cd` fix(scratch) | Arregla RowList en script de creación de tabla referral. |
| `71a0f1c` timing mensajes | Ajusta delays entre mensajes del Referral. |
| `78eb50f` fix referral QR | Detecta formato "vengo de parte de {code}". |

---

**Fin del informe.** Este documento es deliberadamente largo para que sirva como referencia externa. Las secciones 1-2 son la "explicación para César", las 3-6 son "para el programador", y la 7-8 son "para decidir el roadmap".
