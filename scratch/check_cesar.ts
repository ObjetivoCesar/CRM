import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const contacts = await sql`SELECT * FROM contacts WHERE phone = '593963410409' OR phone = '0963410409' OR name ILIKE '%César%'`;
        console.log("Contacts:", contacts);
        
        const channels = await sql`SELECT * FROM contact_channels WHERE channel_id = '593963410409' OR channel_id = '0963410409'`;
        console.log("Channels:", channels);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
