import { db, schema } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function deduplicateProspects() {
    console.log('🧹 Starting deduplication...');

    // 1. Get all prospects
    const allProspects = await db.select().from(schema.prospects);
    console.log(`📊 Total records before cleanup: ${allProspects.length}`);

    // 2. Identify duplicates by business name
    const seen = new Set();
    const duplicates = [];
    const unique = [];

    for (const p of allProspects) {
        const key = p.businessName.toLowerCase().trim();
        if (seen.has(key)) {
            duplicates.push(p.id);
        } else {
            seen.add(key);
            unique.push(p);
        }
    }

    console.log(`🔍 Found ${duplicates.length} duplicates to remove.`);

    // 3. Delete duplicates
    if (duplicates.length > 0) {
        for (const id of duplicates) {
            // @ts-ignore
            await db.delete(schema.prospects).where(sql`id = ${id}`);
        }
    }

    // 4. Verify
    const finalCount = await db.select().from(schema.prospects);
    console.log(`✅ Deduplication complete. Final count: ${finalCount.length}`);
}

deduplicateProspects()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
