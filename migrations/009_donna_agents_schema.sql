-- Migration: 009_donna_agents_schema.sql
-- Description: Creates tables for Donna v1.2 (Hardened Reliability)

-- 1. Agents Table (Profile & Health)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Relationship Health
    current_risk_score INTEGER DEFAULT 0, -- 0-100 (0=Healthy, 100=Critical)
    reliability_stats JSONB DEFAULT '{"fulfilled": 0, "broken": 0, "pending": 0}'::jsonb,
    
    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,
    special_instructions TEXT, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one agent per contact
    UNIQUE(contact_id)
);

-- 2. Agent Briefings (Pre-Meeting Strategy)
CREATE TABLE IF NOT EXISTS agent_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Linked to events table (meetings)
    
    -- Content
    summary TEXT,
    strategy TEXT,
    talking_points JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Commitments (The Ledger of Promises)
CREATE TABLE IF NOT EXISTS commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES events(id) ON DELETE SET NULL, 
    
    -- What
    title TEXT NOT NULL,
    description TEXT,
    
    -- Responsibility
    actor_role TEXT CHECK (actor_role IN ('client', 'internal_team', 'cesar')),
    assignee_user_id TEXT, -- User ID (string/uuid from auth.users) or Name if external
    assignee_name TEXT,    -- Readable name
    
    -- Timing
    due_date TIMESTAMP WITH TIME ZONE,
    grace_period_days INTEGER DEFAULT 0,
    
    -- State Machine
    status TEXT CHECK (status IN ('draft', 'active', 'at_risk', 'fulfilled', 'broken')) DEFAULT 'draft',
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agents_contact_id ON agents(contact_id);
CREATE INDEX idx_commitments_agent_id ON commitments(agent_id);
CREATE INDEX idx_commitments_status ON commitments(status);
CREATE INDEX idx_commitments_due_date ON commitments(due_date);
