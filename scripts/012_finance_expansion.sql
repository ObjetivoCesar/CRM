-- Migration: Finance Module Expansion (Strict Separation & ADHD Support)
-- Adds personal_liabilities table and updates transactions

-- 1. Create personal_liabilities table
CREATE TABLE IF NOT EXISTS "personal_liabilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "category" text NOT NULL,
  "monthly_payment" double precision NOT NULL,
  "total_debt" double precision,
  "remaining_debt" double precision,
  "due_date" integer,
  "status" text DEFAULT 'UP_TO_DATE',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Update transactions table
-- Add sub_type for categorization
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "sub_type" text;

-- Add parent_transaction_id for linking (Anticipo / Saldo)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "parent_transaction_id" uuid;

-- 3. Update existing business logic categories
-- (Optional cleanup if needed, but keeping for now)

-- 4. Set RLS Policies (Assuming standard CRM policies apply)
ALTER TABLE "personal_liabilities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON "personal_liabilities"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
