# ActivaQR Brain — Mapa de Arquitectura v1.0

## Ubicación: `lib/activaqr/brain.ts`

---

## 🧠 Resumen

Función pura: recibe `(mensaje, ficha, historial)` → devuelve `{respuesta, nuevaFicha, transferir}`

**Total: 2 llamadas al LLM por mensaje** (Clasificador fusionado + Agente experto).
Extra: 1 llamada adicional si el onboarding no captura el nombre con regex.

---

## 🔄 Flujo Completo (en orden)

```
ENTRADA: mensaje, fichaActual, historial
  │
  ├── 1. INPUT        → Log del mensaje recibido
  ├── 2. TIMEOUT      → ¿Pasaron +30 min? Resetea estado temporal
  ├── 3. EMPTY CHECK  → ¿Mensaje vacío? Retorna null
  ├── 4. INIT         → Inicializa sesion, informador, closer
  ├── 5. /RESET       → ¿Es comando reset? Limpia ficha completa
  ├── 6. BAJA LOPDP   → ¿Pide baja? Responde y bloquea
  ├── 7. FREEZE       → ¿Está en periodo de baja? Bloquea
  ├── 8. TEMP EARLY   → Detecta temperamento (sin LLM)
  ├── 9. HACKEO       → ¿Intento de jailbreak? Bloquea (sin LLM)
  ├── 10. SALUDO      → ¿Saludo sin onboarding? Inicia onboarding
  ├── 11. ONBOARDING  → ¿Nombre faltante? Paso 1-2
  │     └── Si regex falla → LLM EXTRACT (1 call extra)
  │           Modelo: deepseek-chat (FAST)
  │           Log: [LLM-EXTRAE]
  │           Input: texto del cliente
  │           Output: nombre o "null"
  │
  ├── 12. CLASIFICADOR → FASE 1 (1 LLM call)
  │     Modelo: deepseek-chat (FAST)
  │     Log: [LLM-CLASIF]
  │     Input: ficha + historial + texto
  │     Output JSON:
  │     {
  │       "categoria": "informador|close_concreto|close_general|soporte|humano|saludo|ambiguo",
  │       "producto_detectado": "contacto_digital|business|catalogo|..." o null,
  │       "razon": "breve explicación",
  │       "fuera_dominio": boolean,
  │       "respuesta_directa": "texto" o null,
  │       "nombre_detectado": "string" o null,
  │       "rubro_detectado": "string" o null
  │     }
  │
  ├── 13. HUMANO      → ¿Categoría humano? Transferir
  ├── 14. BARRERA     → FASE 2 (sin LLM, determinista)
  │     └── Si pide precios sin acepto_proteccion → bloquea
  ├── 15. GUARD ILÓGICO → 3 strikes de ambiguo → silencio
  │
  └── 16. AGENTE EXPERTO → FASE 3 (1 LLM call)
        Modelo: deepseek-chat (FAST)
        Log: [LLM-EXPERT]
        Skill usada según categoría:
          informador → activaqr_informador.md + activaqr_informador_adn.md (ADN)
          close_*    → activaqr_closer.md (con <pensamiento>/<respuesta> XML)
          soporte    → activaqr_soporte.md + activaqr_rag_inputs.md
          humano     → Respuesta directa (sin LLM)
        Output: texto plano (respuesta al cliente)
        Si es closer: se limpian etiquetas XML via extraerRespuestaLimpia()
        Log final: [F3-EXPERTO]
```

---

## 📋 Versión Humana del Flujo

```
"Quiero información" 
  → [SIN LLM] ¿Es saludo? ¿Hackeo? ¿Reset?
  → [SIN LLM] ¿Tiene nombre? No → ONBOARDING paso 1
      → ¿Dice "Con César"? [REGEX] → Captura nombre
      → ¿Dice otra cosa? [LLM] deepseek-chat intenta extraer
  → [LLM #1] deepseek-chat clasifica: "informador"
  → [SIN LLM] ¿Aceptó políticas? No → BARRERA LEGAL
  → [SIN LLM] ¿Aceptó? Sí → sigue
  → [LLM #2] deepseek-chat con skill activaqr_informador.md + ADN
  → Responde al cliente
```

---

## 🔎 Cómo Leer los Logs

### En Render (pestaña Logs):

```
🧠 [LLM-CLASIF] 📞593... RAW response: {categoria, producto, razon}
    ↑                        ↑
  Prefijo              Respuesta cruda del modelo

🧠 [LLM-EXTRAE] 📞593... Modelo: deepseek-chat | Input: "..."
🧠 [LLM-EXTRAE] 📞593... Respuesta cruda del LLM: "César"

🧠 [LLM-EXPERT] 📞593... activaqr_informador.md (300 tok) 
                DATA: {"rawResponse":"...", "userInput":"..."}
```

### Filtrar en Render:

| Para ver | Filtro |
|---|---|
| Solo clasificaciones | `🧠 [LLM-CLASIF]` |
| Solo extracción de nombre | `🧠 [LLM-EXTRAE]` |
| Solo respuestas del experto | `🧠 [LLM-EXPERT]` |
| Solo respuestas enviadas | `🤖 Ale responde` |
| Tiempos de respuesta | `✅ Meta Response in` |

---

## 📁 Archivos Relacionados

| Archivo | Propósito |
|---|---|
| `lib/activaqr/brain.ts` | Cerebro de Ale (función pura) |
| `lib/donna/prompts/activaqr_clasificador.md` | Prompt del clasificador |
| `lib/donna/prompts/activaqr_informador.md` | Skill del Informador |
| `lib/donna/prompts/activaqr_informador_adn.md` | ADN de productos (28KB) |
| `lib/donna/prompts/activaqr_closer.md` | Skill del Closer (con XML) |
| `lib/donna/prompts/activaqr_soporte.md` | Skill de Soporte |
| `lib/donna/prompts/activaqr_rag_inputs.md` | Base de conocimiento técnico |
| `lib/donna/prompts/activaqr_proteccion_datos.md` | Barrera legal LOPDP |
| `scripts/message_worker.ts` | Worker que invoca brain.ts |
| `lib/ai/client.ts` | Cliente AI (DeepSeek) |
| `logs/activaqr/conversaciones.jsonl` | JSON Lines de auditoría |

---

## ⚙️ Configuración (.env)

| Variable | Valor | Propósito |
|---|---|---|
| `DEEPSEEK_API_KEY` | sk-... | API Key DeepSeek |
| `DEEPSEEK_MODEL` | deepseek-chat | Modelo FAST |
| `META_WA_PHONE_NUMBER_ID` | 639433412590000 | ID del número en Meta |
| `LINK_POLICITAS` | https://activaqr.com/privacidad | URL de políticas LOPDP |
| `ACTIVAQR_BOT_MODE` | active | active / paused / off |
