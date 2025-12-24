-- Manual migration to update lead status values
-- This script updates existing status values to new Kanban stages

-- Update existing 'nuevo' to 'sin_contacto'
UPDATE leads SET status = 'sin_contacto' WHERE status = 'nuevo';

-- Update existing 'contactado' to 'primer_contacto'
UPDATE leads SET status = 'primer_contacto' WHERE status = 'contactado';

-- Keep 'cotizado' and 'convertido' as-is (they're already in the new enum)

-- Verify the changes
SELECT status, COUNT(*) as count FROM leads GROUP BY status;
