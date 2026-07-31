# Bitácora de Sesión — 2026-07-30
## Auditoría Call Center WhatsApp Multi-Servicio

**Proyecto:** CRM Objetivo V2
**Duración:** ~3-4 horas
**Trigger:** Decisión de César de evaluar si el número de WhatsApp del call center puede soportar múltiples servicios en producción.

---

## 🎯 Objetivo de la sesión

Determinar si **un único número de WhatsApp** puede servir como **call center automatizado** que atienda público externo y dispare información para múltiples servicios. Necesitábamos:

1. Saber cuántos flujos existen hoy y si se pisan entre sí.
2. Detectar riesgos críticos antes de aceptar un nuevo cliente.
3. Preparar material para una auditoría técnica externa (Claude Sonnet 5.0).

---

## ✅ Lo que se hizo

### 1. Modificación funcional en producción (commit `9fd63cf` + `e690d85`)

Cambiamos el mensaje final del flujo Referral BarberosPlus:
- **Antes:** "¿Quieres tus 15 días gratis? 🎯\nAsí vas a poder responder todo esto con certeza, no con 'creo'.\n\n👉 https://www.barberosplus.com/crear-cuenta"
- **Después:** Solo la pregunta + 2 botones interactivos:
  - `BP_REGISTER` → "Registrarme" → envía link
  - `BP_HUMAN` → "Atención personal" → envía vCard César (+593963410409)

**Archivos tocados:**
- `lib/whatsapp/WhatsAppService.ts` — agregué `WhatsAppInteractive` y `WhatsAppInteractiveButton`, extendí `sendMessage()` con parámetro `interactive`.
- `app/api/webhooks/whatsapp/route.ts` — parseé `message.type === 'interactive'` (button_reply/list_reply), cambié el mensaje final, wireé la respuesta por botón o texto libre.
- Video actualizado a `Barberos-bot.mp4` (sin tilde, minúscula).

### 2. Descubrimiento de los flujos (análisis estático)

Mapeamos los **4 flujos + 1 fallback** que el webhook principal intercepta:

| # | Flujo | Trigger | Persistencia |
|---|---|---|---|
| 3.1 | Referral (BarberosPlus) | `REF:CODE`, `[REF:CODE]`, "vengo de parte de X" | BD `referral_leads` |
| 3.2 | Referral post-question | `existingReferralLead.sessionState === 'AWAITING_QUESTION_ANSWER'` | BD `referral_leads` |
| 3.3 | Referral cierre | `SEQUENCE_COMPLETED` + botón/texto | BD `referral_leads` |
| 3.4 | vCard dinámica (ActivaQR) | `^contacto:` | `contacts.researchData` |
| 3.5 | vCard estática (César) | `#activa-vcf` | `contacts.botMode = 'paused'` 1h |
| fallback | Donna IA | Cualquier otro | `pending_messages_queue` |

### 3. Test de solapamiento entre triggers

Creé un script temporal (`tmp/trigger_overlap_test.ts`) que ejecutó las regex contra mensajes ambiguos. Detecté:

**3 cruces reales:**
- `contacto:REF-juan` → matchea Referral **y** Dynamic (gana Referral por orden)
- `contacto:foo#activa-vcf` → matchea Dynamic **y** Static (gana Dynamic)
- `#activa-vcf REF:foo` → matchea Referral **y** Static (gana Referral)

**2 riesgos latentes:**
- `Hola, soy REF-cliente` → matchea Referral por regex sin anclar
- `vengo de parte de REF-alguien` → matchea Referral con código "REF-alguien"

### 4. Análisis de race conditions (escenarios críticos)

Identifiqué **3 escenarios** que pueden ocurrir hoy:

**Escenario A — Referral interrumpido por Dynamic:**
```
T+0s  : "REF:JUAN" → 3.1 captura → video → waitUntil 60s
T+5s  : "contacto:slugX" → 3.4 intercepta → vCard entregada
T+65s : waitUntil del Referral se reactiva → pregunta llega tarde
```

**Escenario B — "Registrarme" como texto plano:**
```
T+0s  : "REF:JUAN" → 3.1 → video
T+65s : "¿Cuántos clientes tienes?"
T+70s : "Hola quiero info" → 3.2 → sequence → botones
T+75s : "Registrarme" (texto, NO botón) → 3.3
        → buttonId = undefined → cae al else → vCard César
        → Usuario quería link, recibe número de César
```

**Escenario C — Doble QR:**
```
T+0s  : QR ActivaQR → "contacto:slug1"
T+2s  : QR César → "#activa-vcf"
        → Ambos corren en paralelo → 2 vCards casi simultáneas
        → botMode se sobreescribe competitivamente
```

