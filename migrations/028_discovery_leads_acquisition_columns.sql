-- ============================================================
-- MIGRACIÓN 028: Columnas acquisition en discovery_leads
-- Fecha: 2026-08-05
-- Causa: Webhook fallaba con "Failed query: select ... from
--        discovery_leads" porque el schema de Drizzle declaraba
--        8 columnas que NO existían en producción.
-- ERROR: column "campaign_id" / "telefono_e164" / etc. does not exist
-- ============================================================

-- ─── 1. Columna campaign_id (FK a acquisition_campaigns) ───
ALTER TABLE discovery_leads
  ADD COLUMN IF NOT EXISTS campaign_id UUID
  REFERENCES acquisition_campaigns(id) ON DELETE SET NULL;

-- ─── 2. Columnas de teléfono normalizado ───
ALTER TABLE discovery_leads
  ADD COLUMN IF NOT EXISTS telefono_e164 TEXT,
  ADD COLUMN IF NOT EXISTS telefono_tipo TEXT
    CHECK (telefono_tipo IN ('celular','fijo','invalido'));

-- ─── 3. Flag de target real (filtrado de calidad) ───
ALTER TABLE discovery_leads
  ADD COLUMN IF NOT EXISTS es_target_real BOOLEAN DEFAULT TRUE;

-- ─── 4. Atribución de adquisición (sin FK para rapidez) ───
ALTER TABLE discovery_leads
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_campaign_id UUID,
  ADD COLUMN IF NOT EXISTS acquisition_script_id UUID;

-- ─── 5. Última interacción (con timezone) ───
ALTER TABLE discovery_leads
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;

-- ─── 6. Índices para queries de campañas ───
CREATE INDEX IF NOT EXISTS idx_discovery_leads_campaign_id
  ON discovery_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_discovery_leads_tel_e164
  ON discovery_leads(telefono_e164);
CREATE INDEX IF NOT EXISTS idx_discovery_leads_acquisition_campaign
  ON discovery_leads(acquisition_campaign_id);
CREATE INDEX IF NOT EXISTS idx_discovery_leads_last_interaction
  ON discovery_leads(last_interaction_at DESC);

-- ─── VERIFICACIÓN (ejecutar después para confirmar) ───
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'discovery_leads'
--   AND column_name IN (
--     'campaign_id','telefono_e164','telefono_tipo','es_target_real',
--     'acquisition_source','acquisition_campaign_id',
--     'acquisition_script_id','last_interaction_at'
--   )
-- ORDER BY column_name;
