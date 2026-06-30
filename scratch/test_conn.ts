import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import postgres from 'postgres';

async function main() {
    console.log("--- Intentando conexión a Pooler en puerto 5432 (directo) ---");
    const directUrl = "postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
    const sql = postgres(directUrl, { ssl: 'require' });
    try {
        const chatMessages = await sql`
            SELECT * FROM donna_chat_messages 
            WHERE chat_id LIKE '%1221036736727688%' OR chat_id LIKE '%7688%'
            ORDER BY message_timestamp DESC 
            LIMIT 50
        `;
        console.log(`Encontrados ${chatMessages.length} mensajes en donna_chat_messages:`);
        chatMessages.forEach(m => {
            console.log(`[${m.message_timestamp}] ${m.role} (${m.chat_id}): ${m.content.substring(0, 150).replace(/\n/g, ' ')}`);
        });
    } catch (e) {
        console.error("Error en puerto 5432:", e);
    } finally {
        await sql.end();
    }
}

main();
