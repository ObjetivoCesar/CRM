
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, donnaChatMessages, interactions, discoveryLeads } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';

        // 1. Fetch latest interactions across ALL platforms
        const latestInteractions = await db.select()
            .from(interactions)
            .orderBy(desc(interactions.performedAt))
            .limit(limit * 2);

        const chatsMap = new Map();

        // 2. Process and Group
        for (const inter of latestInteractions) {
            const metadata = (inter.metadata as any) || {};
            const phoneNumber = metadata.phoneNumber || (metadata.raw?.from) || '';
            const telegramChatId = metadata.chatId || '';
            const instagramId = metadata.senderId || '';

            // Unique Key: Use platform identifier as primary grouping key to prevent duplicates
            // when some interactions have contactId and others don't
            const platformId = phoneNumber || telegramChatId || instagramId;
            const chatKey = platformId || inter.contactId || inter.discoveryLeadId;

            if (!chatKey) continue;

            const existing = chatsMap.get(chatKey);

            // If we already have this chat, we only want to check if we can "upgrade" its identity
            // in case the newest interaction was missing the contactId but an older one has it.
            if (existing) {
                if (existing.status === 'unknown' && (inter.contactId || inter.discoveryLeadId)) {
                    // We found an older interaction with a linked contact, let's upgrade the identity
                    let updatedName = existing.contactName;
                    let updatedType = existing.type;
                    
                    if (inter.contactId) {
                        const [c] = await db.select().from(contacts).where(eq(contacts.id, inter.contactId)).limit(1);
                        if (c) {
                            updatedName = c.contactName || c.businessName || existing.phone;
                            updatedType = 'contact';
                        }
                    } else if (inter.discoveryLeadId) {
                        const [d] = await db.select().from(discoveryLeads).where(eq(discoveryLeads.id, inter.discoveryLeadId)).limit(1);
                        if (d) {
                            updatedName = d.nombreComercial || existing.phone;
                            updatedType = 'discovery';
                        }
                    }

                    chatsMap.set(chatKey, {
                        ...existing,
                        contactName: updatedName,
                        status: updatedType,
                        entityType: updatedType
                    });
                }
                continue;
            }

            // 3. Resolve Identity for NEW chat
            let identity = {
                name: 'Desconocido',
                phone: platformId,
                type: 'unknown',
                channel: inter.type === 'whatsapp' ? 'whatsapp' : (inter.type === 'other' && metadata.platform === 'instagram' ? 'instagram' : 'telegram')
            };

            if (inter.contactId) {
                const [c] = await db.select().from(contacts).where(eq(contacts.id, inter.contactId)).limit(1);
                if (c) {
                    identity = {
                        name: c.contactName || c.businessName || identity.phone,
                        phone: c.phone || identity.phone,
                        type: 'contact',
                        commercialStatus: c.status,
                        channel: c.channelSource || identity.channel,
                        botMode: c.botMode || 'active',
                        unreadCount: c.unreadCount || 0,
                        contactId: c.id,  // ← UUID real del contacto
                    } as any;
                }
            } else if (inter.discoveryLeadId) {
                const [d] = await db.select().from(discoveryLeads).where(eq(discoveryLeads.id, inter.discoveryLeadId)).limit(1);
                if (d) {
                    identity = {
                        name: d.nombreComercial || identity.phone,
                        phone: d.telefonoPrincipal || identity.phone,
                        type: 'discovery',
                        commercialStatus: d.status,
                        channel: 'whatsapp',
                        botMode: d.botMode || 'active',
                        unreadCount: 0,
                        contactId: d.id,  // ← UUID real del lead
                    } as any;
                }
            }

            // 4. Populate Map
            chatsMap.set(chatKey, {
                id: chatKey,
                contactId: (identity as any).contactId || inter.contactId || null, // UUID real del contacto/lead
                contactName: identity.name,
                phone: identity.phone,
                lastActivityAt: inter.performedAt,
                channelSource: identity.channel,
                unreadCount: (identity as any).unreadCount || 0,
                status: (identity as any).commercialStatus || 'sin_contacto',
                entityType: identity.type,
                botMode: (identity as any).botMode || 'active',
                lastMessage: inter.content,
                direction: inter.direction
            });
        }

        const unified = Array.from(chatsMap.values());

        const filtered = search ? unified.filter((c: any) =>
            c.contactName.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.toLowerCase().includes(search.toLowerCase())
        ) : unified;

        return NextResponse.json(filtered.slice(0, limit));

    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
