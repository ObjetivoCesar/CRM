import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        console.log('--- Messages count for César ---');
        const res = await sql`
            SELECT chat_id, count(*), max(message_timestamp) as last_msg
            FROM donna_chat_messages 
            WHERE chat_id IN ('593963410409', '0963410409', '963410409') 
            GROUP BY chat_id
        `;
        console.table(res);

        console.log('--- Contact info ---');
        const contacts = await sql`
            SELECT id, contact_name, phone, status, bot_mode
            FROM contacts 
            WHERE phone IN ('593963410409', '0963410409', '963410409') 
            OR id = 'cf81fa2b-99d9-4c4b-8b4b-d3fbd247ee7a'
        `;
        console.table(contacts);

        console.log('--- Contact channels ---');
        const channels = await sql`
            SELECT identifier, platform, contact_id
            FROM contact_channels
            WHERE contact_id = 'cf81fa2b-99d9-4c4b-8b4b-d3fbd247ee7a'
        `;
        console.table(channels);
    } catch (e) {
        console.error(e);
    } finally {
        await sql.end();
    }
}

check();
