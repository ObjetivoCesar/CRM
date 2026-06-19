import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: respuesta con headers explícitos de no-caché (defensa en profundidad)
function noCacheJson(data: any) {
    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
        }
    });
}

export async function GET() {
    try {
        // 1. Obtener el mensaje más reciente de CADA chat_id de forma única y eficiente
        // Usamos DISTINCT ON para que PostgreSQL nos dé una sola fila por chatId
        // Ordenamos por chat_id y luego por message_timestamp DESC para quedarnos con el último de cada uno
        const latestMessages = await db.execute(sql`
            SELECT DISTINCT ON (chat_id) 
                id, chat_id, role, content, platform, message_timestamp, metadata
            FROM donna_chat_messages
            WHERE platform = 'whatsapp'
            ORDER BY chat_id, message_timestamp DESC
        `);

        // Convertir a array de objetos planos (execute retorna filas crudas)
        const allMessages = latestMessages as any[];
        console.log('🚀 [API/Chats] Messages found with platform=whatsapp:', allMessages.length);

        if (allMessages.length === 0) {
            const platformStats = await db.execute(sql`SELECT platform, count(*) FROM donna_chat_messages GROUP BY platform`);
            console.log('📊 [API/Chats] Platform statistics:', platformStats);

            const lastAny = await db.execute(sql`SELECT id, chat_id, platform, content FROM donna_chat_messages LIMIT 3`);
            console.log('👀 [API/Chats] Sample messages (any platform):', lastAny);
        }

        // 2. Mapear al formato que espera la UI con Enriquecimiento de Datos
        const chats = await Promise.all(allMessages.map(async (msg) => {
            const chatId = msg.chat_id;
            const content = msg.content || '';
            const role = msg.role;

            // --- Enriquecimiento de Datos (Lookup en Leads y Contactos) ---
            let entityId = null;
            let entityType = 'campaign';
            let contactName = `Chat ${chatId.slice(-4)}`;
            let phone = chatId;

            // Buscar en discovery_leads
            const [lead] = await db.execute(sql`
                SELECT id, nombre_comercial, telefono_principal 
                FROM discovery_leads 
                WHERE telefono_principal = ${chatId} OR telefono_principal = ${'+' + chatId}
                LIMIT 1
            `) as any[];

            if (lead) {
                entityId = lead.id;
                entityType = 'discovery';
                contactName = lead.nombre_comercial;
                phone = lead.telefono_principal || chatId;
            } else {
                // Buscar en contacts
                const [contact] = await db.execute(sql`
                    SELECT id, contact_name, phone 
                    FROM contacts 
                    WHERE phone = ${chatId} OR phone = ${'+' + chatId}
                    LIMIT 1
                `) as any[];

                if (contact) {
                    entityId = contact.id;
                    entityType = 'contact';
                    contactName = contact.contact_name;
                    phone = contact.phone || chatId;
                }
            }

            // Determinar Estatus
            let status = 'inbox';
            const contentNormalized = content.toLowerCase();
            const hotWords = ['precio', 'comprar', 'interesado', 'costo', 'pagar', 'urgente', 'ayuda'];

            if (role === 'assistant') {
                status = 'donna';
            } else if (hotWords.some(word => contentNormalized.includes(word))) {
                status = 'urgent';
            } else if (role === 'user') {
                status = 'inbox';
            }

            return {
                id: chatId,
                entityId,
                entityType,
                contactName,
                phone,
                lastMessage: content,
                status: status,
                time: msg.message_timestamp,
                messageType: 'whatsapp',
                metadata: msg.metadata,
                unread: role === 'user',
                isGhost: true
            };
        }));

        // 3. Ordenar la lista final por fecha (el más reciente de todos arriba)
        const sortedChats = chats.sort((a, b) =>
            new Date(b.time).getTime() - new Date(a.time).getTime()
        );

        return noCacheJson({
            success: true,
            chats: sortedChats
        });

    } catch (error: any) {
        console.error('Error fetching campaign chats:', error);
        return noCacheJson({ success: false, error: error.message });

    }
}
