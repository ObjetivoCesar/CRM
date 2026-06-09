import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        console.log('🔄 Iniciando reseteo de datos de César...');

        // 1. Eliminar mensajes de chat
        const deletedMessages = await sql`
            DELETE FROM donna_chat_messages 
            WHERE chat_id IN ('593963410409', '0963410409')
        `;
        console.log(`✅ Mensajes eliminados: ${deletedMessages.count || 0}`);

        // 2. Eliminar estado de la conversación (memoria de Ale)
        const deletedStates = await sql`
            DELETE FROM conversation_states 
            WHERE key IN ('593963410409', '0963410409')
        `;
        console.log(`✅ Fichas de estado eliminadas: ${deletedStates.count || 0}`);

        // 3. Eliminar interacciones
        const deletedInteractions = await sql`
            DELETE FROM interactions 
            WHERE contact_id = 'cf81fa2b-99d9-4c4b-8b4b-d3fbd247ee7a'
        `;
        console.log(`✅ Interacciones eliminadas: ${deletedInteractions.count || 0}`);

        // 4. Actualizar contacto para restablecer su nombre y estado original
        const updatedContact = await sql`
            UPDATE contacts 
            SET 
                contact_name = 'César Reyes',
                business_name = 'César Reyes',
                status = 'entrada',
                last_activity_at = NULL
            WHERE id = 'cf81fa2b-99d9-4c4b-8b4b-d3fbd247ee7a'
        `;
        console.log(`✅ Contacto en Supabase restablecido a "César Reyes" y estado "entrada": ${updatedContact.count || 0}`);

        console.log('🎉 Reseteo completado con éxito. ¡Listo para empezar una conversación limpia!');
    } catch (error) {
        console.error('❌ Error durante el reseteo:', error);
    } finally {
        await sql.end();
    }
}

run();
