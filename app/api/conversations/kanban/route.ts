import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, donnaChatMessages, conversationStates } from '@/lib/db/schema';
import { desc, eq, and, sql, gt } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        // Fetch all active conversations
        const allConversations = await db.select()
            .from(contacts)
            .where(
                and(
                    sql`${contacts.phone} IS NOT NULL`,
                    sql`${contacts.lastActivityAt} IS NOT NULL`
                )
            )
            .orderBy(desc(contacts.lastActivityAt))
            .limit(200);

        // Get last message for each contact
        const conversationsWithLastMessage = await Promise.all(
            allConversations.map(async (contact) => {
                const [lastMsg] = await db.select({
                    content: donnaChatMessages.content,
                    timestamp: donnaChatMessages.messageTimestamp,
                    role: donnaChatMessages.role,
                })
                    .from(donnaChatMessages)
                    .where(eq(donnaChatMessages.chatId, contact.phone!))
                    .orderBy(desc(donnaChatMessages.messageTimestamp))
                    .limit(1);

                return {
                    ...contact,
                    contactName: contact.contactName || contact.businessName || 'Sin nombre',
                    lastMessage: lastMsg?.content || '',
                    lastMessageTime: lastMsg?.timestamp || contact.lastActivityAt,
                    lastMessageRole: lastMsg?.role || 'user',
                };
            })
        );

        // Group conversations by Kanban column matching our new 6 stages
        const grouped = {
            entrada: conversationsWithLastMessage.filter(c =>
                c.botMode === 'active' &&
                (c.status === 'sin_contacto' || !c.status || (c.unreadCount || 0) > 0)
            ),
            informador: conversationsWithLastMessage.filter(c =>
                c.botMode === 'active' &&
                c.status === 'primer_contacto'
            ),
            closer: conversationsWithLastMessage.filter(c =>
                c.botMode === 'active' &&
                c.status === 'segundo_contacto'
            ),
            soporte: conversationsWithLastMessage.filter(c =>
                c.botMode === 'active' &&
                c.status === 'soporte'
            ),
            intervencion: conversationsWithLastMessage.filter(c =>
                c.botMode === 'paused' ||
                c.status === 'tercer_contacto'
            ),
            finalizados: conversationsWithLastMessage.filter(c =>
                c.botMode === 'disabled' ||
                c.status === 'convertido'
            ),
        };

        return NextResponse.json(grouped);

    } catch (error: any) {
        console.error('Error fetching kanban data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { contactId, column } = await request.json();

        if (!contactId) {
            return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
        }

        // Map column to database fields
        const updates: any = {};

        switch (column) {
            case 'entrada':
                updates.botMode = 'active';
                updates.status = 'sin_contacto';
                break;
            case 'informador':
                updates.botMode = 'active';
                updates.status = 'primer_contacto';
                updates.unreadCount = 0;
                break;
            case 'closer':
                updates.botMode = 'active';
                updates.status = 'segundo_contacto';
                updates.unreadCount = 0;
                break;
            case 'soporte':
                updates.botMode = 'active';
                updates.status = 'soporte';
                updates.unreadCount = 0;
                break;
            case 'intervencion':
                updates.botMode = 'paused';
                updates.status = 'tercer_contacto';
                updates.unreadCount = 0;
                break;
            case 'finalizados':
                updates.botMode = 'disabled';
                updates.status = 'convertido';
                updates.unreadCount = 0;
                break;
            default:
                return NextResponse.json({ error: `Unknown column: ${column}` }, { status: 400 });
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId);
        let phone: string | null = null;

        if (isUUID) {
            const [c] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
            if (c) {
                phone = c.phone;
            }
            await db.update(contacts)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(contacts.id, contactId));
        } else {
            phone = contactId;
            const normalized = contactId.replace(/^\+?593/, '0');
            await db.update(contacts)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(contacts.phone, normalized));
        }

        // Sync state/intent in the Ficha (conversationStates) so Ale stays in sync
        if (phone) {
            const normalizedPhone = phone.replace(/^\+?593/, '0');
            
            // Try country code formats as well, since conversationStates key might be country code prefixed
            const phoneKeys = [phone, normalizedPhone, `593${normalizedPhone.replace(/^0/, '')}`];
            
            for (const key of phoneKeys) {
                const [state] = await db.select().from(conversationStates).where(eq(conversationStates.key, key)).limit(1);
                if (state) {
                    let currentFicha: any = {};
                    try {
                        currentFicha = typeof state.data === 'string' ? JSON.parse(state.data as string) : state.data;
                    } catch (e) {
                        currentFicha = {};
                    }

                    let intent = 'saludo';
                    if (column === 'informador') intent = 'informador';
                    else if (column === 'closer') intent = 'close_concreto';
                    else if (column === 'intervencion') intent = 'humano';
                    else if (column === 'soporte') intent = 'soporte';
                    else if (column === 'finalizados') intent = 'finalizados';

                    if (currentFicha.ficha) {
                        currentFicha.ficha.intencion_actual = intent;
                    } else {
                        currentFicha.intencion_actual = intent;
                    }

                    const jsonData = JSON.stringify(currentFicha);
                    await db.update(conversationStates)
                        .set({ data: jsonData, updatedAt: new Date() })
                        .where(eq(conversationStates.key, key));
                    break;
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error updating kanban status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
