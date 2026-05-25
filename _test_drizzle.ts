import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './lib/db/schema';

async function main() {
  // Option 1: drizzle wrapping a direct (port 5432) connection
  const client1 = postgres(
    'postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
    { prepare: false, ssl: { rejectUnauthorized: false } }
  );
  const db1 = drizzle(client1, { schema });
  const r1 = await db1.execute('SELECT 1 as test');
  console.log('DRIZZLE 5432 OK:', JSON.stringify(r1));
  await client1.end();

  // Option 2: drizzle wrapping a pooler connection WITHOUT prepare:false
  const client2 = postgres(
    'postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    { ssl: { rejectUnauthorized: false } }
  );
  const db2 = drizzle(client2, { schema });
  const r2 = await db2.execute('SELECT 1 as test');
  console.log('DRIZZLE 6543 OK:', JSON.stringify(r2));
  await client2.end();

  process.exit(0);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
