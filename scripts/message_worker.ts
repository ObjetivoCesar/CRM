import * as dotenv from 'dotenv';
import fs from 'fs';

// Only load .env.local if it exists (for local dev)
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
    console.log('✅ Local .env.local detected and loaded');
} else {
    console.log('🌐 No .env.local found, assuming production environment variables');
}
import http from 'http';

const port = Number(process.env.PORT) || 10000;
const server = http.createServer((req, res) => {
    // Respond 200 OK to EVERYTHING on this port to keep Render happy
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Worker Active');
});

server.listen(port, '0.0.0.0', () => {
    console.log(`🌍 Health Check Server running on port ${port}`);
});

// 🛡️ SIGTERM HANDLER: Log the shutdown signal so we can diagnose it in Render
process.on('SIGTERM', () => {
    console.warn('⚠️ SIGTERM received! Worker is being shut down by Render. Check Render logs and ensure the health check URL is correctly configured.');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.warn('⚠️ SIGINT received! Worker stopping.');
    process.exit(0);
});

// 🔔 KEEP-ALIVE: Ping ourselves externally every 9 min to prevent Render Free Tier idle shutdown
// We MUST ping the external URL (or a configured RENDER_EXTERNAL_URL) so that Render's ingress router sees the traffic.
// Localhost pings do NOT reset the 15-minute idle timer.
setInterval(async () => {
    try {
        const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://crm-nbul.onrender.com';
        const res = await fetch(`${renderUrl}/api/health`);
        console.log(`🏓 External Keep-alive ping (${renderUrl}): ${res.status} OK @ ${new Date().toISOString()}`);
    } catch (e: any) {
        console.warn(`🏓 External Keep-alive ping failed: ${e.message}`);
    }
}, 9 * 60 * 1000); // every 9 minutes

import { db } from '../lib/db';
import { pendingMessagesQueue, conversationStates, donnaChatMessages, messageSuggestions } from '../lib/db/schema';
import { eq, sql, and, or, desc, inArray } from 'drizzle-orm';
import { cortexRouter } from '../lib/donna/services/CortexRouterService';
import { procesarMensajeActivaQR, FichaCliente } from '../lib/activaqr/brain';
import { transcriptionService } from '../lib/ai/TranscriptionService';
import { whatsappService } from '../lib/whatsapp/WhatsAppService';

const ACCUMULATION_WINDOW_MS = 25000; // 25 seconds
const POLL_INTERVAL_MS = 5000; // 5 seconds
const OFFICE_HOURS_START = 8; // 8 AM
const OFFICE_HOURS_END = 20; // 8 PM (20:00)

function isOfficeHours() {
    const now = new Date();
    // Use local time for business hours
    const hour = now.getHours();
    return hour >= OFFICE_HOURS_START && hour < OFFICE_HOURS_END;
}

