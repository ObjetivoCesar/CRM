
import { NextResponse } from 'next/server';
import { messagingService } from '@/lib/messaging/MessagingService';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params; // Contact ID
        const body = await request.json();
        const { message, metadata } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message content required' }, { status: 400 });
        }

        // --- HANDOVER LOGIC ---
        // When a human sends a message from the CRM, pause the bot automatically
        const { db } = await import('@/lib/db');
        const { contacts, discoveryLeads, contactChannels, donnaChatMessages } = await import('@/lib/db/schema');
        const { eq, sql, and } = await import('drizzle-orm');

        // Resolve Contact Identity to pause the correct entity
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let targetContactId = null;
        let targetLeadId = null;
        let destinationPhone = id;

        if (isUUID) {
            const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
            if (contact) {
                targetContactId = contact.id;
                destinationPhone = contact.phone || id;
                // Also get actual destination from channels if possible
                const [channel] = await db.select().from(contactChannels)
                    .where(and(eq(contactChannels.contactId, id), eq(contactChannels.platform, metadata?.platform || 'whatsapp')))
                    .limit(1);
                if (channel) destinationPhone = channel.identifier;
            } else {
                const [lead] = await db.select().from(discoveryLeads).where(eq(discoveryLeads.id, id)).limit(1);
                if (lead) {
                    targetLeadId = lead.id;
                    destinationPhone = lead.telefonoPrincipal || id;
                }
            }
        } else {
            // It's a phone number (ghost/temporary contact)
            const cleanPhone = id.replace(/\D/g, '');
            const last9 = cleanPhone.slice(-9);
            const [contact] = await db.select().from(contacts).where(sql`${contacts.phone} LIKE ${'%' + last9}`).limit(1);
            if (contact) targetContactId = contact.id;
            else {
                const [lead] = await db.select().from(discoveryLeads).where(sql`${discoveryLeads.telefonoPrincipal} LIKE ${'%' + last9}`).limit(1);
                if (lead) targetLeadId = lead.id;
            }
        }

        // --- PAUSA TEMPORAL 2 HORAS ---
        // En lugar de pausar indefinidamente, se pausa 2h.
        // El Worker leerá humanPausedUntil y auto-reactivará a Ale cuando expire.
        const PAUSE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas
        const humanPausedUntil = new Date(Date.now() + PAUSE_DURATION_MS).toISOString();

        // pausePromise tipado como Promise<any> para evitar el error de TypeScript
        // con el tipo de retorno de Drizzle PgUpdateBase
        let pausePromise: Promise<any> = Promise.resolve();
        if (targetContactId) {
            pausePromise = db.update(contacts)
                .set({ botMode: 'paused', updatedAt: new Date() } as any)
                .where(eq(contacts.id, targetContactId));
        } else if (targetLeadId) {
            pausePromise = db.update(discoveryLeads)
                .set({ botMode: 'paused', updatedAt: new Date() } as any)
                .where(eq(discoveryLeads.id, targetLeadId));
        }

        // Run bot pause and message send in parallel
        const [result] = await Promise.all([
            messagingService.send(id, message, metadata),
            pausePromise.catch((err: any) => console.error('Failed to pause bot:', err))
        ]);

        if (result.success) {
            // FIX: Guardar el mensaje en donnaChatMessages para que aparezca en el frontend
            // (Ya que el Worker no lo hace para los mensajes salientes manuales)
            try {
                await db.insert(donnaChatMessages).values({
                    chatId: destinationPhone,
                    role: 'assistant',
                    content: message,
                    platform: metadata?.platform || 'whatsapp',
                    messageTimestamp: new Date(),
                    metadata: {
                        source: 'crm_human_agent',
                        humanPausedUntil // Worker usa este valor para auto-reanudar Ale después de 2h
                    }
                });
                console.log(`✅ Outbound message saved to donnaChatMessages for UI`);
            } catch (saveErr) {
                console.error('❌ Failed to save outbound message to donnaChatMessages:', saveErr);
            }

            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
