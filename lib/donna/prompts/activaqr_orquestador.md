# Orquestador — Mapa Maestro del Arnés ActivaQR

## 🧭 Flujo completo (9 pasos)

```
▶IN  Mensaje entrante (WhatsApp / Webhook)
 │
 ├─ 1. Normalizar mensaje según canal
 ├─ 2. Buscar/Crear sesión activa + inicializar Ficha
 ├─ 3. Timeout check (30 min)
 ├─ 4. ONBOARDING (SKILL 1·Fase 1) — siempre primero, sin filtros
 │     └─ Captura nombre en 1 paso. NO bloquea. NO pide políticas.
 ├─ 5. CLASIFICAR — regex hackeo + DeepSeek LLM (8 categorías)
 ├─ 6. Anti-hackeo — si hackeo → bloquear + log + cerrar
 ├─ 7. BARRERA LEGAL (SKILL 1·Fase 2) — si info sensible sin aceptar políticas
 │     └─ Presenta políticas → espera "acepto" → reanuda agente pendiente
 ├─ 8. Filtro ilógico — SOLO si el clasificador dijo "ambiguo"
 └─ 9. DERIVAR a skill correspondiente
⬅OUT Respuesta enviada
```

## 🗺️ Ruteo por categoría del clasificador

| Categoría | Skill activada | Módulo JS | Límite |
|---|---|---|---|
| `hackeo` | ⛔ Bloqueo inmediato | orquestador (directo) | 1 |
| `saludo` | Ninguna — respuesta directa | orquestador (directo) | — |
| `close_concreto` | **SKILL 3 — CLOSER** | `agentes/closer.js` | 15 msgs |
| `close_general` | **SKILL 3 — CLOSER** | `agentes/closer.js` | 15 msgs |
| `informador` | **SKILL 2 — INFORMADOR** | `agentes/informador.js` | 5 msgs |
| `soporte` | **SKILL 5 — SOPORTE** | `agentes/soporte.js` | 5 msgs |
| `humano` | **SKILL 6 — CONTACTO HUMANO** | `agentes/contactoPersonal.js` | 3 msgs |
| `ambiguo` | **SKILL 2 — INFORMADOR** (si lógico) | `agentes/informador.js` | — |

## 🔗 Post-cierre automático

Cuando el CLOSER completa una venta (pago confirmado):
→ **SKILL 4 — BLINDAJE LOPDP** se activa automáticamente como upsell
→ Módulo: `agentes/blindaje.js`
→ Límite: 10 mensajes unless el producto principal ya fue Blindaje

## 📄 La Ficha — Única fuente de verdad

Viaja dentro de `sesion.progreso.ficha`. Estructura:

```
ficha: {
  // Básicos (onboarding)
  nombre, numero, acepto_proteccion,

  // Perfil Psicológico (Informador — Detección Temprana + Descubridor IA)
  temperamento,            // 'flematico' | 'sanguineo' | 'colerico' | 'melancolico' | null
  temperamento_confianza,  // 'bajo' | 'medio' | 'alto'
  señales_temperamento,    // string[] — señales que dispararon la detección

  // Descubrimientos (SKILL 2 — Informador)
  rubro, dolores[], nivel_digital,
  tipo_negocio, tamaño_negocio, ubicacion,
  herramientas_actuales[], objetivo, urgencia,

  // Intención (clasificador + agentes)
  intencion_actual, producto_interes, objeciones[],

  // Descubrimientos libres (cualquier skill)
  descubrimientos[], notas, eventos[],

  // Contratación (SKILL 3 — Closer)
  plan_contratado, pago_recibido,

  // Historial conversacional
  historial: { mensajes[], resumen }
}
```

## 🔄 Flujo entre skills

```
SKILL 2 (Informador) descubre rubro + dolor
       │
       │  intencion = close_* + producto_detectado
       ▼
SKILL 3 (Closer) cierra la venta con DeepSeek
       │
       │  pago confirmado
       ▼
SKILL 4 (Blindaje) ofrece protección legal como upsell
```

## 📦 Skills y sus archivos

| # | Skill | Archivo .md | Archivo .js | IA |
|---|---|---|---|---|
| 1 | Protección de Datos (Onboarding + Barrera) | `skill-proteccion-datos.md` | `agentes/proteccionDatos.js` | — |
| 2 | Informador (Descubridor de Dolor + Temperamento) | `skill-informador.md` + `skill-informador-adn.md` | `agentes/informador.js` | ✅ DeepSeek |
| 3 | Closer (Cierre de Ventas) | `skill-closer.md` | `agentes/closer.js` | ✅ DeepSeek |
| 4 | Blindaje LOPDP (Upsell Legal) | `skill-closer-proteccion-datos` | `agentes/blindaje.js` | ✅ DeepSeek |
| 5 | Soporte Técnico | `skill-soporte.md` | `agentes/soporte.js` | ❌ pendiente |
| 6 | Contacto Humano | `skill-contactar-humano.md` | `agentes/contactoPersonal.js` | — |

## 🔧 Módulos de infraestructura

| Módulo | Archivo | Rol |
|---|---|---|
| Clasificador Híbrido | `clasificador.js` | Regex hackeo + DeepSeek LLM |
| Ficha del Cliente | `ficha.js` | Estructura, Descubridor IA, Historial, Resumen |
| Message Buffer | `messageBuffer.js` | Agrupación multi-línea 12s |
| Evolution API | `evolution.js` | Envío WhatsApp real |
| LocalStore | `localStore.js` | DB JSON local (fallback PostgreSQL) |
| Database | `database.js` | Pool PostgreSQL + fallback LocalStore |
| Servidor Express | `index.js` | Endpoints /health, /webhook, /webhook/evolution |

## 🛡️ Reglas de oro del sistema

1. **El orquestador es el ÚNICO que persiste.** Las skills devuelven `{respuesta, progreso}`.
2. **Onboarding SIEMPRE primero.** Sin excepciones. Sin filtros previos.
3. **Barrera legal obligatoria** antes de soltar precios o info sensible.
4. **Bote de pelotita** antes de cualquier link de pago o agendamiento.
5. **No convencemos.** Las skills hacen preguntas para que el cliente se convenza solo.
6. **Ficha crece orgánicamente.** El Descubridor IA extrae info inesperada de cada intercambio.
7. **Historial se resume a los 10 pares.** DeepSeek genera el resumen automáticamente.

