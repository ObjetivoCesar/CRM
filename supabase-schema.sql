-- =====================================================
-- CRM OBJETIVO V2 - SUPABASE SCHEMA
-- =====================================================
-- Execute this script in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste and Run
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROSPECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic contact info
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    city TEXT,
    province TEXT,
    business_type TEXT,
    
    -- Outreach tracking
    outreach_status TEXT DEFAULT 'new' CHECK (outreach_status IN ('new', 'contacted', 'responded', 'interested', 'not_interested', 'converted_to_lead')),
    
    -- WhatsApp tracking
    whatsapp_status TEXT DEFAULT 'pending' CHECK (whatsapp_status IN ('pending', 'sent', 'failed')),
    whatsapp_sent_at TIMESTAMP,
    
    -- Email tracking
    email_sequence_step INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMP,
    
    -- Follow-up
    next_follow_up TIMESTAMP,
    
    -- Newsletter integration
    is_newsletter_subscriber BOOLEAN DEFAULT false,
    
    -- Notes and metadata
    notes TEXT,
    source TEXT DEFAULT 'import',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. LEADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic contact info
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    city TEXT,
    address TEXT,
    business_type TEXT,
    
    -- Recorridos / ACC Module Fields
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
    
    -- Advanced Business Data
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
    
    -- Files & Transcriptions (JSON)
    files TEXT DEFAULT '[]',
    audio_transcriptions TEXT DEFAULT '[]',
    
    -- Quotation
    quotation TEXT,
    
    -- Lead status
    status TEXT DEFAULT 'sin_contacto' CHECK (status IN ('sin_contacto', 'primer_contacto', 'segundo_contacto', 'tercer_contacto', 'cotizado', 'convertido')),
    phase INTEGER DEFAULT 1,
    
    -- Metadata
    notes TEXT,
    source TEXT DEFAULT 'recorridos',
    
    -- Outreach fields
    outreach_status TEXT DEFAULT 'new' CHECK (outreach_status IN ('new', 'contacted', 'responded', 'interested', 'not_interested', 'converted_to_lead')),
    whatsapp_status TEXT DEFAULT 'pending' CHECK (whatsapp_status IN ('pending', 'sent', 'failed')),
    email_sequence_step INTEGER DEFAULT 0,
    is_newsletter_subscriber BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 3. CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    city TEXT,
    business_type TEXT,
    
    contract_value DOUBLE PRECISION,
    contract_start_date TIMESTAMP,
    quotation TEXT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 4. QUOTATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
    
    introduction TEXT,
    value_proposition TEXT,
    roi_closing TEXT,
    
    mental_trigger TEXT,
    selected_services TEXT DEFAULT '[]',
    total_amount DOUBLE PRECISION,
    
    created_by TEXT DEFAULT 'Michael',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 5. CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    target_count INTEGER DEFAULT 50,
    sent_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 6. TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    
    assigned_to TEXT,
    related_client_id UUID REFERENCES clients(id),
    related_lead_id UUID REFERENCES leads(id),
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 7. EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location TEXT,
    meeting_url TEXT,
    
    related_client_id UUID REFERENCES clients(id),
    related_lead_id UUID REFERENCES leads(id),
    
    created_by TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 8. INTERACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'whatsapp', 'note', 'other')),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    
    content TEXT,
    outcome TEXT,
    duration INTEGER,
    
    related_client_id UUID REFERENCES clients(id),
    related_lead_id UUID REFERENCES leads(id),
    
    performed_by TEXT,
    performed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 9. TRANSACTIONS TABLE (Financial Module)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    
    -- Dates
    date TIMESTAMP NOT NULL,
    due_date TIMESTAMP,
    
    -- Status & Payment
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    payment_method TEXT,
    
    -- Relations
    client_id UUID REFERENCES clients(id),
    lead_id UUID REFERENCES leads(id),
    
    -- Metadata & Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 10. FINANCIAL_GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    revenue_target DOUBLE PRECISION NOT NULL,
    expense_limit DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 11. PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id INTEGER,
    name TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    description TEXT,
    benefits TEXT,
    
    category TEXT,
    sub_category TEXT,
    tags TEXT,
    
    payment_form TEXT,
    video_url TEXT,
    services_included TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 12. CONTRACTS TABLE (NEW MODULE)
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    lead_id UUID REFERENCES leads(id),
    
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'void')),
    
    -- Contract content stored as structured data
    contract_data TEXT,
    
    -- PDF generation
    pdf_url TEXT,
    
    -- Signature tracking
    signed_at TIMESTAMP,
    signed_by TEXT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_prospects_outreach_status ON prospects(outreach_status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON prospects(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_interactions_related_client_id ON interactions(related_client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_related_lead_id ON interactions(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ All tables created successfully!';
    RAISE NOTICE 'Total tables: 12';
    RAISE NOTICE 'You can now run your Next.js application.';
END $$;