async function processQueue() {
    try {
        // TEMPORARILY DISABLED - Processing all messages immediately
        // if (!isOfficeHours()) {
        //     setTimeout(processQueue, POLL_INTERVAL_MS * 12);
        //     return;
        // }

        const pendingChats = await db.select({
            chatId: pendingMessagesQueue.chatId,
            firstUpdate: sql<string>`MIN(received_at)`
        })
            .from(pendingMessagesQueue)
            .where(or(
                sql`claimed_at IS NULL`,
                sql`claimed_at < NOW() - INTERVAL '5 minutes'` // Recover zombie chats
            ))
            .groupBy(pendingMessagesQueue.chatId);

        const now = new Date();

        // 2. Filter chats that are ready and chats that need a typing refresh
        const readyChats = [];
        const typingRefreshChats = [];

        for (const chat of pendingChats) {
            // DEBUG: See what the DB is actually returning
            const rawStr = String(chat.firstUpdate);

            // If it already has timezone info (+00, Z, etc), use as is. 
            // If not, assume it's UTC and add Z. 
            // Also handle spaces vs T (Postgres vs ISO)
            const isoStr = rawStr.includes(' ') && !rawStr.includes('T') ? rawStr.replace(' ', 'T') : rawStr;
            const firstReceived = new Date(isoStr.includes('Z') || isoStr.includes('+') ? isoStr : `${isoStr}Z`);

            const timeDiff = now.getTime() - firstReceived.getTime();

            // DIAGNOSTIC LOG (Always show for now to debug)
            console.log(`⏱️ [TIME CHECK] Chat: ${chat.chatId} | DB Raw: "${rawStr}" | Parsed: ${firstReceived.toISOString()} | Now: ${now.toISOString()} | Diff: ${Math.round(timeDiff / 1000)}s`);

            if (timeDiff >= ACCUMULATION_WINDOW_MS) {
                readyChats.push({ ...chat, firstReceived });
            } else {
                typingRefreshChats.push(chat);
            }
        }

        // 3. Process READY chats in PARALLEL
        if (readyChats.length > 0) {
            // ATOMIC CLAIM: Try to mark all ready chats as claimed.
            // Only the ones we successfully changed FROM NULL TO NOW will be processed by this instance.
            const chatsToClaim = readyChats.map(c => c.chatId);

            console.log(`🔒 Attempting to claim ${chatsToClaim.length} chats...`);
            const claimedResults = await db.update(pendingMessagesQueue)
                .set({ claimedAt: new Date() })
                .where(and(
                    inArray(pendingMessagesQueue.chatId, chatsToClaim),
                    or(
                        sql`claimed_at IS NULL`,
                        sql`claimed_at < NOW() - INTERVAL '5 minutes'`
                    )
                ))
                .returning({ chatId: pendingMessagesQueue.chatId });

            const successfullyClaimedIds = new Set(claimedResults.map(r => r.chatId));
            const chatsToProcess = readyChats.filter(c => successfullyClaimedIds.has(c.chatId));

            if (chatsToProcess.length === 0) {
                console.log(`⏭️ All chats were already claimed by another worker.`);
            } else {
                console.log(`🚀 Processing batch for ${chatsToProcess.length} claimed chats in parallel...`);
                await Promise.all(chatsToProcess.map(async (chat) => {
                    let messageIds: string[] = [];
                    try {
                        // A. Fetch all message IDs for this chat
                        const messages = await db.select()
                            .from(pendingMessagesQueue)
                            .where(eq(pendingMessagesQueue.chatId, chat.chatId))
                            .orderBy(pendingMessagesQueue.receivedAt);

                        if (messages.length === 0) return;
                        messageIds = messages.map(m => m.id);

                        // --- TRANSCRIPTION LOGIC ---
                        let audioTooLong = false;
                        const processedMessages = await Promise.all(messages.map(async (m) => {
                            const meta = m.metadata as any;
                            if (meta?.mediaId && (meta.type === 'audio' || meta.type === 'voice')) {
                                console.log(`🎙️ [WORKER] Transcribing audio for ${chat.chatId} (ID: ${meta.mediaId})...`);
                                try {
                                    const media = await whatsappService.getMedia(meta.mediaId);
                                    if (media?.buffer) {
                                        const transcription = await transcriptionService.transcribe(media.buffer);
                                        // null = audio too long, send auto-response
                                        if (transcription === null) {
                                            audioTooLong = true;
                                            return m; // Keep original message content
                                        }
                                        if (transcription) {
                                            return { ...m, content: `[Audio Transcrito]: ${transcription}` };
                                        }
                                    }
                                } catch (transErr) {
                                    console.error(`❌ Transcription Failed for ${meta.mediaId}:`, transErr);
                                }
                            }
                            return m;
                        }));

                        // ⏰ AUTO-RESPONSE: Audio demasiado largo
                        if (audioTooLong) {
                            const tooLongMsg = transcriptionService.getTooLongMessage();
                            console.log(`⏰ [WORKER] Audio too long for ${chat.chatId}. Sending auto-response...`);
                            try {
                                await whatsappService.sendMessage(chat.chatId, tooLongMsg);
                            } catch (sendErr) {
                                console.error(`❌ Error sending audio limit message:`, sendErr);
                            }
                            // Persist the auto-response
                            if (process.env.DISABLE_MESSAGE_PERSISTENCE !== 'true') {
                                try {
                                    const { donnaChatMessages: localMessages } = await import('../lib/db/schema');
                                    await db.insert(localMessages).values({
                                        chatId: chat.chatId,
                                        role: 'assistant',
                                        content: tooLongMsg,
                                        platform: 'whatsapp',
                                        messageTimestamp: new Date(),
                                        metadata: { source: 'system_audio_limit' }
                                    });
                                    console.log(`✅ Audio limit response saved to chat history`);
                                } catch (persistErr) {
                                    console.error(`❌ Error saving audio limit response:`, persistErr);
                                }
                            }
                            // Mark messages as claimed and skip AI
                            await db.delete(pendingMessagesQueue).where(inArray(pendingMessagesQueue.id, messageIds));
                            console.log(`🗑️ Cleared ${messageIds.length} messages from queue for ${chat.chatId} (audio too long)`);
                            return; // Exit early — skip AI processing
                        }

                        const unifiedContent = processedMessages.map(m => m.content).join('\n');
                        const rawPlatform = messages[0]?.platform || 'whatsapp';
                        
                        // Define valid types for interactions and chat history
                        const interactionTypeMap: Record<string, 'whatsapp' | 'telegram' | 'instagram' | 'instagram_comment' | 'facebook' | 'facebook_comment'> = {
                            whatsapp: 'whatsapp',
                            telegram: 'telegram',
                            instagram: 'instagram',
                            instagram_comment: 'instagram_comment',
                            facebook: 'facebook',
                            facebook_comment: 'facebook_comment',
                        };

                        const chatPlatformMap: Record<string, 'whatsapp' | 'telegram' | 'instagram' | 'facebook'> = {
                            whatsapp: 'whatsapp',
                            telegram: 'telegram',
                            instagram: 'instagram',
                            instagram_comment: 'instagram',
                            facebook: 'facebook',
                            facebook_comment: 'facebook',
                        };

                        const platform = interactionTypeMap[rawPlatform] || 'whatsapp';
                        const chatPlatform = chatPlatformMap[rawPlatform] || 'whatsapp';

                        // B. Identify Contact for Persistence
                        const { contacts, contactChannels, discoveryLeads, interactions, donnaChatMessages } = await import('../lib/db/schema');
                        const [contact] = await db.select()
                            .from(contacts)
                            .innerJoin(contactChannels, eq(contacts.id, contactChannels.contactId))
                            .where(eq(contactChannels.identifier, chat.chatId))
                            .limit(1);

                        let finalContactId = contact?.contacts?.id;
                        let finalDiscoveryLeadId = null;
                        let botMode = contact?.contacts?.botMode || 'active';

                        if (!finalContactId) {
                            const [discovery] = await db.select()
                                .from(discoveryLeads)
                                .where(eq(discoveryLeads.telefonoPrincipal, chat.chatId))
                                .limit(1);
                            if (discovery) {
                                finalDiscoveryLeadId = discovery.id;
                                botMode = discovery.botMode || 'active';
                            }
                        }
                        // Expire any existing co-pilot drafts because the client just wrote again
                        try {
                            await db.update(messageSuggestions)
                                .set({ status: 'expired', updatedAt: new Date() })
                                .where(
                                    and(
                                        eq(messageSuggestions.chatId, chat.chatId),
                                        eq(messageSuggestions.status, 'pending')
                                    )
                                );
                        } catch (expireErr) {
                            console.error(`❌ Error expiring old drafts:`, expireErr);
                        }

                        // C. PERSISTENCE (Single Writer Pattern)
                        // Worker is the ONLY place that writes to donna_chat_messages
                        const FORCE_TESTING_MODE = false;

                        if (!FORCE_TESTING_MODE && process.env.DISABLE_MESSAGE_PERSISTENCE !== 'true') {
                            try {
                                const interactionResult = await db.insert(interactions).values({
                                    type: platform,
                                    direction: 'inbound',
                                    content: unifiedContent,
                                    contactId: finalContactId || null,
                                    discoveryLeadId: finalDiscoveryLeadId || null,
                                    metadata: {
                                        phoneNumber: chat.chatId,
                                        isBatched: true,
                                        batchSize: messages.length
                                    },
                                    performedAt: new Date()
                                }).returning();
                                console.log(`✅ Interaction saved with ID: ${interactionResult[0]?.id}`);

                                const chatMsgResult = await db.insert(donnaChatMessages).values({
                                    chatId: chat.chatId,
                                    role: 'user',
                                    content: unifiedContent,
                                    platform: chatPlatform as any,
                                    messageTimestamp: new Date(),
                                    metadata: { source: 'worker_batch' }
                                }).returning();
                                console.log(`✅ Chat message saved with ID: ${chatMsgResult[0]?.id}`);

                                console.log(`📝 [PERSISTED] Batched ${messages.length} messages for ${chat.chatId}`);
                            } catch (persistErr) {
                                console.error(`❌ Persistence Error for ${chat.chatId}:`, persistErr);
                            }
                        } else {
                            console.log(`⏭️ [PERSISTENCE DISABLED] Skipping save for ${chat.chatId} (testing mode)`);
                        }

                        let shouldSkipAI = botMode !== 'active' && botMode !== 'co-pilot';
                        let skipReason: string = botMode;

                        // ─── AUTO-REANUDACIÓN TRAS PAUSA HUMANA (2 HORAS) ───
                        // Si el bot está pausado por intervención humana, verificar si la pausa ya expiró.
                        // La marca de expiración se guarda en el metadata del último mensaje humano (crm_human_agent).
                        if (shouldSkipAI && botMode === 'paused') {
                            try {
                                const [lastHumanMsg] = await db.select()
                                    .from(donnaChatMessages)
                                    .where(
                                        and(
                                            eq(donnaChatMessages.chatId, chat.chatId),
                                            eq(donnaChatMessages.role, 'assistant'),
                                            sql`metadata->>'source' = 'crm_human_agent'`
                                        )
                                    )
                                    .orderBy(desc(donnaChatMessages.messageTimestamp))
                                    .limit(1);

                                if (lastHumanMsg) {
                                    const pausedUntilStr = (lastHumanMsg.metadata as any)?.humanPausedUntil;
                                    if (pausedUntilStr) {
                                        const pausedUntil = new Date(pausedUntilStr).getTime();
                                        const nowMs = Date.now();
                                        if (nowMs >= pausedUntil) {
                                            // ✅ Pausa expirada — reactivar Ale
                                            console.log(`⏰ [AUTO-RESUME] Pausa humana expiró para ${chat.chatId}. Reactivando Ale...`);
                                            shouldSkipAI = false;
                                            skipReason = 'auto_resumed';
                                            // Reactivar en DB
                                            if (finalContactId) {
                                                await db.update(contacts)
                                                    .set({ botMode: 'active' } as any)
                                                    .where(eq(contacts.id, finalContactId))
                                                    .catch((e: any) => console.warn('⚠️ No se pudo reactivar botMode en contacts:', e.message));
                                            } else if (finalDiscoveryLeadId) {
                                                const { discoveryLeads } = await import('../lib/db/schema');
                                                await db.update(discoveryLeads)
                                                    .set({ botMode: 'active' } as any)
                                                    .where(eq(discoveryLeads.id, finalDiscoveryLeadId))
                                                    .catch((e: any) => console.warn('⚠️ No se pudo reactivar botMode en leads:', e.message));
                                            }
                                        } else {
                                            const minutesLeft = Math.round((pausedUntil - nowMs) / 60000);
                                            console.log(`⏸️ [PAUSA HUMANA] ${chat.chatId}: Ale pausada por ${minutesLeft} min más (hasta ${new Date(pausedUntil).toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' })})`);
                                        }
                                    }
                                    // Si no tiene humanPausedUntil, es una pausa manual del switch → respetar
                                } else {
                                    // No hay mensaje humano registrado → pausa manual del switch, respetar
                                    console.log(`⏸️ [PAUSA MANUAL] ${chat.chatId}: Pausa sin expiración (switch manual).`);
                                }
                            } catch (resumeErr: any) {
                                console.warn(`⚠️ Error verificando auto-reanudación para ${chat.chatId}:`, resumeErr.message);
                            }
                        }

                        // Check for Human Intervention (Handover) if bot is active
                        if (!shouldSkipAI) {
                            const [lastOutbound] = await db.select()
                                .from(interactions)
                                .where(
                                    and(
                                        eq(interactions.direction, 'outbound'),
                                        or(
                                            finalContactId ? eq(interactions.contactId, finalContactId) : sql`false`,
                                            finalDiscoveryLeadId ? eq(interactions.discoveryLeadId, finalDiscoveryLeadId) : sql`false`,
                                            sql`metadata->>'phoneNumber' = ${chat.chatId}`
                                        )
                                    )
                                )
                                .orderBy(desc(interactions.performedAt))
                                .limit(1);

                            if (lastOutbound) {
                                const lastOutboundTime = new Date(lastOutbound.performedAt).getTime();
                                const firstMessageTime = chat.firstReceived.getTime();

                                const isDonnaSource = (lastOutbound.metadata as any)?.source === 'donna';
                                const hasDonnaPrefix = lastOutbound.content?.startsWith('Donna:');

                                if (lastOutboundTime > firstMessageTime && !isDonnaSource && !hasDonnaPrefix) {
                                    shouldSkipAI = true;
                                    skipReason = 'human_intervention';
                                }
                            }
                        }


                        if (chat.chatId === '593963410409' || chat.chatId === '0963410409') {
                            console.log(`👑 ADMIN MESSAGE DETECTED from ${chat.chatId}`);
                            try {
                                const { conversationStates } = await import('../lib/db/schema');
                                const { desc, eq, ne, sql } = await import('drizzle-orm');
                                
                                const recentStates = await db.select({
                                    key: conversationStates.key,
                                    data: conversationStates.data,
                                    updatedAt: conversationStates.updatedAt
                                })
                                .from(conversationStates)
                                .where(ne(conversationStates.key, chat.chatId))
                                .orderBy(desc(conversationStates.updatedAt))
                                .limit(20);
                                
                                let summaryText = "Hola César, aquí tienes el resumen de las últimas conversaciones:\n\n";
                                let count = 0;
                                
                                for (const st of recentStates) {
                                    const parsed = typeof st.data === 'string' ? JSON.parse(st.data as string) : st.data;
                                    const ficha = parsed.ficha || parsed;
                                    
                                    // Skip empty or uninteresting states
                                    if (!ficha || (!ficha.nombre && !ficha.producto_interes && !ficha.producto_detectado && !ficha.rubro)) continue;
                                    
                                    const name = ficha.nombre || 'Desconocido';
                                    const phone = st.key;
                                    const status = ficha.agente_activo || 'N/A';
                                    const product = ficha.producto_interes || ficha.producto_detectado || 'N/A';
                                    const rubro = ficha.rubro || 'N/A';
                                    
                                    summaryText += `👤 *${name}* (${phone})\n`;
                                    summaryText += `🔹 Rubro: ${rubro}\n`;
                                    summaryText += `🔹 Producto: ${product}\n`;
                                    summaryText += `🔹 Agente: ${status}\n`;
                                    summaryText += `⏱️ Última act: ${new Date(st.updatedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}\n\n`;
                                    
                                    count++;
                                    if (count >= 5) break; // limit to 5
                                }
                                
                                if (count === 0) {
                                    summaryText = "Hola César, por el momento no hay conversaciones recientes activas.";
                                }
                                
                                // Send summary to César
                                await whatsappService.sendMessage(chat.chatId, summaryText);
                                
                                // Clear queue
                                await db.delete(pendingMessagesQueue).where(inArray(pendingMessagesQueue.id, messageIds));
                                console.log(`🗑️ Cleared ${messageIds.length} messages from queue for ${chat.chatId} (ADMIN)`);
                                
                                return; // Skip normal AI processing
                            } catch (adminErr) {
                                console.error(`❌ Error processing admin command:`, adminErr);
                            }
                        } else if (shouldSkipAI) {
                            console.log(`🔕 skipping AI for ${chat.chatId} (Reason: ${skipReason})`);
                        } else {
                            // ─── ACTIVAQR BRAIN (Ale) ───
                            // Cargar ficha desde conversationStates
                            let fichaCliente: FichaCliente = { numero: chat.chatId };
                            try {
                                const [state] = await db.select()
                                    .from(conversationStates)
                                    .where(eq(conversationStates.key, chat.chatId))
                                    .limit(1);
                                if (state?.data) {
                                    const parsed = typeof state.data === 'string' ? JSON.parse(state.data as string) : state.data;
                                    fichaCliente = { ...fichaCliente, ...(parsed.ficha || parsed) };
                                    console.log(`📋 Ficha cargada para ${chat.chatId}`);
                                }
                                
                                // Auto-propagate fuente_origen from database contact/discovery source
                                if (contact?.contacts?.source === 'fbads' || (contact?.contacts?.source === 'whatsapp_inbound' && contact?.contacts?.source === 'fbads')) {
                                    fichaCliente.fuente_origen = 'fbads';
                                } else if (finalContactId) {
                                    const [cRecord] = await db.select({ source: contacts.source }).from(contacts).where(eq(contacts.id, finalContactId)).limit(1);
                                    if (cRecord?.source === 'fbads') {
                                        fichaCliente.fuente_origen = 'fbads';
                                    }
                                } else if (finalDiscoveryLeadId) {
                                    const [lRecord] = await db.select({ sistemaOrigen: discoveryLeads.sistemaOrigen }).from(discoveryLeads).where(eq(discoveryLeads.id, finalDiscoveryLeadId)).limit(1);
                                    if (lRecord?.sistemaOrigen === 'fbads') {
                                        fichaCliente.fuente_origen = 'fbads';
                                    }
                                }
                            } catch (e: any) {
                                console.warn(`⚠️ No se pudo cargar ficha para ${chat.chatId}:`, e.message);
                            }

                            // Cargar historial reciente
                            const historialMsgs: Array<{ role: 'user' | 'assistant'; content: string }> = [];
                            try {
                                const recentHistory = await db.select()
                                    .from(donnaChatMessages)
                                    .where(eq(donnaChatMessages.chatId, chat.chatId))
                                    .orderBy(desc(donnaChatMessages.messageTimestamp))
                                    .limit(10);
                                historialMsgs.push(...recentHistory.reverse().map(m => ({
                                    role: m.role as 'user' | 'assistant',
                                    content: m.content || ''
                                })));
                            } catch (e: any) {
                                console.warn(`⚠️ No se pudo cargar historial para ${chat.chatId}:`, e.message);
                            }

                            const resultado = await procesarMensajeActivaQR(unifiedContent, fichaCliente, historialMsgs);
                            console.log(`✅ ActivaQR Brain procesado para ${chat.chatId} (transferir=${resultado.transferir})`);

                            // Reset the reactivation flag since customer replied
                             if (resultado.nuevaFicha) {
                                 if (!resultado.nuevaFicha.sesion) resultado.nuevaFicha.sesion = {};
                                 (resultado.nuevaFicha.sesion as any).reactivacion_sticker_enviada = false;
                             }

                            // E. PERSIST FICHA ACTUALIZADA
                            if (process.env.DISABLE_MESSAGE_PERSISTENCE !== 'true') {
                                try {
                                    await db.insert(conversationStates).values({
                                        key: chat.chatId,
                                        data: JSON.stringify({ ficha: resultado.nuevaFicha }),
                                        updatedAt: new Date()
                                    }).onConflictDoUpdate({
                                        target: conversationStates.key,
                                        set: {
                                            data: JSON.stringify({ ficha: resultado.nuevaFicha }),
                                            updatedAt: new Date()
                                        }
                                    });
                                    console.log(`💾 Ficha persistida para ${chat.chatId}`);
                                } catch (fichaErr) {
                                    console.error(`❌ Error guardando ficha:`, fichaErr);
                                }

                                // LOPDP: Sync consent to contacts table (legal audit trail)
                                if (resultado.nuevaFicha.acepto_proteccion && finalContactId) {
                                    try {
                                        await db.update(contacts)
                                            .set({
                                                aceptoProteccion: true,
                                                aceptoFecha: new Date(resultado.nuevaFicha.acepto_fecha || new Date().toISOString())
                                            } as any)
                                            .where(eq(contacts.id, finalContactId));
                                        console.log(`🛡️ LOPDP Consent synced to contacts for ${chat.chatId}`);
                                    } catch (consentErr) {
                                        console.error(`❌ Error syncing LOPDP consent:`, consentErr);
                                    }
                                }

                                // 🔥 HITO 1.2 — AUTO-ENRIQUECER GHOST: Extraer datos de la ficha a contacts
                                // Sobre-escribe campos VACÍOS o default. NO pisa cambios hechos por humano.
                                if (finalContactId) {
                                    const ficha = resultado.nuevaFicha;

                                    // 1. Leer estado actual del contacto para no pisar campos llenos
                                    const currentContact = await db.select({
                                        contactName: contacts.contactName,
                                        businessActivity: contacts.businessActivity,
                                        interestedProduct: contacts.interestedProduct,
                                        personalityType: contacts.personalityType,
                                        pains: contacts.pains,
                                        goals: contacts.goals,
                                        objections: contacts.objections,
                                        status: contacts.status,
                                        entityType: contacts.entityType
                                    }).from(contacts).where(eq(contacts.id, finalContactId)).limit(1).then(r => r[0]);

                                    if (currentContact) {
                                        const isGhostPhone = /^\+?\d{7,15}$/.test(currentContact.contactName || '');
                                        const enrichFields: Record<string, any> = {};

                                        // Solo llena si: está vacío, es un número (ghost), o el campo es default
                                        if (ficha.nombre && (!currentContact.contactName || isGhostPhone || currentContact.contactName.startsWith('+'))) {
                                            enrichFields.contactName = ficha.nombre;
                                        }
                                        if (ficha.rubro && !currentContact.businessActivity) {
                                            enrichFields.businessActivity = ficha.rubro;
                                        }
                                        const detectedProduct = ficha.producto_interes || ficha.producto_detectado;
                                        if (detectedProduct && !currentContact.interestedProduct) {
                                            enrichFields.interestedProduct = detectedProduct;
                                        }
                                        if (ficha.temperamento && !currentContact.personalityType) {
                                            const temperamentoMap: Record<string, string> = {
                                                'flematico': 'Flemático (Analítico)',
                                                'sanguineo': 'Sanguíneo (Social)',
                                                'colerico': 'Colérico (Decidido)',
                                                'melancolico': 'Melancólico (Detallista)'
                                            };
                                            enrichFields.personalityType = temperamentoMap[ficha.temperamento] || ficha.temperamento;
                                        }
                                        if (ficha.dolores && ficha.dolores.length > 0 && !currentContact.pains) {
                                            enrichFields.pains = ficha.dolores.join('\n');
                                        }
                                        if (ficha.objetivo && !currentContact.goals) {
                                            enrichFields.goals = ficha.objetivo;
                                        }
                                        if (ficha.objeciones && ficha.objeciones.length > 0 && !currentContact.objections) {
                                            enrichFields.objections = ficha.objeciones.join('\n');
                                        }

                                        if (Object.keys(enrichFields).length > 0) {
                                            try {
                                                await db.update(contacts)
                                                    .set({ ...enrichFields, updatedAt: new Date() } as any)
                                                    .where(eq(contacts.id, finalContactId));
                                                console.log(`✨ Ghost auto-enriched for ${chat.chatId}:`, Object.keys(enrichFields).join(', '));
                                            } catch (enrichErr) {
                                                console.error(`❌ Error enriching ghost:`, enrichErr);
                                            }
                                        }
                                    }
                                }

                                // 🔥 HITO 2.2 — KANBAN AUTOMÁTICO: Avanzar etapa del lead según la conversación
                                // ❗ REGLA DE ORO: NO pisa movimientos manuales. Solo avanza si el status
                                // sigue siendo el que el sistema dejó. Si un humano movió el lead, se respeta.
                                if (finalContactId) {
                                    const ficha = resultado.nuevaFicha;
                                    // Re-leer estado actual (puede haber cambiado desde enrich block)
                                    const currentContact = await db.select({
                                        status: contacts.status,
                                        entityType: contacts.entityType
                                    }).from(contacts).where(eq(contacts.id, finalContactId)).limit(1).then(r => r[0]);

                                    if (currentContact) {
                                        let newStatus: string | null = null;
                                        let newEntityType: string | null = null;
                                        const currentStatus = currentContact.status;
                                        const validKanbanStatuses = ['sin_contacto', 'primer_contacto', 'segundo_contacto', 'tercer_contacto', 'lead'];

                                         // Solo operamos en status que conocemos (no tocar si humano lo movió fuera del Kanban)
                                         if (currentStatus && validKanbanStatuses.includes(currentStatus)) {

                                            // Regla 1: Pago recibido → convertir a cliente (completo)
                                            if (ficha.pago_recibido && currentContact.entityType !== 'client') {
                                                newEntityType = 'client';
                                                newStatus = 'convertido';
                                                console.log(`🏆 [KANBAN] ${chat.chatId}: Pago recibido → CLIENTE`);

                                                // Crear transacción financiera automática
                                                try {
                                                    const { transactions } = await import('../lib/db/schema');
                                                    await db.insert(transactions).values({
                                                        type: 'INCOME',
                                                        category: 'Venta - ActivaQR',
                                                        description: `Venta automática: ${ficha.producto_interes || ficha.producto_detectado || 'Producto ActivaQR'}`,
                                                        amount: 0, // Se completa manualmente
                                                        date: new Date(),
                                                        status: 'PENDING',
                                                        contactId: finalContactId,
                                                    } as any);
                                                    console.log(`💰 [KANBAN] Transacción creada para ${chat.chatId}`);
                                                } catch (transErr) {
                                                    console.error(`❌ [KANBAN] Error creando transacción:`, transErr);
                                                }

                                                // Registrar en interacciones (audit trail)
                                                try {
                                                    await db.insert(interactions).values({
                                                        type: 'note',
                                                        direction: 'outbound',
                                                        content: `🤖 Conversión automática a cliente (${ficha.producto_interes || 'sin producto'})`,
                                                        contactId: finalContactId,
                                                        performedAt: new Date(),
                                                    } as any);
                                                    console.log(`📝 [KANBAN] Audit trail creado para ${chat.chatId}`);
                                                } catch (auditErr) {
                                                    console.error(`❌ [KANBAN] Error en audit trail:`, auditErr);
                                                }
                                            }

                                            // Regla 2: Transferencia a humano → marcar como urgente
                                            // ⚠️ FIX: Paréntesis correctos para precedencia de operadores
                                            else if (resultado.transferir && (currentStatus === 'primer_contacto' || currentStatus === 'sin_contacto' || currentStatus === 'lead')) {
                                                newStatus = 'tercer_contacto';
                                                console.log(`📞 [KANBAN] ${chat.chatId}: Transferencia solicitada → Seguimiento`);
                                            }

                                            // Regla 3: Cliente pide precio o muestra intención de compra → mover a Interesado (Closer)
                                            else if (
                                                (ficha.agente_activo === 'close_concreto' ||
                                                 ficha.agente_activo === 'close_general' ||
                                                 ficha.intencion_actual === 'close_concreto' ||
                                                 ficha.intencion_actual === 'close_general' ||
                                                 ficha.producto_interes) &&
                                                (currentStatus === 'sin_contacto' || currentStatus === 'primer_contacto' || currentStatus === 'lead')
                                            ) {
                                                newStatus = 'segundo_contacto';
                                                console.log(`🎯 [KANBAN] ${chat.chatId}: Intención de compra detectada (agente_activo=${ficha.agente_activo}) → Closer`);
                                            }

                                            // Regla 4: Primera respuesta del bot enviada → mover a Propuesta Enviada
                                            else if (
                                                resultado.respuesta &&
                                                (currentStatus === 'sin_contacto' || currentStatus === 'lead')
                                            ) {
                                                newStatus = 'primer_contacto';
                                                console.log(`📤 [KANBAN] ${chat.chatId}: Primera respuesta enviada → Propuesta Enviada`);
                                            }
                                        } else {
                                            console.log(`🚫 [KANBAN] ${chat.chatId}: Status "${currentStatus}" es manual. No se auto-mueve.`);
                                        }

                                        // Aplicar cambios
                                        const updateFields: Record<string, any> = { updatedAt: new Date() };
                                        if (newStatus) updateFields.status = newStatus;
                                        if (newEntityType) {
                                            updateFields.entityType = newEntityType;
                                            updateFields.convertedToClientAt = new Date();
                                        }
                                        if (newStatus || newEntityType) {
                                            try {
                                                await db.update(contacts)
                                                    .set(updateFields as any)
                                                    .where(eq(contacts.id, finalContactId));
                                                console.log(`✅ [KANBAN] ${chat.chatId}: → ${newStatus || currentStatus}`);
                                            } catch (kanbanErr) {
                                                console.error(`❌ [KANBAN] Error:`, kanbanErr);
                                            }
                                        }
                                    }
                                }
                            }

                            // F. SEND & PERSIST ALE'S RESPONSE OR SAVE DRAFT
                            if (resultado.respuesta) {
                                if (botMode === 'co-pilot') {
                                    try {
                                        // Save as a draft for human review
                                        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
                                        
                                        await db.insert(messageSuggestions).values({
                                            chatId: chat.chatId,
                                            suggestedResponse: resultado.respuesta,
                                            contextSnapshot: { source: 'activaqr_brain' },
                                            status: 'pending',
                                            expiresAt
                                        });
                                        console.log(`💡 Co-Pilot: Draft suggestion saved for ${chat.chatId}`);
                                    } catch (draftErr) {
                                        console.error(`❌ Error saving Co-Pilot draft:`, draftErr);
                                    }
                                } else {
                                    try {
                                        console.log(`🤖 Ale responde a ${chat.chatId}: "${resultado.respuesta.substring(0, 60)}..."`);
                                        await whatsappService.sendMessage(chat.chatId, resultado.respuesta);
                                    } catch (sendErr) {
                                        console.error(`❌ Error enviando respuesta WhatsApp:`, sendErr);
                                    }

                                    // Persist response in chat history
                                    if (!FORCE_TESTING_MODE && process.env.DISABLE_MESSAGE_PERSISTENCE !== 'true') {
                                        try {
                                            await db.insert(donnaChatMessages).values({
                                                chatId: chat.chatId,
                                                role: 'assistant',
                                                content: resultado.respuesta,
                                                platform: chatPlatform as any,
                                                messageTimestamp: new Date(),
                                                metadata: { source: 'activaqr_brain' }
                                            });
                                            console.log(`✅ Ale's response saved to chat history`);
                                        } catch (persistErr) {
                                            console.error(`❌ Error saving Ale's response:`, persistErr);
                                        }
                                    }
                                }
                            }

                            // G. HANDLE TRANSFER
                            if (resultado.transferir && finalContactId) {
                                try {
                                    await db.update(contacts)
                                        .set({ botMode: 'paused' } as any)
                                        .where(eq(contacts.id, finalContactId));
                                    console.log(`🤝 Bot pausado para ${chat.chatId} — transferido a humano`);
                                } catch (transferErr) {
                                    console.error(`❌ Error en transferencia:`, transferErr);
                                }
                            }
                        }

                        // F. Clear ONLY processed IDs from the queue
                        await db.delete(pendingMessagesQueue)
                            .where(inArray(pendingMessagesQueue.id, messageIds));
                        console.log(`🗑️ Cleared ${messageIds.length} messages from queue for ${chat.chatId}`);

                    } catch (e) {
                        console.error(`❌ Batch Error for ${chat.chatId}:`, e);
                        try {
                            if (messageIds && messageIds.length > 0) {
                                await db.update(pendingMessagesQueue)
                                    .set({ 
                                        failedAt: new Date(),
                                        retryCount: sql`retry_count + 1`,
                                        claimedAt: null // Liberar para que otro worker intente
                                    })
                                    .where(inArray(pendingMessagesQueue.id, messageIds));
                                console.log(`🧹 [Error Recovery] Marked ${messageIds.length} messages as failed for retry ${chat.chatId}`);
                            }
                        } catch (cleanupErr) {
                            console.error(`❌ Failed to mark messages as failed for ${chat.chatId}:`, cleanupErr);
                        }
                    }
                }));
            }
        }

            // 4. Refresh TYPING for waiting chats
            typingRefreshChats.map(chat => {
                import('../lib/whatsapp/WhatsAppService').then(({ whatsappService }) => {
                    whatsappService.sendTypingAction(chat.chatId).catch(() => { });
                });
            });

        } catch (error) {
            console.error('Worker Error:', error);
        } finally {
            // Recursive timeout to prevent stacking if a poll takes too long
            setTimeout(processQueue, POLL_INTERVAL_MS);
        }
    }

