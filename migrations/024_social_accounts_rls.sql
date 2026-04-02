-- Migration: 024_social_accounts_rls.sql
-- Description: Create social_accounts and social_posts tables and enable RLS with service_role bypass.

-- 1. Create social_accounts table
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  account_id TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create social_posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  content TEXT,
  media_urls JSONB DEFAULT '[]',
  media_type TEXT NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL')),
  scheduled_for TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  meta_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS and add policies
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON social_accounts;
CREATE POLICY "Service role full access" ON social_accounts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON social_accounts;
CREATE POLICY "Allow all for authenticated users" ON social_accounts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON social_posts;
CREATE POLICY "Service role full access" ON social_posts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON social_posts;
CREATE POLICY "Allow all for authenticated users" ON social_posts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