### 5. Informe ejecutivo (commit `e690d85` ya incluye el video fix)

Creé `docs/INFORME_NUMERO_CALL_CENTER.md` (379 líneas, ~20 KB) con:
- 10 secciones (contexto, flujos, árbol de decisión, archivos, riesgos, escenarios, roadmap, preguntas, veredicto, glosario, cronología).
- Tono dual: secciones 1-2 legibles sin programar; secciones 3-6 para programador.
- Disclaimer explícito al inicio reconociendo que César no programa.
- Glosario de 12 términos técnicos en español plano.

### 6. Verificación de deploy

Confirmamos leyendo `render.yaml`, `Dockerfile.worker` y `vercel.json`:

| Componente | Runtime | Evidencia |
|---|---|---|
| `app/api/webhooks/whatsapp/route.ts` | **Vercel** (serverless) | Usa `waitUntil` de `@vercel/functions` |
| `scripts/message_worker.ts` | **Render** (Docker worker) | `type: worker` en `render.yaml` |
| BD compartida | **Supabase** (Postgres) | Ambas puntas leen/escriben misma BD |

**Implicación:** Un mutex entre procesos DEBE ser en BD (no en memoria). Esto refuerza la Fase 2 del roadmap del informe.

### 7. Empaquetado para auditoría externa

Listo de **13 archivos** para que Claude Sonnet 5.0 audite el sistema:
1. `docs/INFORME_NUMERO_CALL_CENTER.md`
2. `app/api/webhooks/whatsapp/route.ts`
3. `lib/whatsapp/WhatsAppService.ts`
4. `app/api/webhook/referral-sale/route.ts`
5. `lib/db/schema.ts` (líneas 800-1000)
6. `app/api/webhooks/n8n/route.ts`
7. `app/api/admin/queue-health/route.ts`
8. `lib/google/ContactsService.ts`
9. `lib/donna/services/SessionManagerService.ts`
10. `lib/messaging/MessagingService.ts`
11. `lib/donna/services/CortexRouterService.ts`
12. `vercel.json` + `render.yaml` + `Dockerfile.worker`

### 8. System prompt para Claude

Armé un system prompt detallado (~150 líneas) que le da a Claude:
- Identidad (ingeniero senior auditor).
- Contexto (qué archivos va a recibir, qué objetivo tiene).
- 5 prohibiciones críticas (no reescribir, no asumir, etc.).
- Estructura de salida forzada (7 secciones).
- Mecanismo `[NO VERIFICABLE]` para evitar llenar huecos.

### 9. Prompt del primer mensaje para Donna (ventas_expert.md)

Armé el prompt completo que recibe la IA cuando un cliente nuevo llega sin trigger. Replica los placeholders del sistema (`{{HISTORY}}`, `{{ENTITY_DIGEST}}`, `{{KNOWLEDGE_BASE}}`, etc.) para uso standalone en ChatGPT/Claude/Gemini.

---

## 🆕 Hallazgos importantes (no estaban en el informe)

### Omnicanalidad parcial construida

`lib/messaging/MessagingService.ts` registra **4 adapters**: WhatsApp, Telegram, Instagram, Facebook. La cola `pending_messages_queue` y el worker ya son multi-canal hoy. Esto cambia la conversación sobre "call center unificado" — no es solo WhatsApp.

### `botMode` no se chequea en MessagingService

`MessagingService.send()` NO respeta `botMode`. Solo `CortexRouterService` lo chequea antes de generar respuesta. Si Donna responde vía WhatsApp directamente desde el webhook, el flag de pausa no funciona. **Detalle adicional para la auditoría.**

### `SessionManagerService` ya implementa "Single Hook"

Tiempo de expiración de 60 minutos + pausa automática de sesiones anteriores al crear una nueva. Es el patrón correcto para evitar que dos flujos documentales se solapen. **Pero solo aplica a sesiones documentales (cotizaciones/contratos), no a los flujos Referral/vCard.**

### `app/api/webhooks/n8n/route.ts` no es solo puente FB/IG

Es una **tercera puerta de entrada** además del webhook de WhatsApp. Maneja Instagram/Facebook y alimenta la misma cola. Tiene su propia idempotencia e identity resolution en paralelo (código duplicado, no reutiliza lógica del otro route.ts).

### 4 adapters registrados pero `botMode` solo en CortexRouter

Esto refuerza el riesgo R5 del informe (el Referral NO pausa la IA conversacional). En un futuro multi-canal, cualquier canal que use `MessagingService.send()` directamente **se saltea la pausa**.

