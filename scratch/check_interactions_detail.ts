import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import postgres from 'postgres';

async function main() {
    console.log("--- Consultando interactions para 1221036736727688 ---");
    const directUrl = "postgresql://postgres.sxsdmjpaqgmpmvozoicj:VhTQvB608MDLHoHs@aws-1-us-east-1.pooler.supabase.com:5432/postgres";
    const sql = postgres(directUrl, { ssl: 'require' });
    try {
        const result = await sql`
            SELECT i.*, c.phone, c.contact_name
            FROM interactions i
            LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE c.phone LIKE '%1221036736727688%' 
               OR i.contact_id LIKE '%1221036736727688%' 
               OR i.content LIKE '%1221036736727688%'
               OR i.discovery_lead_id IN (
                   SELECT id FROM discovery_leads WHERE telefono_principal LIKE '%1221036736727688%'
               )
            ORDER BY i.performed_at DESC 
            LIMIT 50
        `;
        console.log(`Encontradas ${result.length} interacciones:`);
        result.forEach(r => {
            console.log(`[${r.performed_at}] ID: ${r.id} | Tipo: ${r.type} | Dir: ${r.direction} | Contact: ${r.contact_name} (${r.phone || r.contact_id || r.discovery_lead_id})`);
            console.log(`Contenido: "${r.content}"`);
            console.log(`Metadatos: ${JSON.stringify(r.metadata)}`);
            console.log("-".repeat(50));
        });
    } catch (e) {
        console.error("Error consultando interactions:", e);
    } finally {
        await sql.end();
    }
}

main();