console.log('👷 Message Worker started (High Concurrency Ready)...');
    processQueue();

    // Inactivity Checker
    async function checkIdleConversations() {
        try {
            const { conversationStates, contacts, contactChannels } = await import('../lib/db/schema');
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            // Fetch states updated in the last 24h but not in the last 10 mins
            const states = await db.select()
                .from(conversationStates)
                .where(and(
                    sql`updated_at >= ${twentyFourHoursAgo.toISOString()}`,
                    sql`updated_at <= ${tenMinsAgo.toISOString()}`
                ));

            for (const state of states) {
                if (!state.data) continue;
                const parsed = typeof state.data === 'string' ? JSON.parse(state.data as string) : state.data;
                const ficha = parsed.ficha || parsed;

                // Condition: the last message was at least 10 minutes ago, Ale is active, no alert sent yet
                if (ficha.sesion?.ultimo_mensaje_at && !ficha.sesion?.alerta_inactividad_enviada) {
                    const lastMsgTime = new Date(ficha.sesion.ultimo_mensaje_at);
                    if (lastMsgTime <= tenMinsAgo) {
                        // Check if botMode is still 'active' in contacts table
                        const [contactRecord] = await db.select({ botMode: contacts.botMode })
                            .from(contacts)
                            .innerJoin(contactChannels, eq(contacts.id, contactChannels.contactId))
                            .where(eq(contactChannels.identifier, state.key))
                            .limit(1);
                        
                        if (contactRecord && contactRecord.botMode === 'active') {
                            // Send WhatsApp notification to César
                            const cleanPhone = state.key.replace(/\D/g, '');
                            const msg = `🚨 *Alerta de Inactividad (Ale)*\n\nEl cliente *${ficha.nombre || state.key}* (Telf: ${state.key}) no ha respondido en más de 10 minutos.\n\n*Rubro:* ${ficha.rubro || 'Desconocido'}\n*Producto:* ${ficha.producto_interes || ficha.producto_detectado || 'Desconocido'}\n*Agente:* ${ficha.agente_activo || 'N/A'}\n\nLlamar directo: +${cleanPhone}\nO chatear: wa.me/${cleanPhone}`;
                            
                            try {
                                const { whatsappService } = await import('../lib/whatsapp/WhatsAppService');
                                await whatsappService.sendMessage('593963410409', msg);
                                console.log(`🚨 Idle alert sent to César for ${state.key}`);
                                
                                // Mark as sent
                                ficha.sesion.alerta_inactividad_enviada = true;
                                await db.update(conversationStates)
                                    .set({ data: JSON.stringify({ ficha }), updatedAt: new Date() })
                                    .where(eq(conversationStates.key, state.key));
                            } catch (e) {
                                console.error(`❌ Failed to send idle alert for ${state.key}:`, e);
                            }
                        } else if (contactRecord && contactRecord.botMode !== 'active') {
                            // If bot is paused, we don't alert, but we mark it to not check again
                            ficha.sesion.alerta_inactividad_enviada = true;
                            await db.update(conversationStates)
                                .set({ data: JSON.stringify({ ficha }), updatedAt: new Date() })
                                .where(eq(conversationStates.key, state.key));
                        }
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error checking idle conversations:", error);
        }
    }

    // Run idle check every minute
    setInterval(checkIdleConversations, 60 * 1000);

    // Auto-Reactivation checker for seen contacts (run every 5 minutes)
    async function checkReactivationConversations() {
        try {
            const { conversationStates, donnaChatMessages, contacts, contactChannels } = await import('../lib/db/schema');
            const { eq, desc, and, sql } = await import('drizzle-orm');
            
            // Check Ecuador time (America/Guayaquil is UTC-5)
            const ecuadorTime = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
            const localHour = ecuadorTime.getHours();
            
            // Limit to Ecuador office/active hours: 8:00 AM to 10:00 PM (22:00)
            if (localHour < 8 || localHour >= 22) {
                console.log(`⏳ [REACTIVATION] Outside sending window (Ecuador local time: ${localHour}:00). Skipping check.`);
                return;
            }

            const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
            const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
            
            // Fetch conversation states updated in the last 24h
            const states = await db.select()
                .from(conversationStates)
                .where(and(
                    sql`updated_at >= ${twentyThreeHoursAgo.toISOString()}`,
                    sql`updated_at <= ${oneHourAgo.toISOString()}`
                ));

            for (const state of states) {
                if (!state.data) continue;
                const parsed = typeof state.data === 'string' ? JSON.parse(state.data as string) : state.data;
                const ficha = parsed.ficha || parsed;

                if (!ficha.sesion) ficha.sesion = {};
                
                // If already sent in this session, skip
                if (ficha.sesion.reactivacion_sticker_enviada) {
                    continue;
                }

                // Check botMode: only reactivate if active
                const [contactRecord] = await db.select({ botMode: contacts.botMode })
                    .from(contacts)
                    .innerJoin(contactChannels, eq(contacts.id, contactChannels.contactId))
                    .where(eq(contactChannels.identifier, state.key))
                    .limit(1);
                
                if (!contactRecord || contactRecord.botMode !== 'active') {
                    continue;
                }

                // Query the last message in the chat history
                const [lastMsg] = await db.select()
                    .from(donnaChatMessages)
                    .where(eq(donnaChatMessages.chatId, state.key))
                    .orderBy(desc(donnaChatMessages.messageTimestamp))
                    .limit(1);

                if (!lastMsg) continue;

                // Reactivate ONLY if the last message was from the assistant (business)
                if (lastMsg.role !== 'assistant') {
                    continue;
                }

                const lastMsgTime = new Date(lastMsg.messageTimestamp);
                const diffMs = Date.now() - lastMsgTime.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                // Check if the time since our last message is between 1 and 23 hours
                if (diffHours >= 1 && diffHours <= 23) {
                    console.log(`🎯 [REACTIVATION] Target found: ${state.key} (Last msg: assistant, ${diffHours.toFixed(2)}h ago)`);
                    
                    // Determine greeting dynamically based on contact name
                    const name = (ficha.nombre || '').trim();
                    const isNameValid = name && name.toLowerCase() !== 'desconocido' && !/^\+?\d+$/.test(name);
                    const greeting = isNameValid ? `¡Hola ${name}! 🎁` : `¡Hola! 🎁`;
                    const bodyText = `${greeting} Para agradecer tu interés, queremos invitarte a nuestros sorteos mensuales de licencias y productos de **ActivaQR** que realizamos exclusivamente por nuestros Estados de WhatsApp.\n\nPara participar, solo guarda nuestro contacto presionando el botón de aquí abajo 👇 y dinos **'Listo'**.`;

                    try {
                        const { whatsappService } = await import('../lib/whatsapp/WhatsAppService');
                        
                        // 1. Send introductory message
                        console.log(`✉️ Sending reactivation text to ${state.key}...`);
                        await whatsappService.sendMessage(state.key, bodyText);

                        // Save text message to history
                        await db.insert(donnaChatMessages).values({
                            chatId: state.key,
                            role: 'assistant',
                            content: bodyText,
                            platform: 'whatsapp',
                            messageTimestamp: new Date(),
                            metadata: { source: 'auto_reactivation_text' }
                        });

                        // Wait 1.5 seconds
                        await new Promise(resolve => setTimeout(resolve, 1500));

                        // 2. Send vCard contact card nativa
                        console.log(`📇 Sending reactivation vCard to ${state.key}...`);
                        const contactPayload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: state.key,
                            type: "contacts",
                            contacts: [
                                {
                                    addresses: [
                                        {
                                            street: "Juan José Peña 1181 y Mercadillo",
                                            city: "Loja",
                                            country: "Ecuador",
                                            type: "WORK"
                                        }
                                    ],
                                    emails: [
                                        {
                                            email: "negocios@cesarreyesjaramillo.com",
                                            type: "WORK"
                                        }
                                    ],
                                    name: {
                                        formatted_name: "César Reyes Jaramillo",
                                        first_name: "César",
                                        last_name: "Reyes Jaramillo"
                                    },
                                    org: {
                                        company: "César Reyes Jaramillo",
                                        title: "Ingeniero comercial"
                                    },
                                    phones: [
                                        {
                                            phone: "+593963410409",
                                            type: "CELL",
                                            wa_id: "593963410409"
                                        }
                                    ],
                                    urls: [
                                        {
                                            url: "https://cesarreyesjaramillo.com",
                                            type: "WORK"
                                        }
                                    ]
                                }
                            ]
                        };

                        const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
                        const accessToken = process.env.META_WA_ACCESS_TOKEN;
                        const axios = (await import('axios')).default;
                        
                        await axios.post(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, contactPayload, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        // Save vCard representation to chat history
                        await db.insert(donnaChatMessages).values({
                            chatId: state.key,
                            role: 'assistant',
                            content: `[Tarjeta de contacto: César Reyes Jaramillo]`,
                            platform: 'whatsapp',
                            messageTimestamp: new Date(),
                            metadata: { source: 'auto_reactivation_vcard' }
                        });

                        // Update state and save
                        ficha.sesion.reactivacion_sticker_enviada = true;
                        await db.update(conversationStates)
                            .set({ data: JSON.stringify({ ficha }), updatedAt: new Date() })
                            .where(eq(conversationStates.key, state.key));

                        console.log(`✅ [REACTIVATION] Successfully sent text and vCard to ${state.key}`);

                    } catch (err) {
                        console.error(`❌ [REACTIVATION] Failed to reactivate ${state.key}:`, err);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error checking reactivation conversations:", error);
        }
    }

    // Run reactivation checker every 5 minutes
    setInterval(checkReactivationConversations, 5 * 60 * 1000);
