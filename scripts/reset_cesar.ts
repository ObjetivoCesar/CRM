/**
 * reset_cesar.ts
 * 
 * Script para resetear el estado de César en la DB y conversationStates
 * para empezar una conversación fresh desde cero con Ale.
 * 
 * Ejecutar con: npx ts-node -P tsconfig.json scripts/reset_cesar.ts
 * O desde el root: npx tsx scripts/reset_cesar.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, or } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';

// Usar URL directa de Supabase (sin pgbouncer) para scripts locales
// Transformar de puerto 6543 (pooler) a 5432 (directo)
const RAW_URL = process.env.DATABASE_URL!;
const DIRECT_URL = RAW_URL
    .replace(':6543', ':5432')
    .replace('?pgbouncer=true', '');

console.log('🔌 Conectando a:', DIRECT_URL.replace(/:([^:@]+)@/, ':****@'));
const client = postgres(DIRECT_URL, { ssl: { rejectUnauthorized: false } });
const db = drizzle(client, { schema });

const { contacts, conversationStates, donnaChatMessages } = schema;


// ── Número de César (sin prefijo y con prefijo) ──────────────
const CESAR_RAW = process.env.CESAR_PHONE || '963410409'; // 0963410409 or 593963410409
const FORMATS = [
    CESAR_RAW,
    `0${CESAR_RAW}`,
    `593${CESAR_RAW}`,
    `593${CESAR_RAW.replace(/^0/, '')}`,
    `0${CESAR_RAW.replace(/^0/, '')}`,
];

async function main() {
    console.log('🔍 Buscando registros de César con formatos:', FORMATS);

    // 1. Buscar contact en DB por todos los formatos de teléfono
    const contactRows = await db.select().from(contacts)
        .where(
            or(...FORMATS.map(f => eq(contacts.phone, f)))
        );

    if (contactRows.length === 0) {
        console.warn('⚠️  No se encontró ningún contacto con esos números en la tabla contacts.');
        console.warn('   Puede que nunca haya escrito a la cuenta. Continuando con conversationStates...');
    } else {
        console.log(`✅ Encontrado(s) ${contactRows.length} contacto(s):`);
        for (const c of contactRows) {
            console.log(`   - id=${c.id} | phone=${c.phone} | status=${c.status} | botMode=${c.botMode} | name=${c.contactName}`);
        }

        // 2. Resetear status y botMode en contacts
        for (const c of contactRows) {
            await db.update(contacts)
                .set({
                    status: 'sin_contacto',
                    botMode: 'active',
                    unreadCount: 0,
                    updatedAt: new Date(),
                })
                .where(eq(contacts.id, c.id));
            console.log(`✅ Contact ${c.id} reseteado → status='sin_contacto', botMode='active'`);
        }
    }

    // 3. Resetear conversationStates (Ficha de Ale) para todos los formatos
    console.log('\n🔍 Buscando conversationStates (Ficha de Ale)...');
    for (const f of FORMATS) {
        const [state] = await db.select().from(conversationStates).where(eq(conversationStates.key, f));
        if (state) {
            // Borrar la ficha completamente para forzar inicio desde cero
            await db.update(conversationStates)
                .set({ data: '{}', updatedAt: new Date() })
                .where(eq(conversationStates.key, f));
            console.log(`✅ conversationState key='${f}' → ficha limpiada (vacía)`);
        } else {
            console.log(`   (No existe conversationState para key='${f}')`);
        }
    }

    // 4. Borrar historial de mensajes (donna_chat_messages)
    console.log('\n🔍 Borrando historial de mensajes en donna_chat_messages...');
    for (const f of FORMATS) {
        const deleted = await db.delete(donnaChatMessages).where(eq(donnaChatMessages.chatId, f));
        console.log(`   donnaChatMessages chatId='${f}' → eliminados`);
    }

    console.log('\n🎉 Reset completado. Ahora escribe a la cuenta de WhatsApp y César empezará desde cero.');
    console.log('   El flujo esperado:');
    console.log('   1. Primer mensaje → contacts.status = "sin_contacto" → Kanban: ENTRADA');
    console.log('   2. Ale responde → contacts.status = "primer_contacto" → Kanban: INFORMADOR');
    console.log('   3. Pides precio/cierre → ficha.intencion_actual = "close_concreto" → contacts.status = "segundo_contacto" → Kanban: CLOSER');
    console.log('   4. Ale detecta pago → ficha.pago_recibido = true → contacts.status = "convertido" → Kanban: FINALIZADOS');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
