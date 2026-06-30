import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        console.log("Checking between:", twentyFourHoursAgo.toISOString(), "and", tenMinsAgo.toISOString());

        const states = await sql`
            SELECT key, updated_at, data
            FROM conversation_states 
            WHERE updated_at >= ${twentyFourHoursAgo.toISOString()}
              AND updated_at <= ${tenMinsAgo.toISOString()}
        `;
        
        console.log(`Found ${states.length} states in that window with the original SQL logic.`);
        
        const raw_states = await sql`
            SELECT key, updated_at, data
            FROM conversation_states 
            WHERE updated_at >= ${twentyFourHoursAgo}
              AND updated_at <= ${tenMinsAgo}
        `;
        
        console.log(`Found ${raw_states.length} states in that window using Date objects.`);
        
        const string_states = await sql`
            SELECT key, updated_at
            FROM conversation_states 
            WHERE updated_at >= NOW() - INTERVAL '24 hours'
              AND updated_at <= NOW() - INTERVAL '10 minutes'
        `;
        
        console.log(`Found ${string_states.length} states in that window using Postgres NOW().`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
