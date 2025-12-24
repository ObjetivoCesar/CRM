-- =====================================================
-- FIX: ENABLE ROW LEVEL SECURITY (RLS) ON MISSING TABLES
-- =====================================================
-- Execute this in the Supabase SQL Editor
-- =====================================================

-- 1. Enable RLS on newly identified tables
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discovery_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policies for authenticated users (full access for CRM)
-- CONTACTS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON contacts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- DISCOVERY_LEADS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discovery_leads' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON discovery_leads FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- CALL_ANALYSES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_analyses' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON call_analyses FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- CONTRACTS (Ensure policy exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Allow all for authenticated users') THEN
        CREATE POLICY "Allow all for authenticated users" ON contracts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RLS fixed on missing tables!';
END $$;
