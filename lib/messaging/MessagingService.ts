
import { IMessagingAdapter } from './interfaces';
import { db } from '@/lib/db';
import { contacts, clients, interactions, donnaChatMessages, contactChannels, discoveryLeads } from '@/lib/db/schema';
import { eq, or, desc, sql, and } from 'drizzle-orm';

import { WhatsAppAdapter } from './adapters/WhatsAppAdapter';
import { TelegramAdapter } from './adapters/TelegramAdapter';
import { InstagramAdapter } from './adapters/InstagramAdapter';
import { FacebookAdapter } from './adapters/FacebookAdapter';

export class MessagingService {
    private adapters: Map<string, IMessagingAdapter> = new Map();

    constructor() {
        console.log('📡 MessagingService Core Initialized');

        // Register default adapters
        this.registerAdapter(new WhatsAppAdapter());
        this.registerAdapter(new TelegramAdapter());
        this.registerAdapter(new InstagramAdapter());
        this.registerAdapter(new FacebookAdapter());
    }

    /**
     * Registers a new adapter (plug-in strategy)
     */
    registerAdapter(adapter: IMessagingAdapter) {
        this.adapters.set(adapter.providerId, adapter);
        console.log(`🔌 Adapter registered: ${adapter.providerId}`);
    }

    /**
     * Centralized Send Method
     * automatically determines the best channel for the contact
     */
    async send(id: string, text: string, metadata: any = {}) {
        try {
            console.time(`⏱️ MessagingService.send [${id}]`);
            // 1. Resolve Destination & Adapter
            let destination: string | null = null;
            let requestedChannel = 'whatsapp';
            let contactId: string | null = null;

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            let contact: any = null;

            if (isUUID) {
                const [result] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
                contact = result;
            }

            if (contact) {
                contactId = contact.id;
                requestedChannel = metadata.platform || contact.channelSource || 'whatsapp';

                // Resolve Channel Entry for non-legacy platforms
                const [channelEntry] = await db.select()
                    .from(contactChannels)
                    .where(
                        and(
                            eq(contactChannels.contactId, id),
                            eq(contactChannels.platform, requestedChannel),
                            eq(contactChannels.isPrimary, true)
                        )
                    )
                    .limit(1);

                destination = channelEntry?.identifier || contact.phone;
            } else {
                // Check Discovery Lead (only if UUID)
                let discovery: any = null;
                if (isUUID) {
                    const [res] = await db.select().from(discoveryLeads).where(eq(discoveryLeads.id, id)).limit(1);
                    discovery = res;
                }

                if (discovery) {
                    destination = discovery.telefonoPrincipal;
                    requestedChannel = metadata.platform || 'whatsapp';
                } else {
                    // It's a ghost (id is phone or chat_id)
                    destination = id;
                    requestedChannel = metadata.platform || 'whatsapp';
                }
            }

            const adapter = this.adapters.get(requestedChannel);
            if (!adapter) throw new Error(`No adapter found for channel: ${requestedChannel}`);

            console.log(`📨 MessagingService: Sending via ${requestedChannel}. Destination: ${destination}`);

            if (!destination) {
                throw new Error(`No valid destination identifier found for ${id} on ${requestedChannel}`);
            }

            const result = await adapter.sendMessage(destination, text, metadata);
            console.timeEnd(`⏱️ MessagingService.send [${id}]`);

            // 3. Centralized Logging (NON-BLOCKING or optimized)
            if (result.success) {
                // Update Last Activity (Only if it's a formal contact)
                if (contactId) {
                    db.update(contacts)
                        .set({
                            lastActivityAt: new Date(),
                            unreadCount: 0,
                            updatedAt: new Date()
                        } as any)
                        .where(eq(contacts.id, contactId!))
                        .catch(e => console.warn('⚠️ LastActivity update failed:', e));
                }

                return result;
            }

            return result;

        } catch (error: any) {
            console.error('MessagingService Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Responde directamente a un comentario público
     */
    async replyToComment(platform: 'instagram' | 'facebook', commentId: string, text: string) {
        try {
            const adapter = this.adapters.get(platform) as any;
            if (!adapter || !adapter.replyToComment) {
                throw new Error(`El adaptador de ${platform} no soporta respuestas a comentarios.`);
            }
            return await adapter.replyToComment(commentId, text);
        } catch (error: any) {
            console.error(`❌ Error en MessagingService.replyToComment (${platform}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Context Retrieval with Identity Merging
     * Fetches history for a contact, OR all contacts belonging to the same Client.
     */
    async getUnifiedHistory(id: string, limit = 50) {
        // 1. Resolve Identity (Contact or Discovery Lead)
        let relatedIdentifiers: string[] = [];
        let contactIds: string[] = [];

        const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);

        if (contact) {
            contactIds.push(contact.id);
            relatedIdentifiers.push(contact.phone!);
            // Identity Merging (if client linked)
            const linkedClientId = (contact as any).clientId;
            if (linkedClientId) {
                const siblings = await db.select({ id: contacts.id, phone: contacts.phone })
                    .from(contacts)
                    .where(eq(contacts.clientId, linkedClientId));
                relatedIdentifiers = Array.from(new Set([...relatedIdentifiers, ...siblings.map(s => s.phone).filter(Boolean) as string[]]));
                contactIds = Array.from(new Set([...contactIds, ...siblings.map(s => s.id)]));
            }
        } else {
            // Check Discovery Leads
            const [discovery] = await db.select().from(discoveryLeads).where(eq(discoveryLeads.id, id)).limit(1);
            if (discovery) {
                relatedIdentifiers.push(discovery.telefonoPrincipal!);
                contactIds.push(discovery.id); // Discovery Leads use their own ID in interactions.contactId
            } else {
                // If it's a ghost (id is actually a phone number)
                relatedIdentifiers.push(id);
            }
        }

        if (relatedIdentifiers.length === 0 && contactIds.length === 0) return [];

        // 3 & 4. Fetch History in Parallel
        const [outboundHistory, inboundHistory] = await Promise.all([
            db.select()
                .from(donnaChatMessages)
                .where(
                    sql`${donnaChatMessages.chatId} IN ${relatedIdentifiers} `
                )
                .orderBy(desc(donnaChatMessages.messageTimestamp))
                .limit(limit),
            db.select()
                .from(interactions)
                .where(
                    and(
                        sql`${interactions.contactId} IN ${contactIds.length > 0 ? contactIds : [id]} `,
                        // Only fetch system interactions or things NOT in donnaChatMessages
                        // Since donnaChatMessages now has both User & Assistant, we only need non-message interactions from here (Calls, Meetings, etc)
                        or(
                            and(
                                eq(interactions.direction, 'inbound'),
                                sql`NOT EXISTS (select 1 from ${donnaChatMessages} where ${donnaChatMessages.metadata}->>'metaMessageId' = ${interactions.metadata}->>'id')`
                            ),
                            and(
                                eq(interactions.direction, 'outbound'),
                                sql`NOT EXISTS (select 1 from ${donnaChatMessages} where ${donnaChatMessages.metadata}->>'metaMessageId' = ${interactions.metadata}->>'id')`,
                                or(
                                    eq(interactions.type, 'call'),
                                    eq(interactions.type, 'meeting'),
                                    eq(interactions.type, 'note'),
                                    eq(interactions.type, 'email')
                                )
                            )
                        )
                    )
                )
                .orderBy(desc(interactions.performedAt))
                .limit(limit)
        ]);

        // 5. Merge and Normalize
        const unified = [
            ...outboundHistory.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                messageTimestamp: m.messageTimestamp,
                platform: m.platform,
                metadata: m.metadata
            })),
            ...inboundHistory.map(i => ({
                id: i.id,
                role: i.direction === 'inbound' ? 'user' : (['whatsapp', 'telegram', 'instagram'].includes(i.type) ? 'assistant' : 'system'),
                content: i.content,
                messageTimestamp: i.performedAt,
                platform: i.type,
                metadata: i.metadata
            }))
        ];

        // 6. Sort and unique (Stronger uniqueness by content/time if IDs differ)
        return unified
            .sort((a, b) => new Date(a.messageTimestamp).getTime() - new Date(b.messageTimestamp).getTime())
            .filter((v, i, a) =>
                a.findIndex(t =>
                    (t.id === v.id) ||
                    (t.content === v.content && Math.abs(new Date(t.messageTimestamp).getTime() - new Date(v.messageTimestamp).getTime()) < 1000)
                ) === i
            )
            .slice(-limit);
    }
}

export const messagingService = new MessagingService();
