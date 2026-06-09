import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const state = await sql`SELECT * FROM conversation_states WHERE key = '593963410409'`;
        console.log("Conversation state:", JSON.stringify(state[0].data, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
