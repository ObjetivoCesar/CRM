/**
 * Check referral leads captured by a specific referrer code.
 * Edit MY_REFERRAL_CODES below with the codes you want to verify.
 */
import { db } from '../lib/db';
import { referralLeads } from '../lib/db/schema';
import { inArray, desc, sql } from 'drizzle-orm';

const MY_REFERRAL_CODES = [
  // Reemplaza estos con tus códigos reales (mayúsculas, ej: 'REF-CESAR01')
  'REF-CESAR01',
  'REF-CESAR02',
];

async function checkLeads() {
  console.log('Buscando leads para los códigos:', MY_REFERRAL_CODES);
  console.log('---');

  // 1) Conteo agrupado por referidor
  const summary = await db
    .select({
      referralCode: referralLeads.referralCode,
      total: sql<number>`count(*)::int`,
      converted: sql<number>`sum(case when converted then 1 else 0 end)::int`,
      pending: sql<number>`sum(case when not converted then 1 else 0 end)::int`,
    })
    .from(referralLeads)
    .where(inArray(referralLeads.referralCode, MY_REFERRAL_CODES))
    .groupBy(referralLeads.referralCode);

  console.log('Resumen por referidor:');
  console.table(summary);

  // 2) Detalle de cada lead
  const leads = await db
    .select()
    .from(referralLeads)
    .where(inArray(referralLeads.referralCode, MY_REFERRAL_CODES))
    .orderBy(desc(referralLeads.capturedAt));

  console.log(`\nDetalle (${leads.length} leads):`);
  for (const lead of leads) {
    console.log({
      id: lead.id,
      phone: lead.phone,
      code: lead.referralCode,
      name: lead.clientName,
      state: lead.sessionState,
      converted: lead.converted,
      capturedAt: lead.capturedAt,
    });
  }

  process.exit(0);
}

checkLeads().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
