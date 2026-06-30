import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const states = await sql`SELECT key, updated_at FROM conversation_states ORDER BY updated_at DESC LIMIT 10`;
        console.log("Recent states:");
        for (const s of states) {
            console.log(`- ${s.key}: ${s.updated_at}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
