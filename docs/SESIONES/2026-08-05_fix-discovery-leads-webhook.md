# 🔧 Fix Webhook QR Scan — discovery_leads columnas faltantes

**Fecha:** 2026-08-05
**Síntoma reportado:** "En el flujo de escanear el código QR y enviar para que descarguen, sale error de Webhook DB Error."

---

## 🐛 Diagnóstico

El log de Vercel mostraba:
```
[error] ⚠️ Webhook DB Error: Failed query: select "id", "ruc", ..., "campaign_id",
"telefono_e164", "telefono_tipo", "es_target_real", "acquisition_source",
"acquisition_campaign_id", "acquisition_script_id", "last_interaction_at", ...
from "discovery_leads" where "discovery_leads"."telefono_principal" LIKE $1 limit $2
params: %959421695,1
```

**Causa raíz:** El schema de Drizzle (`lib/db/schema.ts`) declara **8 columnas acquisition** en `discovery_leads` que **NO existen en producción**. Drizzle hace `SELECT *` con todas las columnas del schema → PostgreSQL revienta con `42703 column does not exist`.

La migración `adquisicion_v1.sql` (2026-08-04) añadió estas columnas a `contacts` y `call_analyses` pero **se olvidó de `discovery_leads`**.

### Columnas faltantes en `discovery_leads` (producción)

| Columna | Tipo |
|---|---|
| `campaign_id` | UUID (FK → acquisition_campaigns) |
| `telefono_e164` | TEXT |
| `telefono_tipo` | TEXT (celular \| fijo \| invalido) |
| `es_target_real` | BOOLEAN DEFAULT TRUE |
| `acquisition_source` | TEXT |
| `acquisition_campaign_id` | UUID |
| `acquisition_script_id` | UUID |
| `last_interaction_at` | TIMESTAMPTZ |

---

## ✅ Fix aplicado

### 1. Nueva migración: `migrations/028_discovery_leads_acquisition_columns.sql`
- Agrega las 8 columnas faltantes con `ADD COLUMN IF NOT EXISTS` (idempotente)
- Crea 4 índices (`campaign_id`, `telefono_e164`, `acquisition_campaign_id`, `last_interaction_at`)
- 100% no-destructivo — no modifica columnas existentes

### 2. Robustez en `app/api/webhooks/whatsapp/route.ts`
- **`SELECT` reducido** a `{ id: discoveryLeads.id }` en lugar de todas las columnas
- **try/catch local** alrededor del lookup: si la tabla está desactualizada, NO rompe el flujo del webhook
- **Logging enriquecido** con la causa REAL de PostgreSQL (`pgCode`, `pgDetail`, `pgMessage`) en lugar de solo el query truncado
- **Catch general** también mejorado con la misma lógica

### 3. Por qué el SELECT reducido
Drizzle normalmente hace `SELECT *` con TODAS las columnas del schema. Como el webhook SOLO usa `discoveryLeadId = foundLead.id`, **no necesitamos las otras columnas** — esto reduce el blast radius de futuros cambios de schema.

---

## 🚀 Acción manual requerida

**Ejecutar en Supabase SQL Editor** (Dashboard > SQL Editor > New Query):

```sql
-- Pegar el contenido de:
-- migrations/028_discovery_leads_acquisition_columns.sql
```

Después de ejecutar, verificar:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'discovery_leads'
  AND column_name IN (
    'campaign_id','telefono_e164','telefono_tipo','es_target_real',
    'acquisition_source','acquisition_campaign_id',
    'acquisition_script_id','last_interaction_at'
  )
ORDER BY column_name;
```

Debe devolver 8 filas.

---

## 📊 Verificación post-deploy

Después de que Vercel despliegue + ejecutar la migración:

1. Enviar un WhatsApp con `contacto:slug-de-prueba` (vCard dinámico)
2. Verificar en logs que NO aparezca `⚠️ Webhook DB Error`
3. Verificar que llega el .vcf correctamente

### Antes del fix
```
[error] ⚠️ Webhook DB Error: Failed query: select ... from "discovery_leads" ...
```
Webhook devolvía 200 pero el lookup de discovery_leads fallaba silenciosamente.

### Después del fix
```
✅ Lookup de discovery_leads funciona
✅ Si falla, el flujo sigue (no rompe el webhook)
✅ Logs muestran el código de error PostgreSQL real (ej. 42703)
```

---

## 🎯 Lecciones aprendidas

1. **`SELECT *` es peligroso con Drizzle**: Si el schema tiene columnas que no están en la DB, TODO falla. Mejor seleccionar columnas explícitas.
2. **Verificar migraciones después de aplicar schema changes**: El módulo de adquisición (2026-08-04) añadió columnas a 2 tablas pero se olvidó la 3ª.
3. **Logging de errores debe incluir la causa**: `dbError.message` de Drizzle solo trae el query, no el `pgCode` real. Acceder a `dbError.cause.code` revela el `42703`.
4. **Defensa en profundidad**: El webhook debería ser resiliente a fallos de tablas secundarias. El lookup de `discovery_leads` es un fallback, no un requisito crítico.

---

## 📁 Archivos tocados

- ✏️ `migrations/028_discovery_leads_acquisition_columns.sql` (NUEVO)
- ✏️ `app/api/webhooks/whatsapp/route.ts` (líneas 162-191, 884-892)
- ✏️ `docs/SESIONES/2026-08-05_fix-discovery-leads-webhook.md` (NUEVO)
