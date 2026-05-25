-- Migration: 026_lopdp_consentimientos.sql
-- Tabla de auditoría para consentimiento LOPDP (webhook de activaqr.com/privacidad)

CREATE TABLE IF NOT EXISTS lopdp_consentimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id TEXT NOT NULL,
  numero TEXT NOT NULL,
  nombre TEXT,
  email TEXT,
  acepta_comercial BOOLEAN DEFAULT true,
  ip TEXT,
  user_agent TEXT,
  version TEXT,
  url_origen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lopdp_consentimientos_numero ON lopdp_consentimientos (numero);
CREATE INDEX IF NOT EXISTS idx_lopdp_consentimientos_created ON lopdp_consentimientos (created_at DESC);
