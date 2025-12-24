# ✅ INSPECCIÓN FASE 3 - PARCIAL

## LO QUE SE HA COMPLETADO

### 1. Schema.ts ✅
- ✅ Agregada tabla `contacts` unificada con todos los campos
- ✅ Actualizada tabla `interactions` para usar `contactId` en lugar de `relatedLeadId`/`relatedClientId`
- ⚠️ Tablas antiguas (`leads`, `clients`, `prospects`) aún presentes (por seguridad)

### 2. API Crítica Actualizada ✅
- ✅ `/api/leads/[id]/convert/route.ts` - Ahora solo actualiza `entity_type` a 'client' (de 90 líneas a 50)

## LO QUE FALTA POR HACER

### APIs Críticas Restantes (4)
1. `/api/leads/route.ts` - GET y POST (cambiar `from('leads')` a `from('contacts').eq('entity_type', 'lead')`)
2. `/api/clients/route.ts` - GET y POST (cambiar `from('clients')` a `from('contacts').eq('entity_type', 'client')`)
3. `/api/dashboard/stats/route.ts` - Actualizar counts
4. `/api/coach/prepare/route.ts` - Actualizar query de interactions

### Resto de APIs (14 archivos)
- `/api/leads/[id]/route.ts`
- `/api/clients/[id]/route.ts`
- `/api/quotations/generate-full-quotation/route.ts`
- `/api/ai/reports/cortex-360/route.ts`
- `/api/clients/search/route.ts`
- `/api/leads/count-new/route.ts`
- `lib/ai/context-fetcher.ts`
- Y 7 más...

### Componentes UI (15 archivos)
- `app/leads/page.tsx`
- `app/clients/page.tsx`
- `app/clients/[id]/page.tsx`
- `app/trainer/page.tsx`
- Y 11 más...

## DECISIÓN REQUERIDA

**Opción A (Recomendada):** 
Continuar ahora con las 4 APIs críticas restantes (30 min), luego hacer inspección completa.

**Opción B:**
Pausar aquí, probar lo que tenemos, y continuar después.

**Mi recomendación:** Opción A. Ya hicimos el cambio más crítico (convert), los demás son más simples.
