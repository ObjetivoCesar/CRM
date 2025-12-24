-- Add Progressive Profiling columns to LEADS table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS pains TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT,
ADD COLUMN IF NOT EXISTS objections TEXT;

-- Add Progressive Profiling columns to CLIENTS table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS pains TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT,
ADD COLUMN IF NOT EXISTS objections TEXT;

-- Update comments/descriptions if supported (optional but good practice)
COMMENT ON COLUMN leads.pains IS 'Dolores o problemas cuantificados del prospecto';
COMMENT ON COLUMN leads.goals IS 'Metas u objetivos que el prospecto quiere lograr';
COMMENT ON COLUMN leads.objections IS 'Historial de objeciones previas o negativas';
