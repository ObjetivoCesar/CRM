import { db } from '../lib/db';
import { referralLeads, whatsappLogs } from '../lib/db/schema';
import { desc } from 'drizzle-orm';

async function check() {
  const leads = await db.select().from(referralLeads).orderBy(desc(referralLeads.capturedAt)).limit(5);
  console.log('--- ULTIMOS REFERRAL LEADS ---');
  console.log(leads);

  const logs = await db.select().from(whatsappLogs).orderBy(desc(whatsappLogs.createdAt)).limit(3);
  console.log('\n--- ULTIMOS WEBHOOK LOGS ---');
  console.log(logs.map(l => ({ id: l.id, trigger: l.trigger, content: l.content, createdAt: l.createdAt })));
}

check().catch(console.error).finally(() => process.exit(0));
