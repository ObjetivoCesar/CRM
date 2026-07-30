/**
 * Creates the referral_leads table directly via SQL.
 * Uses the runtime DB connection (pooler port 6543) which works fine for DML/DDL.
 */
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function createTable() {
  console.log('Creating referral_leads table...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS referral_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone TEXT NOT NULL,
      referral_code TEXT NOT NULL,
      client_name TEXT,
      session_state TEXT DEFAULT 'NEW_LEAD' CHECK (session_state IN ('NEW_LEAD', 'AWAITING_QUESTION_ANSWER', 'SEQUENCE_COMPLETED', 'HANDOVER_CESAR')),
      converted BOOLEAN NOT NULL DEFAULT false,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✅ Table referral_leads created (or already exists).');

  // Verify
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM referral_leads;
  `);
  console.log('Table verified. Row count:', result.rows[0]);

  process.exit(0);
}

createTable().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
