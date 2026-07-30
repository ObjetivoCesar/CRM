/**
 * Delete referral_leads by code(s). Edit CODES below.
 */
import { db } from '../lib/db';
import { referralLeads } from '../lib/db/schema';
import { inArray } from 'drizzle-orm';

const CODES = ['JHBTVLWF', '77ZG8A4P'];

async function run() {
  const before = await db.select().from(referralLeads).where(inArray(referralLeads.referralCode, CODES));
  console.log('Encontrados antes:', before.length);
  console.table(before.map(b => ({ id: b.id, phone: b.phone, code: b.referralCode, name: b.clientName, capturedAt: b.capturedAt })));

  const deleted = await db.delete(referralLeads).where(inArray(referralLeads.referralCode, CODES)).returning();
  console.log('Eliminados:', deleted.length);
  console.table(deleted.map(b => ({ id: b.id, phone: b.phone, code: b.referralCode })));

  const after = await db.select().from(referralLeads).where(inArray(referralLeads.referralCode, CODES));
  console.log('Quedan con esos códigos:', after.length);

  process.exit(0);
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
