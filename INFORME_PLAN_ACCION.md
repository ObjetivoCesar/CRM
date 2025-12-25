# 📋 Plan de Acción Inmediato - Informe Técnico

## 🎯 Archivos Críticos

### 1. SCHEMA
#### Base de Datos (Drizzle ORM - Fuente de Verdad Actual)
```typescript
// Ubicación: lib/db/schema.ts
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type', {
    enum: ['prospect', 'lead', 'client']
  }).notNull().default('prospect'),
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  // ... campos básicos
  status: text('status').default('sin_contacto'),
  phase: integer('phase').default(1),
  discoveryLeadId: uuid('discovery_lead_id').references(() => discoveryLeads.id),
  convertedToLeadAt: timestamp('converted_to_lead_at'),
  convertedToClientAt: timestamp('converted_to_client_at'),
  // ... campos específicos de cliente/lead
});
```

#### Base de Datos (SQL - Supabase)
```sql
-- Ubicación: supabase-schema.sql
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    status TEXT DEFAULT 'sin_contacto' CHECK (status IN ('sin_contacto', 'primer_contacto', 'segundo_contacto', 'tercer_contacto', 'cotizado', 'convertido')),
    -- ...
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    business_name TEXT NOT NULL,
    -- ...
);
```

### 2. PDR / MASTER PLAN Actualizado
**Archivo de Referencia Principal:** `docs/MASTER_PLAN_CRM.md` (Radiografía Maestra V2)

**Visión Actual:** Transformar el CRM en una **Máquina de Prospección y Ventas Semiautomática**.
**Pilares Tecnológicos:**
- **Arquitectura "Bazooka":** Escalabilidad masiva con Lazy Loading y Búsqueda On-Demand.
- **IA Estratégica:** Cortex 360 (Informes de inteligencia) y Tablero FODA Visual.
- **Automatización:** Preparando integración con **n8n** para workflows de salida.

### 3. CÓDIGO DE CONVERSIÓN
#### Conversión: Discovery -> Lead
```typescript
// Ubicación: lib/discovery-to-lead.ts
export async function createLeadFromDiscovery(discoveryLead: any) {
    const leadData = {
        entityType: 'lead' as const,
        discoveryLeadId: discoveryLead.id,
        businessName: discoveryLead.nombreComercial,
        contactName: discoveryLead.personaContacto || 'Por confirmar',
        status: 'sin_contacto',
        convertedToLeadAt: new Date(),
    };
    const [newContact] = await db.insert(contacts).values(leadData).returning();
    // Unificación de Memoria (Interacciones)
    await db.update(interactions).set({ contactId: newContact.id }).where(eq(interactions.discoveryLeadId, discoveryLead.id));
    return newContact;
}
```

#### Conversión: Lead -> Cliente (Mission Control)
```typescript
// Ubicación: app/api/leads/[id]/convert/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
    // 1. Actualiza entity_type a 'client'
    const { data: updatedContact } = await supabase.from('contacts').update({
        entity_type: 'client',
        converted_to_client_at: new Date().toISOString()
    }).eq('id', params.id);

    // 2. Integración Financiera Automática
    if (contractValue > 0) {
        // Crea transacciones PAID (Anticipo) y PENDING (Saldo) de forma automática
    }
}
```

### 4. ESTRUCTURA DE CARPETAS
- `/app`: Rutas de API y Páginas (App Router). Crucial: `/api/finance`, `/api/leads/[id]/convert`.
- `/lib`: Lógica de servidor, Schemas Drizzle (`/db/schema.ts`), Integración AI (`/openai`), Tipos (`/types.ts`).
- `/components`: UI base y componentes de negocio (`/finance`, `/leads`).
- `/hooks`: Manejo de estado en el cliente (SWR/React Query).

### 5. TIPOS Y DICCIONARIO DE ESTADOS
#### Diccionario de Estados (Idioma del CRM):
- **Nuevo:** Importado, sin contacto.
- **En Cola:** Programado para contacto hoy.
- **Contactado (WhatsApp/Email):** Primer mensaje enviado.
- **Respondió:** Interacción humana detectada (Oportunidad).
- **Interesado/Llamada:** Cita agendada.
- **Cliente:** Pago verificado.

#### Interfaces TypeScript
```typescript
// Ubicación: lib/types.ts
export interface Lead {
    id: string;
    businessName: string;
    status: 'sin_contacto' | 'primer_contacto' | 'segundo_contacto' | 'tercer_contacto' | 'cotizado' | 'convertido';
    phase: number;
}
```

---

## 🔧 Respuestas Rápidas

**1. Diferencia técnica entre Contact, Lead y Client:**
Viven en la misma tabla `contacts`. Se diferencian por el campo `entity_type` (`prospect`, `lead`, `client`). Un `lead` tiene datos de inteligencia comercial (FODA, dolores), mientras que un `client` suma datos financieros y de contrato.

**2. ¿Tablas separadas o una sola?**
Existe una tabla unificada `contacts` para el ciclo de vida, pero se mantienen tablas legacy/específicas como `prospects`, `leads` y `clients` para retrocompatibilidad y módulos específicos.

**3. ¿Qué sucede hoy al "Convertir a Lead"?**
Se crea un registro en `contacts` (type: lead), se hereda la identidad del `discoveryLeadId` y se traspasa el historial de interacciones ("unificación de memoria").

**4. ¿Qué sucede hoy al "Convertir a Cliente"?**
Se actualiza el `entity_type` a `client` y se activan automatizaciones financieras que crean cobros automáticos en el módulo de Finanzas.

**5. ¿Dónde vive la lógica de "autopilot" actual?**
Principalmente en `lib/ai` (para investigación) y en el módulo de `whatsapp` dentro de `/app` para automatización de mensajes.
