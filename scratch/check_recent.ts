import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import postgres from 'postgres';

async function main() {
    console.log("--- Consultando últimos mensajes de donna_chat_messages (Cualquier plataforma) ---");
    const directUrl = "postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
    const sql = postgres(directUrl, { ssl: 'require' });
    try {
        const chatMessages = await sql`
            SELECT * FROM donna_chat_messages 
            ORDER BY message_timestamp DESC 
            LIMIT 30
        `;
        console.log(`Últimos 30 mensajes en donna_chat_messages:`);
        chatMessages.forEach(m => {
            console.log(`[${m.message_timestamp}] [${m.platform}] Role: ${m.role} | ChatID: ${m.chat_id} | Content: ${m.content.substring(0, 100)}`);
        });

        console.log("\n--- Consultando últimas 30 interacciones ---");
        const inters = await sql`
            SELECT i.*, c.phone, c.contact_name
            FROM interactions i
            LEFT JOIN contacts c ON i.contact_id = c.id
            ORDER BY i.performed_at DESC 
            LIMIT 30
        `;
        inters.forEach(r => {
            console.log(`[${r.performed_at}] ID: ${r.id} | Tipo: ${r.type} | Dir: ${r.direction} | ChatID: ${r.phone || r.contact_id} | Content: ${r.content?.substring(0, 100)}`);
        });

    } catch (e) {
        console.error("Error consultando BD:", e);
    } finally {
        await sql.end();
    }
}

main();
