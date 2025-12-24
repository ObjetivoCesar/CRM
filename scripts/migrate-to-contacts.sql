-- ============================================
-- MIGRACIÓN A TABLA CONTACTS UNIFICADA
-- CRM Objetivo V2 - 21 Diciembre 2024
-- ============================================
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

BEGIN;

-- 1. Crear tabla contacts con TODOS los campos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'prospect',
  
  -- Campos básicos
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  province TEXT,
  business_type TEXT,
  
  -- Campos de Lead/Client (todos opcionales)
  connection_type TEXT,
  business_activity TEXT,
  interested_product TEXT,
  verbal_agreements TEXT,
  personality_type TEXT,
  communication_style TEXT,
  key_phrases TEXT,
  
  -- FODA
  strengths TEXT,
  weaknesses TEXT,
  opportunities TEXT,
  threats TEXT,
  
  -- Business Data
  relationship_type TEXT,
  quantified_problem TEXT,
  conservative_goal TEXT,
  years_in_business INTEGER,
  number_of_employees INTEGER,
  number_of_branches INTEGER,
  current_clients_per_month INTEGER,
  average_ticket INTEGER,
  known_competition TEXT,
  high_season TEXT,
  critical_dates TEXT,
  facebook_followers INTEGER,
  other_achievements TEXT,
  specific_recognitions TEXT,
  
  -- Files
  files TEXT DEFAULT '[]',
  audio_transcriptions TEXT DEFAULT '[]',
  quotation TEXT,
  
  -- Status (para Leads)
  status TEXT DEFAULT 'sin_contacto',
  phase INTEGER DEFAULT 1,
  
  -- Client-specific
  pains TEXT,
  goals TEXT,
  objections TEXT,
  contract_value DOUBLE PRECISION,
  contract_start_date TIMESTAMP,
  
  -- Prospect-specific
  outreach_status TEXT,
  whatsapp_status TEXT,
  whatsapp_sent_at TIMESTAMP,
  email_sequence_step INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMP,
  next_follow_up TIMESTAMP,
  is_newsletter_subscriber BOOLEAN DEFAULT false,
  
  -- Lifecycle tracking
  converted_to_lead_at TIMESTAMP,
  converted_to_client_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  source TEXT DEFAULT 'recorridos',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Migrar prospects
INSERT INTO contacts (
  id, entity_type, business_name, contact_name, phone, email, city, province,
  business_type, outreach_status, whatsapp_status, whatsapp_sent_at,
  email_sequence_step, last_email_sent_at, next_follow_up, is_newsletter_subscriber,
  notes, source, created_at, updated_at
)
SELECT 
  id, 'prospect', business_name, contact_name, phone, email, city, province,
  business_type, outreach_status, whatsapp_status, whatsapp_sent_at,
  email_sequence_step, last_email_sent_at, next_follow_up, is_newsletter_subscriber,
  notes, source, created_at, updated_at
FROM prospects
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar leads (MANTENER ID ORIGINAL)
INSERT INTO contacts (
  id, entity_type, business_name, contact_name, phone, email, city, address,
  business_type, connection_type, business_activity, interested_product,
  verbal_agreements, personality_type, communication_style, key_phrases,
  strengths, weaknesses, opportunities, threats, relationship_type,
  quantified_problem, conservative_goal, years_in_business, number_of_employees,
  number_of_branches, current_clients_per_month, average_ticket, known_competition,
  high_season, critical_dates, facebook_followers, other_achievements,
  specific_recognitions, files, audio_transcriptions, quotation, status, phase,
  notes, source, converted_to_lead_at, created_at, updated_at
)
SELECT 
  id, 'lead', business_name, contact_name, phone, email, city, address,
  business_type, connection_type, business_activity, interested_product,
  verbal_agreements, personality_type, communication_style, key_phrases,
  strengths, weaknesses, opportunities, threats, relationship_type,
  quantified_problem, conservative_goal, years_in_business, number_of_employees,
  number_of_branches, current_clients_per_month, average_ticket, known_competition,
  high_season, critical_dates, facebook_followers, other_achievements,
  specific_recognitions, files, audio_transcriptions, quotation, status, phase,
  notes, source, created_at, created_at, updated_at
FROM leads
ON CONFLICT (id) DO UPDATE SET 
  entity_type = 'lead',
  converted_to_lead_at = EXCLUDED.created_at;

-- 4. Migrar clients (USAR lead_id COMO ID PRINCIPAL)
INSERT INTO contacts (
  id, entity_type, business_name, contact_name, phone, email, city, address,
  business_type, business_activity, interested_product, verbal_agreements,
  personality_type, communication_style, key_phrases, pains, goals, objections,
  strengths, weaknesses, opportunities, threats, relationship_type,
  quantified_problem, conservative_goal, years_in_business, number_of_employees,
  number_of_branches, current_clients_per_month, average_ticket, known_competition,
  high_season, critical_dates, facebook_followers, other_achievements,
  specific_recognitions, contract_value, contract_start_date, quotation,
  notes, converted_to_client_at, created_at, updated_at
)
SELECT 
  COALESCE(lead_id, id), 'client', business_name, contact_name, phone, email, city, address,
  business_type, business_activity, interested_product, verbal_agreements,
  personality_type, communication_style, key_phrases, pains, goals, objections,
  strengths, weaknesses, opportunities, threats, relationship_type,
  quantified_problem, conservative_goal, years_in_business, number_of_employees,
  number_of_branches, current_clients_per_month, average_ticket, known_competition,
  high_season, critical_dates, facebook_followers, other_achievements,
  specific_recognitions, contract_value, contract_start_date, quotation,
  notes, created_at, created_at, updated_at
