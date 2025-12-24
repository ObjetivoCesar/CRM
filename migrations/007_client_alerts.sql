-- =====================================================
-- INTELLIGENT ALERTS SYSTEM - Database Migration
-- =====================================================
-- Purpose: Store AI-detected business signals (risks, opportunities, blockers)
-- from interaction notes for proactive client management

CREATE TABLE IF NOT EXISTS client_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  
  -- Alert Classification
  alert_type TEXT NOT NULL CHECK (alert_type IN ('risk', 'opportunity', 'blocker', 'info')),
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  raw_note TEXT,
  
  -- Lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  
  -- AI Metadata
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  extracted_entities JSONB
);

-- Indexes for performance
CREATE INDEX idx_alerts_contact ON client_alerts(contact_id);
CREATE INDEX idx_alerts_status ON client_alerts(status);
CREATE INDEX idx_alerts_severity_status ON client_alerts(severity, status);
CREATE INDEX idx_alerts_created ON client_alerts(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE client_alerts IS 'AI-detected business signals from interaction notes';
COMMENT ON COLUMN client_alerts.alert_type IS 'risk=threat to business, opportunity=growth signal, blocker=pause/delay, info=general update';
COMMENT ON COLUMN client_alerts.severity IS 'high=immediate action needed, medium=monitor closely, low=informational';
COMMENT ON COLUMN client_alerts.confidence_score IS 'AI confidence in detection (0.00 to 1.00)';
COMMENT ON COLUMN client_alerts.extracted_entities IS 'Structured data extracted from note (e.g., {"financial_issue": true})';