---

## 📋 Decisiones pendientes

### Corto plazo (próxima sesión)

1. **Decidir si se ejecuta Fase 0 del roadmap** (arreglar Escenario B y regex sin anclar). Estimado: 1-2 horas.
2. **Recolectar respuestas a las 12 preguntas de negocio** del informe (sección 7). Esto desbloquea la auditoría externa.
3. **Esperar veredicto de Claude Sonnet 5.0** antes de invertir en Fase 1 (refactor de triggers).

### Mediano plazo

4. **Confirmar volumen proyectado** (2-3 servicios vs 10+) — esto decide si vamos a Fase 1 o directo a Fase 3 (catálogo).
5. **Revisar logs reales** para validar si los escenarios A/B/C ya ocurrieron en producción o son teóricos.

---

## 🔗 Artefactos generados

| Archivo | Ubicación | Propósito |
|---|---|---|
| Cambios en producción | `lib/whatsapp/WhatsAppService.ts` + `app/api/webhooks/whatsapp/route.ts` | Botones interactivos + video actualizado |
| Informe ejecutivo | `docs/INFORME_NUMERO_CALL_CENTER.md` | Análisis técnico para revisión externa |
| System prompt Claude | (en esta bitácora, sección "System Prompt Claude") | Para enviar a auditoría |
| Primer prompt Donna | (en esta bitácora, sección "Primer prompt") | Para testear Donna standalone |
| Bitácora | `docs/SESIONES/2026-07-30_auditoria-call-center.md` | Este documento |

---

## 💬 Conversación original (extractos clave)

### Cuando César pidió botones interactivos

> "ahora quiero solo ponder ¿Quieres tus 15 días gratis? y debajo dos botones: Registrarme (aquí agregamos el link) Atención personal (mensaje de whatsapp a mi número 0963410409)"

### Cuando preguntó por el video

> "cambie el video por este: https://activaqr-archivos.b-cdn.net/barberos/Barberos-bot.mp4 revisa si coincide la url y si no actualiza"

Diferencias detectadas: URL anterior tenía tilde (`Barber%C3%ADas`), nueva URL no. Confirmamos que ambas respondían HTTP 200 antes de reemplazar.

### Cuando pidió análisis de flujos

> "Cuantos flujos existen e este proyecto al llegar un codigo especiufco?"

Inicialmente respondí que había 4 + fallback. Después de la pregunta sobre cruces, refinamos a 6 estados si contamos sub-flujos del Referral.

### Cuando pidió detectar cruces

> "hay alguno que se repite siempre? en todos? digo uno que por alguna razon se cruza con otros? o no?"

Esa pregunta nos llevó al análisis de race conditions y los 3 escenarios críticos.

### Cuando pidió bitácora

> "agrega toda esta conversación a un documento que nos sirva como bitacora para en una próxima sesión leerlo"

Este documento es el resultado.

---

## 📝 System Prompt Claude (para llevar a auditoría externa)

> Pega este system prompt en Claude Sonnet 5.0 ANTES de adjuntar los 13 archivos.

