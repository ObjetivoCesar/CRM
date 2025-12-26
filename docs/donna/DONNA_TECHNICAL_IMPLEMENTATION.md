# 🎯 Diseño Técnico - Donna v1.2 (Hardened)

## 🏗️ Cambios Arquitectónicos Críticos (v1.2)
1.  **Human-in-the-Loop Obligatorio:** Se introduce un paso de UI intermedio entre la IA y la Base de Datos. Nada entra a `commitments` sin revisión.
2.  **Machine State Complex:** El estado de los compromisos maneja matices de tiempo (`grace_period`) y responsabilidad.

---

## 💾 Esquema de Datos v1.2

### 1. `agents` (Salud & Reputación)
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    current_risk_score INTEGER DEFAULT 0,
    reliability_stats JSONB DEFAULT '{"fulfilled": 0, "broken": 0, "pending": 0}'::jsonb,
    
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `commitments` (Ledger Oficial)
```sql
CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id),
    meeting_id UUID REFERENCES meetings(id), 
    
    -- El Qué
    title TEXT NOT NULL,
    description TEXT,
    
    -- Responsabilidad
    actor_role TEXT CHECK (actor_role IN ('client', 'internal_team', 'cesar')),
    assignee_user_id UUID REFERENCES auth.users(id), -- Si es interno (Abel/César)
    
    -- Tiempo
    due_date TIMESTAMP WITH TIME ZONE,
    grace_period_days INTEGER DEFAULT 0, -- Días de tolerancia antes de 'broken'
    
    -- Estado
    status TEXT CHECK (status IN ('draft', 'active', 'at_risk', 'fulfilled', 'broken')) DEFAULT 'draft',
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Servicios & Lógica

### 1. Extracción con Verificación (`CommitmentDraftService`)
El LLM no inserta en `commitments` con estado `active`.
Inserta con estado `draft`.
*   **Prompt:** Identificar promesas, asignar severidad inferida.
*   **Output:** Drafts ligados a la reunión.

### 2. UI de Validación (`ReviewModal`)
*   Fetch `commitments` where `meeting_id = X` AND `status = 'draft'`.
*   César edita, borra o aprueba.
*   Al aprobar -> `UPDATE status = 'active'`.

### 3. Motor de Riesgo y Notificaciones (`RiskEngine` & `NotificationService`)
Cron Job (Diario) + Triggers en Tiempo Real (n8n):
1.  Busca compromisos `active` donde `due_date < NOW()`.
2.  Si `NOW() < due_date + grace_period` -> Marcar `at_risk`.
3.  **Acción Proactiva:** Llamar a `NotificationService.sendPush()`.
    *   **Interno:** Enviar Webhook a n8n para WhatsApp de César/Abel.
    *   **Externo:** Si el compromiso es 'client' y `at_risk`, preparar mensaje de recordatorio amable.
4.  Si `NOW() > due_date + grace_period` -> Marcar `broken` y notificar urgencia.

---

## 🔌 Componentes UI Nuevos

1.  **`PostMeetingReviewModal.tsx`**:
    *   Lista de Drafts.
    *   Formulario rápido para editar Fecha/Responsable.
    *   Botón "Confirmar Acuerdos".

2.  **`ReliabilityBadge.tsx`**:
    *   Visualizador en el perfil del cliente.
    *   Muestra % de Cumplimiento (Team vs Client).
