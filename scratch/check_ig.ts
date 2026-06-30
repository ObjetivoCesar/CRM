import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function tryDirectPostgres() {
    console.log("--- Intentando conexión directa PostgreSQL (Puerto 5432) ---");
    // Reemplazamos el pooler (aws-1-us-east-1.pooler.supabase.com:6543) por la conexión directa (db.sxsdmjpaqgmpmvozoicj.supabase.co:5432)
    const directUrl = "postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@db.sxsdmjpaqgmpmvozoicj.supabase.co:5432/postgres";
    const sql = postgres(directUrl);
    
    try {
        const chatMessages = await sql`
            SELECT * FROM donna_chat_messages 
            WHERE chat_id LIKE '%1221036736727688%' OR chat_id LIKE '%7688%'
            ORDER BY message_timestamp DESC 
            LIMIT 50
        `;
        console.log(`Encontrados ${chatMessages.length} mensajes en donna_chat_messages (directo):`);
        chatMessages.forEach(m => {
            console.log(`[${m.message_timestamp}] ${m.role} (${m.chat_id}): ${m.content.substring(0, 150).replace(/\n/g, ' ')}`);
        });

        const interactionsResult = await sql`
            SELECT i.*, c.phone 
            FROM interactions i
            LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE c.phone LIKE '%1221036736727688%' 
               OR i.contact_id LIKE '%1221036736727688%' 
               OR i.content LIKE '%1221036736727688%'
               OR c.phone LIKE '%7688%'
            ORDER BY i.performed_at DESC 
            LIMIT 50
        `;
        console.log(`\nEncontradas ${interactionsResult.length} interacciones en interactions (directo):`);
        interactionsResult.forEach(r => {
            console.log(`[${r.performed_at}] ${r.direction} (${r.phone || r.contact_id}): ${r.content.substring(0, 150).replace(/\n/g, ' ')}`);
        });

    } catch (e) {
        console.error("Error en conexión directa a PostgreSQL:", e);
    } finally {
        await sql.end();
    }
}

async function trySupabaseClient() {
    console.log("--- Intentando conexión vía cliente Supabase HTTP ---");
    if (!supabaseUrl || !supabaseKey) {
        console.log("Faltan variables de Supabase.");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    try {
        const { data: messages, error: err1 } = await supabase
            .from('donna_chat_messages')
            .select('*')
            .or('chat_id.like.%1221036736727688%,chat_id.like.%7688%')
            .order('message_timestamp', { ascending: false })
            .limit(50);

        if (err1) throw err1;
        console.log(`Encontrados ${messages?.length || 0} mensajes en donna_chat_messages (HTTP):`);
        messages?.forEach(m => {
            console.log(`[${m.message_timestamp}] ${m.role} (${m.chat_id}): ${m.content.substring(0, 150).replace(/\n/g, ' ')}`);
        });
    } catch (e) {
        console.error("Error consultando vía Supabase HTTP:", e);
    }
}

async function main() {
    await tryDirectPostgres();
    await trySupabaseClient();
    process.exit(0);
}

main();