FROM clients
ON CONFLICT (id) DO UPDATE SET 
  entity_type = 'client',
  converted_to_client_at = EXCLUDED.created_at,
  pains = EXCLUDED.pains,
  goals = EXCLUDED.goals,
  objections = EXCLUDED.objections,
  contract_value = EXCLUDED.contract_value,
  contract_start_date = EXCLUDED.contract_start_date;

-- 5. Actualizar interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Mapear desde related_lead_id
UPDATE interactions 
SET contact_id = related_lead_id 
WHERE related_lead_id IS NOT NULL AND contact_id IS NULL;

-- Mapear desde related_client_id (usando lead_id del client)
UPDATE interactions i
SET contact_id = (
  SELECT COALESCE(c.lead_id, c.id) 
  FROM clients c 
  WHERE c.id = i.related_client_id
)
WHERE related_client_id IS NOT NULL AND contact_id IS NULL;

-- 6. Hacer contact_id obligatorio (solo si no hay NULLs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM interactions WHERE contact_id IS NULL) THEN
    ALTER TABLE interactions ALTER COLUMN contact_id SET NOT NULL;
    ALTER TABLE interactions ADD CONSTRAINT fk_interactions_contact 
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Actualizar quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS contact_id UUID;
UPDATE quotations SET contact_id = lead_id WHERE lead_id IS NOT NULL AND contact_id IS NULL;

-- 8. Actualizar tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_id UUID;
UPDATE tasks SET contact_id = related_lead_id WHERE related_lead_id IS NOT NULL AND contact_id IS NULL;
UPDATE tasks t SET contact_id = (
  SELECT COALESCE(c.lead_id, c.id) 
  FROM clients c 
  WHERE c.id = t.related_client_id
) WHERE related_client_id IS NOT NULL AND contact_id IS NULL;

-- 9. Actualizar events
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_id UUID;
UPDATE events SET contact_id = related_lead_id WHERE related_lead_id IS NOT NULL AND contact_id IS NULL;
UPDATE events e SET contact_id = (
  SELECT COALESCE(c.lead_id, c.id) 
  FROM clients c 
  WHERE c.id = e.related_client_id
) WHERE related_client_id IS NOT NULL AND contact_id IS NULL;

-- 10. Actualizar transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS contact_id UUID;
UPDATE transactions SET contact_id = lead_id WHERE lead_id IS NOT NULL AND contact_id IS NULL;
UPDATE transactions t SET contact_id = (
  SELECT COALESCE(c.lead_id, c.id) 
  FROM clients c 
  WHERE c.id = t.client_id
) WHERE client_id IS NOT NULL AND contact_id IS NULL;

-- 11. Actualizar contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contact_id UUID;
UPDATE contracts SET contact_id = lead_id WHERE lead_id IS NOT NULL AND contact_id IS NULL;
UPDATE contracts ct SET contact_id = (
  SELECT COALESCE(c.lead_id, c.id) 
  FROM clients c 
  WHERE c.id = ct.client_id
) WHERE client_id IS NOT NULL AND contact_id IS NULL;

-- 12. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_contacts_entity_type ON contacts(entity_type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status) WHERE entity_type = 'lead';
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts(business_name, phone, email);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_performed_at ON interactions(performed_at DESC);

-- 13. Verificación
DO $$
DECLARE
  prospect_count INTEGER;
  lead_count INTEGER;
  client_count INTEGER;
  orphan_interactions INTEGER;
BEGIN
  SELECT COUNT(*) INTO prospect_count FROM contacts WHERE entity_type = 'prospect';
  SELECT COUNT(*) INTO lead_count FROM contacts WHERE entity_type = 'lead';
  SELECT COUNT(*) INTO client_count FROM contacts WHERE entity_type = 'client';
  SELECT COUNT(*) INTO orphan_interactions FROM interactions WHERE contact_id IS NULL;
  
  RAISE NOTICE 'Prospects migrados: %', prospect_count;
  RAISE NOTICE 'Leads migrados: %', lead_count;
  RAISE NOTICE 'Clients migrados: %', client_count;
  RAISE NOTICE 'Interacciones huérfanas: %', orphan_interactions;
  
  IF orphan_interactions > 0 THEN
    RAISE WARNING 'ATENCIÓN: Hay % interacciones sin contact_id', orphan_interactions;
  END IF;
END $$;

COMMIT;

-- Mensaje final
SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE' AS status;
SELECT entity_type, COUNT(*) as count FROM contacts GROUP BY entity_type ORDER BY entity_type;
