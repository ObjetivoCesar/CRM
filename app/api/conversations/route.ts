import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, contactChannels } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';

        // ─── STEP 1: Get latest message per chatId (perfect deduplication) ───
        // donna_chat_messages.chat_id IS always the normalized phone/chatId.
        // Using GROUP BY guarantees one row per unique conversation, no matter
        // how many interactions exist for that phone.
        const latestPerChat = await db.execute(sql`
            SELECT
                chat_id,
                MAX(message_timestamp) AS last_activity_at,
                (array_agg(content ORDER BY message_timestamp DESC))[1] AS last_message,
                (array_agg(platform ORDER BY message_timestamp DESC))[1] AS platform
            FROM donna_chat_messages
            GROUP BY chat_id
            ORDER BY last_activity_at DESC
            LIMIT ${limit * 2}
        `);

        const rows = latestPerChat as unknown as Array<{
            chat_id: string;
            last_activity_at: string;
            last_message: string;
            platform: string;
        }>;

        // ─── STEP 2: Enrich each chatId with contact data ───
        const result = await Promise.all(rows.map(async (row) => {
            const chatId = row.chat_id;

            // Look up contact by their channel identifier
            const [channelRow] = await db
                .select({
                    contactId: contacts.id,
                    contactName: contacts.contactName,
                    phone: contacts.phone,
                    status: contacts.status,
                    botMode: contacts.botMode,
                    unreadCount: contacts.unreadCount,
                    channelSource: contacts.channelSource,
                })
                .from(contacts)
                .innerJoin(contactChannels, eq(contacts.id, contactChannels.contactId))
                .where(eq(contactChannels.identifier, chatId))
                .limit(1);

            if (channelRow) {
                const name = channelRow.contactName || channelRow.phone || chatId;
                // Apply search filter
                if (search && !name.toLowerCase().includes(search.toLowerCase()) && !chatId.includes(search)) {
                    return null;
                }
                return {
                    id: chatId,
                    contactId: channelRow.contactId,
                    contactName: name,
                    phone: channelRow.phone || chatId,
                    lastActivityAt: row.last_activity_at,
                    lastMessage: row.last_message,
                    channelSource: channelRow.channelSource || row.platform || 'whatsapp',
                    unreadCount: channelRow.unreadCount || 0,
                    status: channelRow.status || 'sin_contacto',
                    botMode: channelRow.botMode || 'active',
                    entityType: 'contact',
                };
            }

            // Fallback: ghost contact (no linked record yet)
            if (search && !chatId.includes(search)) return null;
            return {
                id: chatId,
                contactId: null,
                contactName: chatId,
                phone: chatId,
                lastActivityAt: row.last_activity_at,
                lastMessage: row.last_message,
                channelSource: row.platform || 'whatsapp',
                unreadCount: 0,
                status: 'sin_contacto',
                botMode: 'active',
                entityType: 'unknown',
            };
        }));

        const filtered = result.filter(Boolean).slice(0, limit);
        return NextResponse.json(filtered);

    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
