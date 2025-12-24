-- Add columna1 and columna2 to discovery_leads table
-- columna1 = Contact Status
-- columna2 = Action to take

ALTER TABLE discovery_leads 
ADD COLUMN IF NOT EXISTS columna1 TEXT DEFAULT 'no_contactado' 
CHECK (columna1 IN ('no_contactado', 'no_contesto', 'contesto_interesado', 'contesto_no_interesado', 'buzon_voz', 'numero_invalido'));

ALTER TABLE discovery_leads 
ADD COLUMN IF NOT EXISTS columna2 TEXT DEFAULT 'pendiente' 
CHECK (columna2 IN ('pendiente', 'convertir_a_lead', 'descartar', 'seguimiento_7_dias', 'seguimiento_30_dias'));

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_discovery_columna1 ON discovery_leads(columna1);
CREATE INDEX IF NOT EXISTS idx_discovery_columna2 ON discovery_leads(columna2);
