import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import postgres from 'postgres';

async function main() {
    console.log("--- Búsqueda exhaustiva para 1221036736727688 ---");
    const directUrl = "postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
    const sql = postgres(directUrl, { ssl: 'require' });
    try {
        // 1. Obtener el contactId asociado a esta cuenta de IG
        const channels = await sql`
            SELECT * FROM contact_channels 
            WHERE identifier = '1221036736727688' AND platform = 'instagram'
        `;
        console.log("Canales encontrados:", channels);

        if (channels.length > 0) {
            const contactId = channels[0].contact_id;
            console.log(`Contact ID: ${contactId}`);

            // 2. Buscar interacciones por contact_id
            const inters = await sql`
                SELECT * FROM interactions 
                WHERE contact_id = ${contactId}
                ORDER BY performed_at DESC
            `;
            console.log(`Interacciones encontradas (${inters.length}):`);
            inters.forEach(i => {
                console.log(`[${i.performed_at}] Type: ${i.type} | Dir: ${i.direction} | Content: ${i.content}`);
            });
        }

        // 3. Buscar en la cola de mensajes pendientes (pending_messages_queue)
        const pending = await sql`
            SELECT * FROM pending_messages_queue 
            WHERE chat_id = '1221036736727688'
            ORDER BY received_at DESC
        `;
        console.log(`Mensajes pendientes encontrados (${pending.length}):`);
        pending.forEach(p => {
            console.log(`[${p.received_at}] Content: ${p.content} | Platform: ${p.platform} | Error: ${p.error_count}`);
        });

        // 4. Buscar en logs de webhook procesados
        const processed = await sql`
            SELECT * FROM webhook_events_processed 
            WHERE provider = 'instagram'
            ORDER BY processed_at DESC 
            LIMIT 20
        `;
        console.log("Eventos de webhook procesados recientemente:", processed);

    } catch (e) {
        console.error("Error consultando BD:", e);
    } finally {
        await sql.end();
    }
}

main();
