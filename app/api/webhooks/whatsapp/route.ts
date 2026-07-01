import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interactions, contacts, discoveryLeads, whatsappLogs, contactChannels, donnaChatMessages } from '@/lib/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { cortexRouter } from '@/lib/donna/services/CortexRouterService';
import { whatsappService } from '@/lib/whatsapp/WhatsAppService';
import { getGoogleContactsService } from '@/lib/google/ContactsService';
import { waitUntil } from '@vercel/functions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN;

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED (Active Route)');
            return new NextResponse(challenge, { status: 200 });
        } else {
            console.warn('❌ WEBHOOK_VERIFICATION_FAILED: Token Mismatch');
            return new NextResponse('Forbidden', { status: 403 });
        }
    }
    return new NextResponse('Bad Request', { status: 400 });
}

// INCOMING MESSAGES (POST)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('🏁 WEBHOOK ENTRY POINT - Raw Body:', JSON.stringify(body).slice(0, 200));

        // 0. CAPTURA TÉCNICA INICIAL
        try {
            await db.insert(whatsappLogs).values({
                trigger: 'webhook_raw_receive',
                content: `Event: ${body.object || body.field || 'unknown'}`,
                status: 'processing',
                metadata: { raw: body }
            });
        } catch (e) {
            console.error('Raw Log Error:', e);
        }

        // 1. Extraer Valores
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0] || (body.field === 'messages' ? body : null);
        const value = change?.value;

        if (value?.statuses) {
            return NextResponse.json({ status: 'ignored_status_update' });
        }

        const message = value?.messages?.[0];

        if (message) {
            const fromRaw = message.from;
            const from = fromRaw.replace(/\D/g, ''); // Ensure digits only for chatId consistency
            let content = '';
            let mediaData = null;

            if (message.type === 'text') {
                content = message.text?.body || '';
            } else if (['image', 'video', 'audio', 'voice', 'document'].includes(message.type)) {
                mediaData = message[message.type];
                const caption = mediaData.caption ? `: ${mediaData.caption}` : '';
                content = `[Multimedia: ${message.type}${caption}]`;
            } else {
                content = `[Mensaje de tipo ${message.type}]`;
            }

            // Capture Facebook Ads Context
            let isFbAd = !!message.referral;
            let adMetadata: { campaign?: string; adName?: string } = {};

            if (message.referral) {
                const adHeadline = message.referral.headline || 'Anuncio';
                const adBody = message.referral.body ? ` - ${message.referral.body}` : '';
                content = `[🔔 El cliente viene de Facebook Ads: "${adHeadline}"${adBody}]\n${content}`;
                console.log(`🎯 Facebook Ad Referral Detected: ${adHeadline}`);
                adMetadata.campaign = adHeadline;
                adMetadata.adName = message.referral.body || '';
            } else if (content.includes('source=fbads')) {
                isFbAd = true;
                const campaignMatch = content.match(/campaign=([^&\s]+)/);
                const adMatch = content.match(/ad_name=([^&\s]+)/);
                adMetadata.campaign = campaignMatch ? decodeURIComponent(campaignMatch[1]) : 'fbads';
                adMetadata.adName = adMatch ? decodeURIComponent(adMatch[1]) : '';
                console.log(`🎯 Facebook Ad Link Param Detected. Campaign: ${adMetadata.campaign}, Ad: ${adMetadata.adName}`);
            }

            console.log(`📩 [WEBHOOK_PARSE] From ${from}: ${content}`);

            // 2. Identify Sender (Omnichannel Identity Resolution)
            try {
                let contactId = null;
                let discoveryLeadId = null;

                // A. Try Exact Match in Contact Channels (The "Phone Book")
                // This is the fastest and most accurate method
                const [channelMatch] = await db.select()
                    .from(contactChannels)
                    .where(
                        and(
                            eq(contactChannels.platform, 'whatsapp'),
                            eq(contactChannels.identifier, from)
                        )
                    )
                    .limit(1);

                if (channelMatch) {
                    contactId = channelMatch.contactId;
                    console.log(`✅ ID Resolved via Channels: ${contactId}`);
                } else {
                    // B. Fallback: Legacy Partial Match (Auto-Healing)
                    // If not in channels, check contacts table and MIGRATE IT if found
                    const cleanFrom = from.replace(/\D/g, '');
                    const last9 = cleanFrom.slice(-9);

                    const [legacyContact] = await db.select().from(contacts)
                        .where(sql`${contacts.phone} LIKE ${'%' + last9}`)
                        .limit(1);

                    if (legacyContact) {
                        contactId = legacyContact.id;
                        console.log(`⚠️ Legacy Match Found. Auto-Healing Identity...`);

                        // AUTO-HEAL: Create the channel entry so next time it hits step A
                        try {
                            await db.insert(contactChannels).values({
                                contactId: legacyContact.id,
                                platform: 'whatsapp',
                                identifier: from,
                                isPrimary: true,
                                verified: true
                            });
                        } catch (migErr) {
                            // Ignore unique constraint errors if race condition
                        }
                    } else {
                        // C. Check Discovery Leads (Pre-Contact)
                        const [foundLead] = await db.select().from(discoveryLeads)
                            .where(sql`${discoveryLeads.telefonoPrincipal} LIKE ${'%' + last9}`)
                            .limit(1);

                        if (foundLead) {
                            discoveryLeadId = foundLead.id;
                        } else {
                            console.log(`👤 Webhook: unknown number ${from} - Creating Temporary Visitor`);

                            // D. CREATE TEMPORARY VISITOR (So it shows in Ops Board)
                            // We need a contact record to attach messages to, otherwise the UI won't show the chat.
                            // The UI will detect this name/phone pattern and show the "Unknown" badge + "Create Contact" button.
                            try {
                                const [newGhost] = await db.insert(contacts).values({
                                    businessName: `WhatsApp ${from.slice(-4)}`,
                                    contactName: 'Nuevo Contacto (WhatsApp)',
                                    phone: from,
                                    status: 'sin_contacto', // Kanban initial stage
                                    source: isFbAd ? 'fbads' : 'whatsapp_inbound',
                                    entityType: 'lead',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                    lastActivityAt: new Date()
                                } as any).returning();

                                contactId = newGhost.id;

                                // Also add to channels for future stability
                                await db.insert(contactChannels).values({
                                    contactId: newGhost.id,
                                    platform: 'whatsapp',
                                    identifier: from,
                                    isPrimary: true,
                                    verified: false
                                });
                            } catch (createErr) {
                                console.error('Error creating ghost contact:', createErr);
                            }
                        }
                    }
                }

                // 2.5 UPDATE ACTIVITY & UNREAD STATUS
                // This ensures the contact moves to the top and shows a badge
                if (contactId) {
                    const updateData: any = {
                        lastActivityAt: new Date(),
                        unreadCount: sql`${contacts.unreadCount} + 1`,
                        updatedAt: new Date()
                    };
                    if (isFbAd) {
                        updateData.source = 'fbads';
                    }
                    await db.update(contacts)
                        .set(updateData)
                        .where(eq(contacts.id, contactId));
                }

                // 3.5. INTERCEPT SPECIAL QR CODES (e.g. VCard)
                if (content.toLowerCase().includes('#activa-vcf')) {
                    console.log(`📇 [QR_VCARD] Intercepted VCard request from ${from}`);
                    
                    try {
                        // Log the incoming message interaction in DB so it's visible in the CRM
                        await db.insert(interactions).values({
                            contactId: contactId,
                            discoveryLeadId: discoveryLeadId,
                            type: 'whatsapp',
                            content: content,
                            direction: 'inbound',
                            performedAt: new Date(),
                            createdAt: new Date(),
                            metadata: { source: 'qr_vcard_trigger' }
                        });

                        // Pausa de IA por 1 hora (Networking Humano)
                        try {
                            if (contactId) {
                                await db.update(contacts).set({ botMode: 'paused' as any }).where(eq(contacts.id, contactId));
                            }
                            
                            const pauseUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
                            await db.insert(donnaChatMessages).values({
                                chatId: from,
                                role: 'assistant',
                                content: '[Sistema] IA pausada por 1 hora por entrega de VCard (Networking)',
                                platform: 'whatsapp',
                                messageTimestamp: new Date(),
                                metadata: { 
                                    source: 'crm_human_agent', 
                                    humanPausedUntil: pauseUntil.toISOString() 
                                }
                            });
                            console.log(`⏸️ [QR_VCARD] IA pausada automáticamente por 1 hora para ${from}`);
                        } catch (pauseErr) {
                            console.error('❌ Error pausando IA para VCard:', pauseErr);
                        }

                        // Send Greeting
                        await whatsappService.sendMessage(from, '¡Gracias por escribirnos! Aquí tienes el contacto de César Reyes 👇');
                        
                        // ── VCard Delivery Strategy ──────────────────────────────────────
                        // Strategy 1: Meta Cloud API with proper MIME endpoint
                        // Strategy 2: Evolution API fallback with base64 (if Meta silently drops it)
                        let vcardSent = false;
                        try {
                            const vcardMedia: any = {
                                type: 'document',
                                // Static file served with text/vcard header by Vercel
                                url: 'https://crm-z2kv.vercel.app/cesar-reyes-jaramillo.vcf',
                                filename: 'Cesar_Reyes.vcf'
                            };
                            const vcardResult = await whatsappService.sendMessage(from, '', { source: 'qr_vcard_auto' }, vcardMedia);
                            if (vcardResult?.success !== false) {
                                vcardSent = true;
                                console.log('✅ [VCard] Enviado via Meta API');
                            }
                        } catch (metaErr: any) {
                            console.warn('⚠️ [VCard] Meta API falló, intentando Evolution API...', metaErr.message);
                        }

                        // Evolution API fallback — sends base64 so no MIME issues
                        if (!vcardSent) {
                            try {
                                const evoUrl = process.env.WHATSAPP_API_URL;
                                const evoKey = process.env.WHATSAPP_API_KEY;
                                const evoInstance = process.env.WHATSAPP_INSTANCE_NAME;

                                if (evoUrl && evoKey && evoInstance) {
                                    const fs = await import('fs');
                                    const path = await import('path');
                                    const vcfPath = path.join(process.cwd(), 'public', 'cesar-reyes-jaramillo.vcf');
                                    const vcfBase64 = fs.readFileSync(vcfPath).toString('base64');

                                    const evoPayload = {
                                        number: from,
                                        mediatype: 'document',
                                        mimetype: 'text/vcard',
                                        media: vcfBase64,
                                        fileName: 'Cesar_Reyes.vcf',
                                        caption: '📇 Contacto de César Reyes'
                                    };

                                    const evoRes = await fetch(`${evoUrl}/message/sendMedia/${evoInstance}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                                        body: JSON.stringify(evoPayload)
                                    });

                                    if (evoRes.ok) {
                                        console.log('✅ [VCard] Enviado via Evolution API (fallback)');
                                    } else {
                                        const evoErr = await evoRes.json();
                                        console.error('❌ [VCard] Evolution API también falló:', evoErr);
                                    }
                                } else {
                                    console.warn('⚠️ [VCard] Fallback Evolution API no ejecutado: Faltan variables de entorno en Render (WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_INSTANCE_NAME)');
                                }
                            } catch (evoErr: any) {
                                console.error('❌ [VCard] Error en fallback Evolution:', evoErr.message);
                            }
                        }
                        // ────────────────────────────────────────────────────────────────
                        
                        // Enviar instrucciones de guardado de contacto inmediatamente
                        const instructionsText = 'Para guardar el contacto:\n1. Toca la tarjeta de arriba.\n2. Selecciona "Guardar" o "Añadir a contactos".\n\n¡Perfecto! Ya quedaste registrado en mi agenda también. 📱\nMientras guardas mi contacto, échale un ojo a mi Estado de WhatsApp — tengo algo interesante que quiero mostrarte. 👀';
                        try {
                            await whatsappService.sendMessage(from, instructionsText, { source: 'qr_vcard_instructions' });
                        } catch (instErr) {
                            console.error('❌ Error enviando instrucciones inmediatamente:', instErr);
                        }

                        // Background: Guardar al cliente en Google Contacts automáticamente
                        const googleContacts = getGoogleContactsService();
                        let contactName = value?.contacts?.[0]?.profile?.name || `WhatsApp ${from.slice(-4)}`;
                        
                        // Intentar extraer el nombre del mensaje si el usuario lo completó (ej: "Nombre: Juan Pérez" o "nombre es: Juan")
                        const nameRegex = /(?:nombre\s*es|nombre|name\s*is|name)\s*:\s*([^\n\r#]+)/i;
                        const match = content.match(nameRegex);
                        if (match && match[1].trim()) {
                            contactName = match[1].trim();
                        }
                        
                        console.log(`👤 [GoogleContacts] Intentando registrar contacto: ${contactName} (${from})`);
                        if (googleContacts) {
                            googleContacts.createContact(from, contactName)
                                .then(res => {
                                    if (res) console.log(`✅ [GoogleContacts] Sincronización exitosa: ${res}`);
                                    else console.warn(`⚠️ [GoogleContacts] La sincronización retornó vacío (posible error silencioso)`);
                                })
                                .catch(e => console.error(`❌ [GoogleContacts] Error asíncrono al guardar contacto:`, e));
                        } else {
                            console.warn(`⚠️ [GoogleContacts] El servicio no pudo inicializarse (verificar variables de entorno en Render)`);
                        }
                        
                        // Send Video (El Circo de Ventas) - Retraso de 20s
                        waitUntil(
                            new Promise(resolve => setTimeout(resolve, 20000)).then(async () => {
                                try {
                                    const videoCaption = 'Por esto necesitas contratar ya tu contacto digital 👆';
                                    let videoSent = false;
                                    
                                    try {
                                        const videoRes = await whatsappService.sendMessage(from, '', { source: 'qr_vcard_video' }, {
                                            type: 'video',
                                            url: 'https://cesarweb.b-cdn.net/activaqr/Contacto%20Digital.mp4',
                                            caption: videoCaption
                                        });
                                        if (videoRes?.success !== false) {
                                            videoSent = true;
                                        }
                                    } catch (metaErr) {
                                        console.warn('⚠️ [VCard Video] Meta falló para video, intentando Evolution API...');
                                    }

                                    if (!videoSent) {
                                        const evoUrl = process.env.WHATSAPP_API_URL;
                                        const evoKey = process.env.WHATSAPP_API_KEY;
                                        const evoInstance = process.env.WHATSAPP_INSTANCE_NAME;

                                        if (evoUrl && evoKey && evoInstance) {
                                            const evoPayload = {
                                                number: from,
                                                mediatype: 'video',
                                                mimetype: 'video/mp4',
                                                media: 'https://cesarweb.b-cdn.net/activaqr/Contacto%20Digital.mp4',
                                                caption: videoCaption
                                            };
                                            await fetch(`${evoUrl}/message/sendMedia/${evoInstance}`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                                                body: JSON.stringify(evoPayload)
                                            });
                                            console.log('✅ [VCard Video] Enviado via Evolution API');
                                        }
                                    } else {
                                        console.log('✅ [VCard Video] Enviado via Meta API');
                                    }
                                } catch (e) {
                                    console.error('❌ Error sending delayed video message:', e);
                                }
                            })
                        );
                    } catch (sendErr: any) {
                        console.error('❌ Error sending QR VCard response:', sendErr.message);
                    }
                    
                    // Return 200 OK to Meta to avoid endless retries even if sending failed internally
                    return NextResponse.json({ status: 'vcard_intercepted' });
                }

                // 4. QUEUE FOR ACCUMULATION (Debouncing)
                // We no longer save interactions or chat messages here.
                // The Message Worker will aggregate them every 25s and save a single entry.
                try {
                    const { pendingMessagesQueue } = await import('@/lib/db/schema');
                    await db.insert(pendingMessagesQueue).values({
                        chatId: from,
                        content: content,
                        platform: 'whatsapp',
                        metadata: {
                            ...(mediaData ? { mediaId: mediaData.id, type: message.type } : {}),
                            ...(isFbAd ? { isFbAd: true, adMetadata } : {})
                        },
                        receivedAt: new Date()
                    });

                    // 5. TRIGGER TYPING INDICATOR
                    await whatsappService.sendTypingAction(from).catch(() => { });

                    console.log(`📥 Message queued for ${from}. Accumulation in progress.`);
                } catch (queueErr) {
                    console.error('Queue Error:', queueErr);
                }
            } catch (dbError: any) {
                console.error('⚠️ Webhook DB Error:', dbError.message);
            }
            return NextResponse.json({ status: 'processed' });
        }

        return NextResponse.json({ status: 'no_message_data', received: !!body });
    } catch (error: any) {
        console.error('❌ Webhook error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
