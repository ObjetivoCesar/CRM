import { db } from './lib/db';
import { contacts, donnaChatMessages } from './lib/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

async function run() {
    try {
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
                    id: contact.id,
                    contactName: contact.contactName || contact.businessName || 'Sin nombre',
                    phone: contact.phone,
                    botMode: contact.botMode,
                    lastMessage: lastMsg?.content || '',
                    lastMessageRole: lastMsg?.role || 'user',
                };
            })
        );
        
        console.table(conversationsWithLastMessage);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

run();
