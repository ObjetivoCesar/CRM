import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const logs = await sql`SELECT created_at, content, trigger, status, error_message FROM whatsapp_logs WHERE trigger = 'webhook_raw_receive' IS FALSE ORDER BY created_at DESC LIMIT 20`;
        for (const log of logs) {
            if (log.content.includes("Alerta de Inactividad")) {
                console.log(`\nTime: ${log.created_at}\nStatus: ${log.status}\nContent: ${log.content}\nError: ${log.error_message}`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
