import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║         DIAGNÓSTICO COMPLETO - DÓNDE GUARDA ALE           ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        // 1. TABLA contacts - el total sin filtro
        const totalContacts = await sql`SELECT COUNT(*), entity_type FROM contacts GROUP BY entity_type`;
        console.log('📋 1. TABLA "contacts" — Todos los registros por tipo:');
        console.table(totalContacts);

        // 2. Los chats de WhatsApp específicamente
        const waContacts = await sql`
            SELECT id, entity_type, business_name, contact_name, phone, status, source, last_activity_at
            FROM contacts
            WHERE source LIKE '%whatsapp%'
            OR phone LIKE '59%'
            OR phone LIKE '+59%'
            ORDER BY last_activity_at DESC NULLS LAST
        `;
        console.log('\n📱 2. CONTACTOS de WhatsApp en "contacts":');
        console.table(waContacts);

        // 3. conversation_states — donde Ale guarda la "ficha" (memoria de cada cliente)
        const convStates = await sql`
            SELECT key, updated_at, data::text
            FROM conversation_states
            ORDER BY updated_at DESC
            LIMIT 10
        `;
        console.log('\n🧠 3. TABLA "conversation_states" — Ficha/memoria de Ale (últimas 10):');
        if (convStates.length === 0) {
            console.log('   ❌ VACÍA — Ale nunca ha guardado una ficha aquí.');
        } else {
            console.log(`   ✅ ${convStates.length} fichas encontradas. Primer ejemplo:`);
            console.log(`   key: ${convStates[0].key}`);
            console.log(`   updated_at: ${convStates[0].updated_at}`);
            console.log(`   data (primeros 300 chars): ${String(convStates[0].data).slice(0, 300)}`);
        }

        // 4. donna_chat_messages — el historial de conversaciones
        const chatMsgs = await sql`
            SELECT chat_id, role, content, message_timestamp
            FROM donna_chat_messages
            ORDER BY message_timestamp DESC
            LIMIT 10
        `;
        console.log('\n💬 4. TABLA "donna_chat_messages" — Historial de chats guardado (últimas 10):');
        if (chatMsgs.length === 0) {
            console.log('   ❌ VACÍA — No se ha guardado ningún mensaje aquí.');
        } else {
            console.log(`   ✅ ${chatMsgs.length} mensajes encontrados:`);
            console.table(chatMsgs.map(m => ({ 
                chat_id: m.chat_id, 
                role: m.role, 
                content: String(m.content).slice(0, 80), 
                timestamp: m.message_timestamp 
            })));
        }

        // 5. interactions — el log principal de actividad
        const interactions = await sql`
            SELECT id, type, direction, contact_id, content, performed_at, metadata::text
            FROM interactions
            WHERE type = 'whatsapp'
            ORDER BY performed_at DESC
            LIMIT 10
        `;
        console.log('\n📊 5. TABLA "interactions" — Registro de actividad WhatsApp (últimas 10):');
        if (interactions.length === 0) {
            console.log('   ❌ VACÍA — No hay interacciones de WhatsApp.');
        } else {
            console.log(`   ✅ ${interactions.length} interacciones encontradas:`);
            console.table(interactions.map(i => ({
                type: i.type,
                direction: i.direction,
                contact_id: i.contact_id?.slice(0, 8) + '...',
                content: String(i.content).slice(0, 60),
                performed_at: i.performed_at
            })));
        }

        // 6. pending_messages_queue — mensajes esperando ser procesados
        const pending = await sql`
            SELECT chat_id, content, platform, received_at, claimed_at
            FROM pending_messages_queue
            ORDER BY received_at DESC
            LIMIT 5
        `;
        console.log('\n⏳ 6. TABLA "pending_messages_queue" — Cola de mensajes pendientes:');
        if (pending.length === 0) {
            console.log('   ✅ Cola vacía (buena señal, todo fue procesado).');
        } else {
            console.log(`   ⚠️ ${pending.length} mensajes sin procesar:`);
            console.table(pending);
        }

        // 7. contact_channels — el "directorio" de teléfonos de WhatsApp
        const channels = await sql`
            SELECT cc.identifier, cc.platform, cc.contact_id, c.contact_name, c.entity_type
            FROM contact_channels cc
            LEFT JOIN contacts c ON cc.contact_id = c.id
            WHERE cc.platform = 'whatsapp'
            ORDER BY cc.created_at DESC
        `;
        console.log('\n📞 7. TABLA "contact_channels" — Teléfonos registrados de WhatsApp:');
        if (channels.length === 0) {
            console.log('   ❌ VACÍA — Ningún canal de WhatsApp registrado (esto es el problema).');
        } else {
            console.log(`   ✅ ${channels.length} números registrados:`);
            console.table(channels);
        }

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                   FIN DEL DIAGNÓSTICO                     ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('❌ ERROR:', error);
    } finally {
        await sql.end();
    }
}

run();
