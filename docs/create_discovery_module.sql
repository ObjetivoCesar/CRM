-- Create Discovery Leads table
CREATE TABLE discovery_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc TEXT,
  business_name TEXT NOT NULL,
  business_type TEXT,
  representative TEXT,
  city TEXT,
  phone1 TEXT,
  phone2 TEXT,
  email TEXT,
  address TEXT,
  research_data TEXT, -- Stores Gemini's findings
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'investigated', 'no_answer', 'not_interested', 'sent_info', 'converted')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Call Analyses table for the Trainer module
CREATE TABLE call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  discovery_lead_id UUID REFERENCES discovery_leads(id),
  audio_url TEXT,
  transcription JSONB,
  metrics JSONB,
  feedback JSONB,
  next_focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE discovery_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for now (matching existing project style if any)
CREATE POLICY "Enable all for all" ON discovery_leads FOR ALL USING (true);
CREATE POLICY "Enable all for all" ON call_analyses FOR ALL USING (true);
