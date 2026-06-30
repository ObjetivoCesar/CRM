import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const logs = await sql`SELECT created_at, content, metadata FROM whatsapp_logs WHERE trigger = 'webhook_raw_receive' ORDER BY created_at DESC LIMIT 50`;
        for (const log of logs) {
            const str = JSON.stringify(log.metadata);
            if (str.includes("wamid.HBgMNTkzOTYzNDEwNDA5FQIAERgSNzZBMTM1NEY3ODJENzQ5Q0E2AA==") || 
                str.includes("wamid.HBgMNTkzOTYzNDEwNDA5FQIAERgSMUIxNEMzNDMxQkUzRjYzNDZBAA==")) {
                console.log(`\nFound status update at ${log.created_at}:`);
                console.log(JSON.stringify(log.metadata, null, 2));
            }
        }
        console.log("Done checking statuses.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
