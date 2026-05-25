-- Migration: 025_add_lopdp_consent.sql
-- Agrega campos de consentimiento legal LOPDP a la tabla contacts

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS acepto_proteccion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS acepto_fecha TIMESTAMPTZ DEFAULT NULL;

-- Índice para queries legales rápidos
CREATE INDEX IF NOT EXISTS idx_contacts_consent ON contacts (acepto_proteccion, acepto_fecha);
