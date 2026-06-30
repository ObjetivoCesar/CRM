import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { db } from '../lib/db';
import { interactions, contacts } from '../lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
    console.log("=== ÚLTIMAS 20 INTERACCIONES EN LA BD ===");
    try {
        const result = await db.select({
            id: interactions.id,
            contactId: interactions.contactId,
            type: interactions.type,
            direction: interactions.direction,
            content: interactions.content,
            performedAt: interactions.performedAt,
            contactPhone: contacts.phone
        })
        .from(interactions)
        .leftJoin(contacts, eq(interactions.contactId, contacts.id))
        .orderBy(desc(interactions.performedAt))
        .limit(20);

        result.forEach(r => {
            console.log(`[${new Date(r.performedAt).toISOString()}] ${r.direction === 'inbound' ? '⬅️' : '➡️'} (${r.contactPhone || r.contactId}): ${r.content.substring(0, 100).replace(/\n/g, ' ')}`);
        });
        
    } catch (e) {
        console.error("Error querying DB:", e);
    }
    process.exit(0);
}

main();
