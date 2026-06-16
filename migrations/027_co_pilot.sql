-- ============================================
-- Migration 027: Donna Co-Pilot Tables
-- Creates message_suggestions and ai_training_logs
-- ============================================

-- Table: message_suggestions
-- Stores AI-generated draft responses pending human review
CREATE TABLE IF NOT EXISTS message_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT NOT NULL,
    suggested_response TEXT NOT NULL,
    context_snapshot JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'edited', 'discarded', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS message_suggestions_chat_id_idx ON message_suggestions(chat_id);
CREATE INDEX IF NOT EXISTS message_suggestions_status_idx ON message_suggestions(status);

-- Table: ai_training_logs
-- Stores the diff between AI suggestion and what the human actually sent
CREATE TABLE IF NOT EXISTS ai_training_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT NOT NULL,
    suggestion_id UUID REFERENCES message_suggestions(id) ON DELETE SET NULL,
    original_ai_response TEXT NOT NULL,
    human_corrected_response TEXT,
    was_approved BOOLEAN NOT NULL DEFAULT FALSE,
    correction_reason TEXT CHECK (correction_reason IN ('context', 'tone', 'wrong_info')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_training_logs_chat_id_idx ON ai_training_logs(chat_id);

-- Allow co-pilot as a valid bot_mode (no constraint enforcement needed since it's text type,
-- but keeping this comment as documentation of the new valid values:
-- contacts.bot_mode: 'active' | 'paused' | 'disabled' | 'co-pilot'
-- discovery_leads.bot_mode: 'active' | 'paused' | 'disabled' | 'co-pilot'