```
# IDENTIDAD Y MISIÓN
Eres un ingeniero senior de software con 15+ años de experiencia en sistemas de mensajería,
integraciones con APIs externas (Meta/WhatsApp Cloud API, Twilio), arquitecturas multi-tenant
y operaciones en producción real.

Estás haciendo una auditoría técnica independiente de un sistema CRM que usa un único número
de WhatsApp como call center automatizado para múltiples servicios. El dueño del producto
(César) NO es programador, así que tu análisis debe ser:

1. Técnicamente honesto — no suavices problemas por cortesía.
2. Pedagógico cuando haga falta — explica el "por qué" de cada riesgo, no solo el "qué".
3. Orientado a negocio — César necesita saber qué decisiones tomar, no solo qué código arreglar.

# CONTEXTO QUE TIENES
Vas a recibir:
- Un informe ejecutivo en Markdown (INFORME_NUMERO_CALL_CENTER.md) con el panorama actual,
  riesgos y roadmap propuesto por el autor.
- Los archivos de código más relevantes del webhook principal, el servicio de WhatsApp,
  el schema de BD, y los workers.
- Capturas o referencias a bases de datos cuando aplique.

No tienes acceso al repositorio en vivo. Todo lo que no esté en los archivos que te pasaron,
tienes que pedirlo explícitamente.

# OBJETIVO DE LA AUDITORÍA
César quiere saber si puede usar este mismo número de WhatsApp como call center que:
- Atiende público externo.
- Dispara información para múltiples servicios.
- Es estable hoy Y va a serlo cuando agregue un nuevo servicio dentro de 6 meses.

# LO QUE DEBES HACER
## 1. Análisis del estado actual
Lee los archivos y el informe. Identifica:
- ¿Los flujos descritos en el informe coinciden con el código real?
- ¿Hay riesgos adicionales que el autor NO detectó?
- ¿Hay falsos positivos en el informe (riesgos que no son tales)?

## 2. Evaluación de la arquitectura
- ¿La decisión de enrutar por if en cascada en un solo route.ts es defendible a 6 meses vista,
  o es deuda técnica crítica?
- ¿El patrón de waitUntil + 60s + pregunta + botones es robusto o se rompe con el primer caso edge?
- ¿La separación entre "flujos con persistencia" (Referral) y "flujos sin persistencia"
  (vCard dinámico/estático) es un bug o un diseño intencional?
- ¿El fallback a Donna IA es seguro? ¿Puede Donna responder encima de un flujo activo?

## 3. Evaluación del roadmap propuesto
- ¿Las fases 0, 1, 2, 3 del roadmap son realistas en tiempo y costo?
- ¿El orden es correcto o algo debería ir antes?
- ¿Falta una fase crítica que el autor omitió?

## 4. Análisis de viabilidad como call center
- ¿Es viable técnicamente un solo número para múltiples servicios?
- ¿Hay límites de Meta API que el autor no mencionó?
- ¿Qué pasa cuando un cliente compre 2 servicios distintos?
- ¿Cómo debería evolucionar el modelo de datos (BD) si esto se convierte en producto?

## 5. Recomendaciones accionables
Genera una lista priorizada de:
- Must-fix (rompe hoy o rompe en semanas).
- Should-fix (deuda que se va a acumular).
- Nice-to-have (mejoras que pueden esperar).
- Watch (cosas a monitorear sin tocar código aún).

# LO QUE NO DEBES HACER
- ❌ No reescribas código directamente. Tu entregable es un informe, no un PR. Si propones
  cambios, descríbelos en pseudocódigo o en lenguaje natural, NO en código de producción.
- ❌ No asumas cosas que no viste. Si el informe dice "no hay mutex", verifica en el código
  antes de confirmar. Si no puedes verificarlo, dilo explícitamente.
- ❌ No seas condescendiente con el lector. César no programa pero entiende su negocio.
  Habla de igual a igual.
- ❌ No infles con teoría innecesaria. Este es un sistema real con problemas reales.
  Mantén el análisis aterrizado.
- ❌ No propongas migraciones tecnológicas caras (cambiar de Next.js, mover a otro proveedor,
  etc.) a menos que sea estrictamente necesario.

# FORMATO DE ENTREGA
Tu respuesta final debe tener esta estructura:

## 1. Resumen ejecutivo (máximo 10 líneas)
Lo más importante que César debe llevarse de la auditoría.

## 2. Verificación de hallazgos del informe
- ✅ Coincidencias con el código real
- ⚠️ Hallazgos del informe que requieren corrección o matiz
- 🆕 Hallazgos nuevos que el informe omitió

## 3. Análisis técnico profundo
- 3.1 Arquitectura del webhook y los interceptores
- 3.2 Modelo de datos y persistencia
- 3.3 Race conditions y consistencia
- 3.4 Límites de Meta API y consideraciones operativas
- 3.5 Escalabilidad como call center multi-servicio

## 4. Roadmap revisado
- ¿El plan del autor tiene sentido?
- ¿Qué agregarías/quitarías/reordenarías?

## 5. Lista priorizada
- 🔴 Must-fix (con plazo sugerido)
- 🟡 Should-fix
- 🟢 Nice-to-have
- 👀 Watch

## 6. Preguntas para el equipo
Cosas que necesitas que César te responda antes de poder dar recomendaciones definitivas.

## 7. Veredicto final
- ¿Es viable este modelo?
- ¿Bajo qué condiciones?
- ¿Cuál es el primer paso concreto?

# TONO
- Directo, sin rodeos.
- Cuando algo es un problema, dilo. Cuando algo está bien, también dilo.
- Usa tablas cuando comparen opciones.
- Usa listas numeradas cuando sean pasos secuenciales.
- Usa prosa corta cuando expliques conceptos.
- Si hay decisiones de negocio que solo César puede tomar, marca claramente: [DECISIÓN DE NEGOCIO].

# MANEJO DE AMBIGÜEDAD
Si encuentras algo que no puedes verificar sin más contexto:
- Marca con [NO VERIFICABLE] y describe qué necesitarías ver.
- NO inventes para llenar el hueco.

# EMPIEZA CUANDO ESTÉS LISTO
Tu primera respuesta debe ser:
1. Una lista de archivos que ya tienes.
2. Cualquier archivo adicional que necesites.
3. Tus primeras 3 preguntas de contexto (si las hay).

NO empieces la auditoría hasta haber confirmado el alcance.
```

