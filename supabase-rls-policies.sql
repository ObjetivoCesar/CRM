-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =====================================================
-- This script enables RLS and creates permissive policies
-- for internal CRM use (all authenticated users have full access)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all operations for authenticated users)
-- PROSPECTS
CREATE POLICY "Allow all for authenticated users" ON prospects FOR ALL USING (true) WITH CHECK (true);

-- LEADS
CREATE POLICY "Allow all for authenticated users" ON leads FOR ALL USING (true) WITH CHECK (true);

-- CLIENTS
CREATE POLICY "Allow all for authenticated users" ON clients FOR ALL USING (true) WITH CHECK (true);

-- QUOTATIONS
CREATE POLICY "Allow all for authenticated users" ON quotations FOR ALL USING (true) WITH CHECK (true);

-- CAMPAIGNS
CREATE POLICY "Allow all for authenticated users" ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- TASKS
CREATE POLICY "Allow all for authenticated users" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- EVENTS
CREATE POLICY "Allow all for authenticated users" ON events FOR ALL USING (true) WITH CHECK (true);

-- INTERACTIONS
CREATE POLICY "Allow all for authenticated users" ON interactions FOR ALL USING (true) WITH CHECK (true);

-- TRANSACTIONS
CREATE POLICY "Allow all for authenticated users" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- FINANCIAL_GOALS
CREATE POLICY "Allow all for authenticated users" ON financial_goals FOR ALL USING (true) WITH CHECK (true);

-- PRODUCTS
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL USING (true) WITH CHECK (true);

-- CONTRACTS
CREATE POLICY "Allow all for authenticated users" ON contracts FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled on all tables with permissive policies!';
    RAISE NOTICE 'All authenticated users have full access to all tables.';
END $$;
