import * as dotenv from 'dotenv';
import fs from 'fs';
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
}
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';
import { pendingMessagesQueue } from '../lib/db/schema';

async function test() {
    const dbNowRes = await db.execute(sql`SELECT NOW() as now`);
    const dbNowStr = dbNowRes[0].now;
    console.log('DB NOW:', dbNowStr, 'Type:', typeof dbNowStr);

    const pending = await db.select().from(pendingMessagesQueue);
    console.log('Pending count:', pending.length);
    if (pending.length > 0) {
        console.log('First pending raw receivedAt:', pending[0].receivedAt, 'Type:', typeof pending[0].receivedAt);
    }
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
