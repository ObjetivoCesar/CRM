import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function verify() {
  const result = await db.execute(sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'referral_leads';
  `);
  console.log('Table exists?', JSON.stringify(result));
  process.exit(0);
}

verify().catch(console.error);
