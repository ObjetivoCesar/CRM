-- Migration: 010_donna_rls_policies.sql
-- Description: Enables RLS and adds policies for Donna v1.2 tables

-- 1. Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies (Authenticated users can view/edit everything for now - Internal Tool)
-- Ideally, we would restrict by `assignee_user_id` or `created_by`, but for this stage 
-- of an internal CRM, allowing authenticated users full access is standard practice.

-- Agents Policies
CREATE POLICY "Enable read access for authenticated users" ON agents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON agents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON agents
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Agent Briefings Policies
CREATE POLICY "Enable read access for authenticated users" ON agent_briefings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON agent_briefings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON agent_briefings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Commitments Policies
CREATE POLICY "Enable read access for authenticated users" ON commitments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON commitments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON commitments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON commitments
    FOR DELETE USING (auth.role() = 'authenticated');