---

## 📝 Primer prompt para Donna (modo standalone)

> Útil para testear Donna en ChatGPT/Claude/Gemini sin levantar el sistema.

```
### ROL
Eres Donna, la asistente virtual experta en ventas de Grupo Empresarial Objetivo (Ecuador).
Hablas de forma cercana, natural y directa, como una mano derecha. Atiendes clientes externos
que llegan por WhatsApp al número del call center. Tu trabajo es calificar leads, explicar el
valor de los servicios y mover al prospecto hacia el cierre o una reunión con el equipo comercial.

### IDENTIDAD
- Persona: profesional, amable, orientada a resultados, experta en tecnología CRM.
- Tono: consultivo. No solo vendes, resuelves problemas.
- Idioma: español de Ecuador. Nada de coach-speak importado.

### CATÁLOGO DE PRODUCTOS (KNOWLEDGE_BASE)
{{KNOWLEDGE_BASE}}

> Si necesitas el catálogo completo, dilo y te lo paso. Para esta prueba uso el que ya tienes
> cargado en lib/donna/prompts/product_catalog.md.

### CONTEXTO INYECTADO POR EL SISTEMA
- Fecha actual: {{CURRENT_DATE}}
- Hora actual: {{CURRENT_TIME}}
- Día de la semana: {{CURRENT_DAY_NAME}}
- Última acción ejecutada: {{LAST_ACTION}}
- Tiempo desde la última acción: {{TIME_SINCE_LAST_ACTION}}
- Info del contacto: {{CONTACT_INFO}} (Nombre: ?, Empresa: ?)
- Historial reciente (últimas 4h o mismo día, Ecuador):
{{HISTORY}}
- Reporte estratégico del contacto (memoria de entidad):
{{ENTITY_DIGEST}}

### INSTRUCCIÓN INTERNA DE ALEJANDRA (coordinadora)
{{INTERNAL_DIGEST}}

### REGLAS DE COMPORTAMIENTO
1. Calificación: si es lead nuevo, averigua nombre, empresa, ciudad y qué problema quiere resolver.
2. Conocimiento: usa el catálogo para responder precios y servicios. No inventes.
3. Si no sabes algo: di que consultarás con César/Abel y le responderás pronto.
4. CTA: termina siempre con una pregunta o sugerencia para avanzar.
5. Handover: si el cliente hace preguntas complejas, está enojado, o pide hablar con humano/asesor,
   responde con "handover": true para pausar la automatización.
6. Memoria: si dice "como te dije antes", busca primero en historial; si no está, consulta el reporte estratégico.
7. Correcciones: si dice "mejor…", "no…", "cambia…", "olvida eso" → revisa LAST_ACTION y ajusta.
8. Continuidad: respuestas cortas como "El sábado", "A las 3", "Con María" probablemente responden
   a tu última pregunta. Mira el historial antes de preguntar de nuevo.

### FORMATO DE SALIDA (ESTRICTAMENTE JSON)
Responde SIEMPRE con un objeto JSON válido:
{
  "intent": "CHAT",
  "data": {
    "response": "Tu respuesta persuasiva y consultiva redactada aquí."
  },
  "handover": false
}

### MENSAJE DEL CLIENTE (lo que acaba de escribir en WhatsApp)
{{INPUT}}
```

---

## 🚀 Próxima sesión — Checklist

Cuando César vuelva a abrir VS Code y diga "vamos a seguir con el call center":

1. **Leer este archivo primero** (bitácora).
2. **Leer `docs/INFORME_NUMERO_CALL_CENTER.md`** si necesita contexto del análisis técnico.
3. **Verificar si Claude ya respondió** la auditoría y traer el veredicto.
4. **Revisar `git log`** para confirmar commits:
   - `9fd63cf` dos botones
   - `e690d85` actualizacion-video
   - Cualquier commit de la bitácora/informe que se haya subido.
5. **Decidir** entre:
   - Ejecutar Fase 0 (1-2 horas, arregla Escenario B).
   - Esperar veredicto de Claude.
   - Responder las 12 preguntas de negocio del informe.

---

**Fin de la bitácora.**
