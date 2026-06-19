import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { donnaChatMessages } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        // El ID es el chatId (número de teléfono) para las conversaciones de campaña
        const messages = await db.select()
            .from(donnaChatMessages)
            .where(eq(donnaChatMessages.chatId, id))
            .orderBy(desc(donnaChatMessages.messageTimestamp))
            .limit(100);

        // Transformar al formato esperado por la UI
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            direction: msg.role === 'user' ? 'inbound' : 'outbound',
            performedAt: msg.messageTimestamp,
            type: 'whatsapp',
            metadata: msg.metadata,
            status: 'sent' // Asumimos que todos los mensajes fueron enviados
        }));

        return NextResponse.json({ success: true, messages: formattedMessages.reverse() }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
            }
        });
    } catch (error: any) {
        console.error('Error fetching campaign chat history:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
