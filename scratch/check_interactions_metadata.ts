import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const interactionsList = await sql`SELECT created_at, content, metadata FROM interactions WHERE content LIKE '%Alerta de Inactividad%' ORDER BY created_at DESC LIMIT 10`;
        console.log(`Found ${interactionsList.length} alerts.`);
        for (const log of interactionsList) {
            console.log(`\nTime: ${log.created_at}\nMetadata: ${JSON.stringify(log.metadata, null, 2)}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
