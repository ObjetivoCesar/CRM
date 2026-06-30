/**
 * reset_contact.ts
 * Limpia el número de prueba usando la API REST de Supabase (funciona desde local).
 * Uso: npx tsx scratch/reset_contact.ts
 */
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CHAT_ID = '593986962872';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function supabaseDelete(table: string, filter: string): Promise<any[]> {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) {
        const text = await res.text();
        console.error(`  ⚠️  [${table}] DELETE error (${res.status}): ${text}`);
        return [];
    }
    try { return await res.json(); } catch { return []; }
}

async function supabaseSelect(table: string, filter: string, select = '*'): Promise<any[]> {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filter}&limit=10`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
        const text = await res.text();
        console.error(`  ⚠️  [${table}] SELECT error (${res.status}): ${text}`);
        return [];
    }
    return res.json();
}

async function reset() {
    console.log(`\n🧹 Reseteando número de prueba: ${CHAT_ID}\n`);

    // ── 1. Buscar el contacto por canal ────────────────────────────
    const channels = await supabaseSelect(
        'contact_channels',
        `identifier=eq.${CHAT_ID}`,
        'id,contact_id'
    );

    let contactId: string | null = null;

    if (channels.length > 0) {
        contactId = channels[0].contact_id;
        console.log(`✅ Contacto encontrado via channel: ${contactId}`);
    } else {
        // Intento por búsqueda parcial en contacts
        const last9 = CHAT_ID.slice(-9);
        const found = await supabaseSelect('contacts', `phone=like.*${last9}`, 'id,contact_name');
        if (found.length > 0) {
            contactId = found[0].id;
            console.log(`⚠️  Contacto encontrado via teléfono parcial: ${contactId} (${found[0].contact_name})`);
        }
    }

    if (contactId) {
        // Borrar interactions
        const delInter = await supabaseDelete('interactions', `contact_id=eq.${contactId}`);
        console.log(`🗑️  Interactions borradas: ${delInter.length}`);

        // Borrar channels
        const delCh = await supabaseDelete('contact_channels', `contact_id=eq.${contactId}`);
        console.log(`🗑️  Channels borrados: ${delCh.length}`);

        // Borrar contact
        const delCont = await supabaseDelete('contacts', `id=eq.${contactId}`);
        console.log(`🗑️  Contacto borrado: ${delCont.length} (${delCont[0]?.contact_name || ''})`);
    } else {
        console.log(`ℹ️  No se encontró contacto en la DB — puede que ya esté limpio.`);
    }

    // ── 2. Limpiar conversationState (ficha / memoria) ─────────────
    const delState = await supabaseDelete('conversation_states', `key=eq.${CHAT_ID}`);
    console.log(`🗑️  Conversation state borrado: ${delState.length}`);

    // ── 3. Limpiar historial de chat ───────────────────────────────
    const delMsgs = await supabaseDelete('donna_chat_messages', `chat_id=eq.${CHAT_ID}`);
    console.log(`🗑️  Chat messages borrados: ${delMsgs.length}`);

    // ── 4. Limpiar pending_messages_queue (por si hay mensajes en cola) ──
    const delQueue = await supabaseDelete('pending_messages_queue', `chat_id=eq.${CHAT_ID}`);
    console.log(`🗑️  Pending queue borrado: ${delQueue.length}`);

    console.log(`\n✅ ¡Listo! El número ${CHAT_ID} está completamente limpio. Ahora puedes hacer la prueba desde cero.\n`);
}

reset().catch(err => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
});
