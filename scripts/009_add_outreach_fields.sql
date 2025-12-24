-- Add outreach tracking fields to the leads table

-- Enum for outreach status
CREATE TYPE outreach_status_type AS ENUM ('new', 'contacted', 'responded', 'interested', 'not_interested', 'client', 'do_not_contact');

-- Enum for WhatsApp status
CREATE TYPE whatsapp_status_type AS ENUM ('pending', 'sent', 'failed');

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS outreach_status outreach_status_type DEFAULT 'new',
ADD COLUMN IF NOT EXISTS whatsapp_status whatsapp_status_type DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sequence_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_newsletter_subscriber BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for faster querying of daily batches
CREATE INDEX IF NOT EXISTS idx_leads_outreach_status ON leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up);
