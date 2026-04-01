import { db } from '@/lib/db';
import { contacts, events, interactions, tasks, contactChannels, products, leads, quotations } from '@/lib/db/schema';
import { conversationStates, discoveryLeads, donnaChatMessages } from '../../db/schema';
import { messagingService } from '@/lib/messaging/MessagingService';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAIClient, getModelId } from '../../ai/client';
export { getAIClient, getModelId }; // Re-export for DocumentIntelligenceService

import { internalNotificationService } from '@/lib/messaging/services/InternalNotificationService';
import { customerMessagingService } from '@/lib/messaging/services/CustomerMessagingService';
import { alejandraService } from './AlejandraService';
import { transcriptionService } from '../../ai/TranscriptionService';
import { whatsappService, WhatsAppMedia } from '@/lib/whatsapp/WhatsAppService';
import { pdfDocumentService } from './PdfDocumentService';
import { sessionManagerService } from './SessionManagerService';
import { documentIntelligenceService } from './DocumentIntelligenceService';
import { legalBrain } from '../brains/LegalBrain';

const TIMEZONE = 'America/Guayaquil';

/**
 * Cortex Router v2.0: Intelligent Assistant Core
 * Implements "Senior Edition" logic with unified intents and same-day contextual memory.
 */
export class CortexRouterService {
    private promptTemplate: string = '';
    private calendarService: any;

    constructor() {
    }

    private getPromptTemplate(): string {
        if (!this.promptTemplate) {
            try {
                const promptPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', 'cortex_router.md');
                this.promptTemplate = fs.readFileSync(promptPath, 'utf-8');
            } catch (error) {
                console.error('❌ Error loading Cortex Router prompt:', error);
                return 'Eres un asistente útil.'; // Fallback
            }
        }
        return this.promptTemplate;
    }

    private getExpertPrompt(fileName: string): string {
        try {
            const promptPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', fileName);
            return fs.readFileSync(promptPath, 'utf-8');
        } catch (error) {
            console.error(`❌ Error loading expert prompt (${fileName}):`, error);
            return this.getPromptTemplate();
        }
    }

    private getCampaignPrompt(campaign: string): string {
        return this.getExpertPrompt(`${campaign}.md`);
    }

    private async getCalendarService() {
        if (!this.calendarService) {
            const { GoogleCalendarService } = await import('@/lib/google/CalendarService');
            // Explicitly use the user's calendar ID
            this.calendarService = new GoogleCalendarService('objetivo.cesar@gmail.com');
        }
        return this.calendarService;
    }

    // --- MEMORY SYSTEM ---
    private async saveMessage(chatId: string, role: 'user' | 'assistant' | 'system', content: string, platform: 'telegram' | 'whatsapp' | 'instagram' | 'facebook' = 'whatsapp') {
        if (!chatId) return;
        if (process.env.DISABLE_MESSAGE_PERSISTENCE === 'true') {
            console.log(`⏭️ [Memory] Persistence disabled. Skipping save for ${chatId}`);
            return;
        }
        try {
            await db.insert(donnaChatMessages).values({
                chatId,
                role,
                content,
                platform,
                messageTimestamp: new Date(),
                metadata: { platform, source: 'cortex_router' }
            });
        } catch (e) {
            console.error('[Memory] Error saving message (Ignored):', e);
        }
    }

    private async getRecentHistory(chatId: string, limit: number = 10): Promise<string> {
        if (!chatId) return '';

        // Relaxed Filter: Last 4 hours OR Same Day (Ecuador)
        const nowUTC = new Date();
        const nowZoned = toZonedTime(nowUTC, TIMEZONE);

        const startOfToday = new Date(nowZoned);
        try {
            if (!chatId) return '';

            // Relaxed Filter: Last 4 hours OR Same Day (Ecuador)
            const nowUTC = new Date();
            const nowZoned = toZonedTime(nowUTC, TIMEZONE);

            const startOfToday = new Date(nowZoned);
            startOfToday.setHours(0, 0, 0, 0);
            const startOfTodayUTC = fromZonedTime(startOfToday, TIMEZONE);

            const fourHoursAgoUTC = new Date(nowUTC.getTime() - 4 * 60 * 60000);

            // We use the EARLIER of 4 hours ago or start of today to ensure continuity
            const effectiveStartUTC = fourHoursAgoUTC < startOfTodayUTC ? fourHoursAgoUTC : startOfTodayUTC;

            const history = await db.select()
                .from(donnaChatMessages)
                .where(
                    and(
                        eq(donnaChatMessages.chatId, chatId),
                        gte(donnaChatMessages.messageTimestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Only last 24h
                    )
                )
                .orderBy(desc(donnaChatMessages.messageTimestamp))
                .limit(limit);

            if (history.length === 0) return 'Sin historial reciente.';

            return history.reverse().map(msg => {
                const zonedMsgTime = toZonedTime(msg.messageTimestamp, TIMEZONE);
                return `[${format(zonedMsgTime, 'HH:mm')}] ${msg.role === 'user' ? 'User' : 'Donna'}: ${msg.content} `;
            }).join('\n');
        } catch (e) {
            console.warn('⚠️ DB History Error (Ignored):', e);
            return 'Sin historial (DB Error)';
        }
    }

    private async getContext(chatId?: string) {
        if (!chatId) return {};
        try {
            const state = await db.select().from(conversationStates).where(eq(conversationStates.key, chatId)).limit(1);
            if (state.length > 0) {
                try {
                    return JSON.parse(state[0].data as string);
                } catch (e) {
                    return {};
                }
            }
        } catch (dbError) {
            console.warn('⚠️ DB Context Error (Using empty context):', dbError);
            return {};
        }
        return {};
    }

    private async saveContext(chatId: string | undefined, data: any) {
        if (!chatId) return;
        const existing = await db.select().from(conversationStates).where(eq(conversationStates.key, chatId)).limit(1);
        const jsonData = JSON.stringify(data);

        if (existing.length > 0) {
            await db.update(conversationStates).set({ data: jsonData, updatedAt: new Date() }).where(eq(conversationStates.key, chatId));
        } else {
            await db.insert(conversationStates).values({ key: chatId, data: jsonData });
        }
    }

    /**
     * Main Entry Point
     */
    async processInput(input: {
        text: string;
        source: 'cesar' | 'client';
        contactId?: string;
        chatId?: string;
        platform?: 'telegram' | 'whatsapp' | 'instagram' | 'facebook'; // Added facebook support
        skipSave?: boolean; // Avoid redundant saves from webhooks
        onReply?: (text: string) => void;
        promptOverride?: string;
        metadata?: any; // Added generic metadata support
    }): Promise<any> {
        console.log(`🧠 Cortex Router 2.0 processing path: ${input.text.substring(0, 20)}...`);

        const platform = input.platform || (input.source === 'client' ? 'whatsapp' : 'telegram');
        const replyContext = {
            chatId: input.chatId,
            onReply: input.onReply,
            platform,
            source: 'donna'
        };

        const processedText = input.text;

        // Detect Audio Transcription marker
        if (processedText.includes('[Audio Transcrito]:')) {
            console.log(`🎤 Transcription marker found for ${input.chatId}. Audio processing already completed by worker.`);
        }

        // 📂 PDF MEDIA ANALYZER (New Phase 9)
        const media = (input as any).media as WhatsAppMedia | undefined;
        if (media && media.type === 'document' && media.id && media.filename?.toLowerCase().endsWith('.pdf')) {
            console.log('📂 [CortexRouter] PDF Detectado. Iniciando análisis multimodal...');
            try {
                const mediaData = await whatsappService.getMedia(media.id);
                if (mediaData) {
                    const { pdfIntelligenceService } = await import('./PdfIntelligenceService');
                    const pdfContext = await pdfIntelligenceService.extractContextFromPdf(mediaData.buffer, media.filename || 'documento.pdf');
                    console.log('✅ [PdfIntelligence] Análisis completado:', pdfContext.summary);

                    // Almacenar el contexto en la sesión para que el generador de documentos lo use
                    const currentContext = await this.getContext(input.chatId);
                    currentContext.pdf_context = pdfContext;
                    await this.saveContext(input.chatId, currentContext);

                    await this.sendToOriginalChannel(input, replyContext, `📂 He leído el PDF "${media.filename}". Extraje información sobre *${pdfContext.entities.business_name || 'el negocio'}* para usarla en tus documentos.`);
                }
            } catch (err) {
                console.error('❌ [PdfIntelligence] Error procesando PDF:', err);
            }
        }

        if (!input.skipSave) {
            await this.saveMessage(input.chatId || 'system', input.source === 'cesar' ? 'user' : 'user', processedText, platform);
        }

        // --- CONTEXTUAL SESSION INTERCEPTOR ---
        if (input.chatId) {
            const activeSession = await sessionManagerService.getActiveSession(input.chatId);
            if (activeSession) {
                console.log(`🧵 [CortexRouter] Intercepted by active session ${activeSession.id} (${activeSession.status})`);
                return this.handleActiveSession(activeSession, input, replyContext);
            }
        }

        const context = await this.getContext(input.chatId);
        let { contactId } = context;

        // Ensure we use the best available information
        if (input.contactId) {
            contactId = input.contactId;
            context.contact_id = input.contactId;
        }

        // Time Context
        const nowUTC = new Date();
        const nowZoned = toZonedTime(nowUTC, TIMEZONE);

        // 1. Fetch History & Entity Memory (Hybrid Layer)
        const historyLimit = 20;
        const history = await this.getRecentHistory(input.chatId || 'testing', historyLimit);

        // Fetch Detailed Contact Profile (Entity Memory)
        let entityDigest = 'No hay perfil estratégico registrado para este contacto.';
        if (contactId) {
            try {
                const [contactRecord] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
                if (contactRecord) {
                    entityDigest = `
### REPORTE ESTRATÉGICO (MEMORIA DE ENTIDAD)
- Dolores (Pains): ${contactRecord.pains || 'N/A'}
- Objetivos: ${contactRecord.goals || 'N/A'}
- Objeciones: ${contactRecord.objections || 'N/A'}
- Notas: ${contactRecord.notes || 'N/A'}
`.trim();
                }
            } catch (err) {
                console.error('❌ Error fetching Entity Memory:', err);
            }
        }

        // 2. ALEJANDRA: IDENTITY & INTENT CLASSIFICATION + TRANSLATION
        const digest = await alejandraService.identifyAndTranslate(processedText, {
            chatId: input.chatId || 'unknown',
            contactName: context.contact_name,
            businessName: context.business_name,
            source: input.source,
            history: history // Pass history to Alejandra for context
        });

        const { role, intent, digest: internalDigest, needs_clarification, clarification_question, subtype, data: extractedData } = digest;

        // If high ambiguity, Alejandra asks for clarification directly
        if (needs_clarification && clarification_question) {
            console.log(`🙋‍♀️ [Alejandra] Asking for clarification: ${clarification_question}`);
            if (input.source === 'client' && input.chatId) {
                await customerMessagingService.sendHumanizedMessage(input.chatId, clarification_question, replyContext);
            } else if (input.source === 'cesar') {
                await internalNotificationService.notifyCesar(clarification_question, replyContext);
            }
            return { status: 'needs_clarification', response: clarification_question };
        }

        console.log(`🧭 [Alejandra] Role: ${role} | Intent: ${intent} | Digest: "${internalDigest.substring(0, 30)}..."`);

        // 3. Expert Selection Logic
        let promptFile = 'ventas_expert.md'; // Default for public

        // A. Priority: Identity-based persona
        switch (role) {
            case 'cesar':
                promptFile = 'cortex_router.md';
                break;
            case 'abel':
                promptFile = 'abel_expert.md';
                break;
            case 'vendedores':
                promptFile = 'vendedor_expert.md';
                break;
            case 'ventas':
                promptFile = 'ventas_expert.md';
                break;
        }

        // B. Intent Override for Specialized Tasks (Only for authorized roles)
        if (intent !== 'CHAT' && intent !== 'KNOWLEDGE') {
            if (role === 'cesar' || role === 'abel' || role === 'ventas') {
                if (subtype === 'crear' || intent === 'SCHEDULE') promptFile = 'agenda/create_event.md';
                else if (subtype === 'agenda' || intent === 'QUERY_AGENDA') promptFile = 'agenda/query_agenda.md';
                else if (subtype === 'borrar') promptFile = 'agenda/create_event.md'; // Assuming 'borrar' also uses create_event for now, or needs a specific prompt
                else if (intent === 'COTIZACION') {
                    console.log(`📑 [Router] Intent is COTIZACION. Keeping base router to extract parameters.`);
                } else if (intent === 'CONTRATO') {
                    console.log(`📜 [Router] Intent is CONTRATO. Keeping base router to extract parameters.`);
                }
            }
        }

        console.log(`🎯 [Router] Routing to expert: ${promptFile}`);
        let prompt = input.promptOverride || this.getExpertPrompt(promptFile);

        // Fetch Last Action Context
        const lastActionContext = context.lastAction || { intent: 'null', summary: 'null', timestamp: null };
        let timeDiffStr = 'Indefinido';

        if (lastActionContext.timestamp) {
            const lastAt = new Date(lastActionContext.timestamp);
            const seconds = Math.floor((nowUTC.getTime() - lastAt.getTime()) / 1000);

            if (seconds < 60) timeDiffStr = `${seconds} segundos`;
            else if (seconds < 3600) timeDiffStr = `${Math.floor(seconds / 60)} minutos`;
            else timeDiffStr = `${Math.floor(seconds / 3600)} horas`;
        }

        // Fetch Knowledge Base - Use static catalog for all roles (full product pricing context)
        const catalogPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', 'product_catalog.md');
        const kbStr = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, 'utf-8') : 'Catálogo no disponible.';

        // Inject catalog for ALL roles - César also needs to reference prices when logging field visits
        prompt = prompt.replace('{{KNOWLEDGE_BASE}}', kbStr);
        prompt = prompt.replace('{{INTERNAL_DIGEST}}', internalDigest);
        prompt = prompt.replace('{{INPUT}}', internalDigest); // Backwards compatibility for prompts
        prompt = prompt.replace('{{CONTACT_INFO}}', `Nombre: ${context.contact_name || 'Desconocido'}, Empresa: ${context.business_name || 'Desconocida'}`);

        // Inject Entity Memory (Persistent Digest)
        prompt = prompt.replace('{{ENTITY_DIGEST}}', entityDigest);

        // Inject Conversational Memory Placeholders
        prompt = prompt.replace('{{LAST_ACTION}}', lastActionContext.summary || 'null');
        prompt = prompt.replace('{{LAST_ACTION_TIMESTAMP}}', lastActionContext.timestamp ? format(toZonedTime(new Date(lastActionContext.timestamp), TIMEZONE), "yyyy-MM-dd HH:mm:ss") : 'null');
        prompt = prompt.replace('{{TIME_SINCE_LAST_ACTION}}', timeDiffStr);

        // Inject History
        prompt = prompt.replace('{{HISTORY}}', history);

        // Inject Time (Zoned to America/Guayaquil)
        prompt = prompt.replace('{{CURRENT_DATE}}', format(nowZoned, "yyyy-MM-dd"));
        prompt = prompt.replace('{{CURRENT_DAY_NAME}}', format(nowZoned, "EEEE", { locale: es }));
        prompt = prompt.replace('{{CURRENT_TIME}}', format(nowZoned, "HH:mm"));
        prompt = prompt.replace('{{TIME}}', format(nowZoned, "HH:mm")); // Alias for public_donna


        // Ensure JSON mode requirement is met in the prompt for OpenAI compatibility
        if (!prompt.toLowerCase().includes('json')) {
            prompt += `
\n\n## RESPUESTA OBLIGATORIA (FORMATO JSON)
Debes responder SIEMPRE con un objeto JSON válido. 
Estructura:
{
  "intent": "${intent}",
  "data": {
    "response": "Tu respuesta o contenido generado aquí"
  },
  "reasoning": "Breve explicación"
}
`;
        }

        try {
            // Optimized AI Call (FAST model)
            const aiClient = getAIClient('FAST');
            const modelId = getModelId('FAST');

            const response = await aiClient.chat.completions.create({
                model: modelId,
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: internalDigest } // Separate user input
                ],
                temperature: 0,
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0]?.message?.content || "{}";

            let parsed: any = {};
            try {
                parsed = JSON.parse(content);
                // 🛡️ Preserve parameters extracted by Alejandra (like contact_name, interest_tier)
                // if the expert prompt omits them in its JSON output.
                if (extractedData) {
                    parsed.data = { ...extractedData, ...(parsed.data || {}) };
                }
            } catch (e) {
                console.warn('⚠️ [Router] Prompt did not return valid JSON. Falling back to CHAT intent.', e);
                parsed = {
                    intent: 'CHAT',
                    data: { response: content },
                    handover: false
                };
            }

            // --- V3 EXPERT HANDLING (Agenda, Tasks, etc.) ---
            if (parsed.status === 'incomplete' && (parsed.pregunta || parsed.clarification_question)) {
                const question = parsed.pregunta || parsed.clarification_question;
                if (input.source === 'client' && input.chatId) {
                    await customerMessagingService.sendHumanizedMessage(input.chatId, question, replyContext);
                } else if (input.source === 'cesar') {
                    await internalNotificationService.notifyCesar(question, replyContext);
                }
                return { status: 'incomplete', intent: intent, message: question };
            }

            if (parsed.status === 'ready' && (intent === 'SCHEDULE' || subtype === 'crear') && parsed.evento) {
                // Here we would call the actual Calendar Service
                const confirmation = `✅ ¡Entendido! He agendado: *${parsed.evento.titulo}* para el ${parsed.evento.fecha} a las ${parsed.evento.hora}.`;
                if (input.source === 'client' && input.chatId) {
                    await customerMessagingService.sendHumanizedMessage(input.chatId, confirmation, replyContext);
                } else {
                    await internalNotificationService.notifyCesar(confirmation, replyContext);
                }

                // TODO: Integrate with GoogleCalendarService
                console.log(`📅 [ACTION] Scheduling event:`, parsed.evento);
                return { status: 'ready', intent: intent, data: parsed.evento };
            }

            // --- CLARIFICATION FLOW (Legacy/General) ---
            if (parsed.needs_clarification && parsed.clarification_question) {
                if (input.source === 'client') {
                    await customerMessagingService.sendMessage(input.chatId!, parsed.clarification_question, replyContext);
                } else {
                    await this.sendToOriginalChannel(input, replyContext, parsed.clarification_question);
                }
                return { status: 'needs_clarification', message: parsed.clarification_question };
            }

            // --- FRACTIONATED MESSAGING ---
            if (input.source === 'client' && parsed.intent === 'CHAT') {
                const responseText = parsed.data?.response || parsed.reasoning || '';

                // Normal chat messages (send in fractions if needed, but for now direct)
                await customerMessagingService.sendHumanizedMessage(input.chatId!, responseText, replyContext);

                // 4. --- HANDOVER LOGIC (Automatic Pause) ---
                if (parsed.handover === true || parsed.handover === 'true') {
                    console.log(`🤝 [HANDOVER] Automatic takeover triggered for ${input.chatId}. Pausing bot.`);
                    if (input.chatId) {
                        try {
                            await db.update(contacts)
                                .set({ botMode: 'paused' } as any)
                                .where(sql`id = (SELECT contact_id FROM contact_channels WHERE identifier = ${input.chatId} AND platform = 'whatsapp' LIMIT 1)`);

                            // Notify César via conversion notification
                            await internalNotificationService.notifyConversion(context.contact_name || 'Prospecto', input.chatId, "Toma de control automática (Preguntó precio/detalles)");
                        } catch (err) {
                            console.error('Handover Update Error:', err);
                        }
                    }
                }

                // Logic removed here as it is handled by message_worker.ts (Single Writer Pattern)
                // if (!input.skipSave) {
                //     await this.saveMessage(input.chatId!, 'assistant', responseText, platform);
                // }

                // Update context
                if (input.chatId) {
                    const actionSummary = `${parsed.intent}: ${responseText.substring(0, 30)}...`;
                    await this.saveContext(input.chatId, {
                        ...context,
                        lastAction: {
                            intent: parsed.intent,
                            summary: actionSummary,
                            timestamp: new Date().toISOString()
                        }
                    });
                }

                return { status: 'success', response: responseText };
            }

            // --- ROUTING (For Internal/Telegram commands) ---
            const rawName = parsed.data?.contact_name;
            const isQuery = parsed.intent?.includes('QUERY');

            if (rawName && !input.contactId && !isQuery) {
                const { entityResolver } = await import('./EntityResolverService');
                const { contactId: resolvedId } = await entityResolver.resolve(rawName);
                if (resolvedId) input.contactId = resolvedId;
            }

            // --- SPECIALIZED FLOW (Agenda, Cotizacion, etc.) ---
            await this.routeToTable(parsed, input.contactId, input.text, replyContext, input, history);

            // 🧠 BACK-PROPAGATION: Learning from conversation (Background)
            if (input.contactId && role !== 'cesar' && role !== 'abel') {
                this.enrichProfile(input.contactId, input.text).catch(e => console.error('Enrichment error:', e));
            }

            return {
                status: 'success',
                intent: parsed.intent,
                subtype: parsed.subtype,
                data: parsed.data,
                reasoning: parsed.reasoning
            };

        } catch (error: any) {
            console.error('❌ Cortex Router Error:', error);
            return { status: 'error', error: error.message };
        }
    }

    private async routeToTable(parsed: any, contactId: string | undefined, originalText: string, replyContext: any, input: any, history: string = '') {
        const { intent, subtype, data } = parsed;
        const context = replyContext; // For backwards compatibility in this method
        console.log(`📍 Action: ${intent} (${subtype})`);

        try {
            switch (intent) {
                case 'SCHEDULE':
                    if (!data.date || !data.time) {
                        await this.sendToOriginalChannel(input, context, `Dale, necesito fecha y hora para agendarlo. ¿Cuándo es?`);
                        return;
                    }

                    const dateTimeStr = `${data.date} ${data.time}`;
                    const startDate = fromZonedTime(dateTimeStr, TIMEZONE);
                    const duration = data.duration_minutes || 60;
                    const endDate = new Date(startDate.getTime() + duration * 60000);

                    const calendar = await this.getCalendarService();
                    const event = await calendar.createEvent(
                        data.title || 'Reunión Agendada',
                        data.notes || `Agendado por Donna. Ref: ${originalText}`,
                        startDate.toISOString(),
                        endDate.toISOString()
                    );

                    await db.insert(events).values({
                        title: data.title || 'Reunión Agendada',
                        description: `Google Link: ${event.htmlLink}`,
                        startTime: startDate,
                        endTime: endDate,
                        contactId: contactId || null,
                        status: 'scheduled',
                        location: data.location || event.hangoutLink || 'Google Meet'
                    });

                    await this.sendToOriginalChannel(input, context,
                        `🗓️ **Agendado con éxito:**\n` +
                        `📌 ${data.title}\n` +
                        `⏰ ${format(startDate, "EEEE d 'de' MMMM, HH:mm", { locale: es })}\n` +
                        `🔗 [Link al evento](${event.htmlLink})`
                    );
                    break;

                case 'TASK':
                    let finalDueDate: Date | null = null;
                    if (data.date) {
                        const timeStr = data.time || "12:00";
                        try {
                            const parsed = fromZonedTime(`${data.date} ${timeStr}`, TIMEZONE);
                            if (!isNaN(parsed.getTime())) {
                                finalDueDate = parsed;
                            } else {
                                const fallback = new Date(`${data.date}T12:00:00`);
                                if (!isNaN(fallback.getTime())) finalDueDate = fallback;
                            }
                        } catch (e) {
                            console.warn('⚠️ [Router] Invalid task date format:', data.date);
                        }
                    }

                    await db.insert(tasks).values({
                        title: data.title || 'Nueva tarea',
                        description: data.notes || originalText,
                        dueDate: finalDueDate,
                        status: 'todo',
                        priority: 'medium',
                        contactId: contactId || null,
                        assignedTo: 'César',
                    });

                    await this.sendToOriginalChannel(input, context, `✅ Tarea/Recordatorio guardado: **${data.title}**`);
                    break;

                case 'QUERY_AGENDA': // Changed from 'QUERY' to 'QUERY_AGENDA' for clarity and consistency
                    const dateInput = data.date;
                    let datesToQuery: string[] = [];
                    if (Array.isArray(dateInput)) datesToQuery = dateInput;
                    else if (typeof dateInput === 'string' && dateInput.trim()) datesToQuery = [dateInput];
                    else {
                        const nowUTC = new Date();
                        const nowZoned = toZonedTime(nowUTC, TIMEZONE);
                        datesToQuery = [format(nowZoned, "yyyy-MM-dd")];
                    }

                    for (const dateStr of datesToQuery) {
                        try {
                            const searchDate = fromZonedTime(`${dateStr} 12:00:00`, TIMEZONE);
                            const baseDate = toZonedTime(searchDate, TIMEZONE);
                            const startOfDay = new Date(baseDate); startOfDay.setHours(0, 0, 0, 0);
                            const endOfDay = new Date(baseDate); endOfDay.setHours(23, 59, 59, 999);

                            await this.sendToOriginalChannel(input, context, `📅 Revisando agenda para el **${format(baseDate, 'PPPP', { locale: es })}**...`);

                            const cal = await this.getCalendarService();
                            const agenda = await cal.listEvents(fromZonedTime(startOfDay, TIMEZONE).toISOString(), fromZonedTime(endOfDay, TIMEZONE).toISOString());

                            if (!agenda || agenda.length === 0) {
                                await this.sendToOriginalChannel(input, context, `✅ Todo libre para el ${format(baseDate, 'EEEE', { locale: es })}.`);
                            } else {
                                const list = agenda.map((e: any) => {
                                    const eventTime = e.start?.dateTime ? format(toZonedTime(new Date(e.start.dateTime), TIMEZONE), 'HH:mm') : 'Todo el día';
                                    return `• ${eventTime}: ${e.summary}`;
                                }).join('\n');
                                await this.sendToOriginalChannel(input, context, `📅 Eventos encontrados:\n\n${list}`);
                            }
                        } catch (err) { console.error(err); }
                    }
                    break;

                case 'CONTACT':
                    if (subtype === 'create') {
                        await db.insert(contacts).values({
                            contactName: data.contact_name || 'Nuevo Contacto',
                            businessName: data.business_name || null,
                            phone: data.phone || null,
                            email: data.email || null,
                            source: 'donna_telegram',
                        });
                        await this.sendToOriginalChannel(input, context, `✅ Contacto **${data.contact_name}** registrado.`);
                    }
                    break;

                case 'SEND_MESSAGE': // Changed from 'SEND' to 'SEND_MESSAGE' for clarity
                    if (contactId && data.notes) {
                        const [c] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
                        if (c?.phone) {
                            await customerMessagingService.sendMessage(c.id, data.notes, { type: 'manual_via_donna' });
                            await this.sendToOriginalChannel(input, context, `📨 WhatsApp enviado a ${c.contactName}.`);
                        }
                    }
                    break;

                case 'COTIZACION':
                case 'PROPUESTA':
                case 'CONTRATO':
                    await this.handleDocumentGeneration(parsed, contactId, originalText, replyContext, input, history);
                    break;

                case 'FINANZA':
                    await this.sendToOriginalChannel(input, context, `💰 **Registro de Finanza:**\n\n${originalText}`);
                    break;

                case 'VENTA':
                    await this.sendToOriginalChannel(input, context, `📊 **Registro de Venta:**\n\n${originalText}`);
                    break;

                case 'RECORRIDO':
                    await this.handleRecorrido(parsed, contactId, originalText, replyContext, input, history);
                    break;

                default:
                    if (input.platform === 'telegram') {
                        await this.sendToOriginalChannel(input, context, `Entiendo, lo proceso enseguida.`);
                    } else {
                        await customerMessagingService.sendMessage(context.chatId!, `Entiendo, lo proceso enseguida.`, context);
                    }
            }
        } catch (error) {
            console.error('❌ Error in routeToTable:', error);
            throw error;
        }
    }

    // --- DELEGATED TO CustomerMessagingService ---

    private async extractDiscoveryLead(chatId: string, text: string, platform: string) {
        if (!text || text.length < 5) return;
        try {
            const aiClient = getAIClient('FAST');
            const modelId = getModelId('FAST');
            const extractionPrompt = `Extract Lead info from: "${text}". Return JSON with {found:bool, name, business, city, email}.`;
            const completion = await aiClient.chat.completions.create({
                model: modelId,
                messages: [{ role: 'user', content: extractionPrompt }],
                temperature: 0,
                response_format: { type: 'json_object' }
            });
            const result = JSON.parse(completion.choices[0].message.content || '{}');

            if (result.found) {
                const existing = await db.select().from(discoveryLeads).where(eq(discoveryLeads.telefonoPrincipal, chatId)).limit(1);
                if (existing.length > 0) {
                    await db.update(discoveryLeads).set({
                        nombreComercial: result.business || existing[0].nombreComercial,
                        personaContacto: result.name || existing[0].personaContacto,
                        canton: result.city || existing[0].canton,
                        correoElectronico: result.email || existing[0].correoElectronico,
                        updatedAt: new Date()
                    }).where(eq(discoveryLeads.id, existing[0].id));
                } else {
                    await db.insert(discoveryLeads).values({
                        telefonoPrincipal: chatId,
                        nombreComercial: result.business || 'Sin Nombre',
                        personaContacto: result.name,
                        canton: result.city,
                        correoElectronico: result.email,
                        sistemaOrigen: 'auto_discovery_chat',
                        status: 'pending'
                    });
                }
            }
        } catch (e) {
            console.error('Lead Extraction Failed:', e);
        }
    }

    private async enrichProfile(contactId: string, text: string) {
        if (!contactId || text.length < 10) return;
        try {
            const enricherPrompt = this.getExpertPrompt('profile_enricher.md');
            const aiClient = getAIClient('FAST');
            const modelId = getModelId('FAST');

            const prompt = enricherPrompt.replace('{notes}', text);

            const response = await aiClient.chat.completions.create({
                model: modelId,
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Analiza el mensaje y devuelve JSON.' }],
                temperature: 0,
                response_format: { type: 'json_object' }
            });

            const result = JSON.parse(response.choices[0]?.message?.content || '{}');

            // Only update fields that have content
            const updateFields: any = {};
            if (result.pains) updateFields.pains = result.pains;
            if (result.goals) updateFields.goals = result.goals;
            if (result.objections) updateFields.objections = result.objections;
            if (result.businessName) updateFields.businessName = result.businessName;

            if (Object.keys(updateFields).length > 0) {
                await db.update(contacts).set(updateFields).where(eq(contacts.id, contactId));
                console.log(`🧠 [Memory] Profile enriched for contact ${contactId}`);
            }
        } catch (e) {
            console.warn('⚠️ Enrichment failed (Ignored):', e);
        }
    }

    private async sendToOriginalChannel(input: any, replyContext: any, text: string, media?: any) {
        // Resolve platform: use input platform or infer from source
        const platform = input.platform || (input.source === 'client' ? 'whatsapp' : 'telegram');
        
        // Helper: Replies on the same channel and number the user originally wrote from
        if (input.chatId) {
            // Enhanced with MessagingService to support multiple adapters
            console.log(`📤 Sending reply to ${input.chatId} via ${platform}`);
            
            await messagingService.send(input.chatId, text, { 
                ...replyContext, 
                platform, 
                media 
            });
        } else {
            // Fallback to Telegram for commands originally from Telegram or system
            await internalNotificationService.notifyCesar(text, replyContext);
        }

        // 📝 LOG ASSISTANT RESPONSE
        // Note: For CHAT intent, message_worker handles this. This part is for 
        // intermediate messages (like "Dame un minuto...") or PDF send confirmation.
        if (input.chatId && text) {
            await this.saveMessage(input.chatId, 'assistant', text, platform as any);
        }
    }

    private async handleRecorrido(parsed: any, contactId: string | undefined, originalText: string, replyContext: any, input: any, history: string = '') {
        const { data } = parsed;
        const businessName = data?.business_name;
        const contactName = data?.contact_name;

        // If no business name was extracted, ask for clarification
        if (!businessName) {
            await this.sendToOriginalChannel(input, replyContext,
                `Entendí que saliste de una visita, pero no capté el nombre del negocio. ¿A qué local visitaste?`
            );
            return;
        }

        // Map interest_level to contacts status
        const interestMap: Record<string, string> = {
            'interested': 'primer_contacto',
            'not_interested': 'no_interesado',
            'maybe': 'primer_contacto',
            'quoted': 'cotizado',
        };
        const status = interestMap[data?.interest_level || 'maybe'] || 'primer_contacto';

        try {
            // Upsert the contact in the 'contacts' table
            const [existing] = await db.select().from(contacts)
                .where(eq(contacts.businessName, businessName))
                .limit(1);

            const contactPayload: any = {
                businessName,
                contactName: contactName || 'Sin nombre',
                entityType: 'lead',
                source: 'recorridos',
                status,
                verbalAgreements: data?.verbal_agreements || originalText,
                interestedProduct: data?.interested_product || null,
                address: data?.location || null,
                updatedAt: new Date(),
            };

            let savedContact;
            if (existing) {
                // Update existing contact
                await db.update(contacts).set(contactPayload).where(eq(contacts.id, existing.id));
                savedContact = { ...existing, ...contactPayload };
                console.log(`🏪 [Recorrido] Updated existing contact: ${businessName}`);
            } else {
                // Create new contact
                const [newContact] = await db.insert(contacts).values({
                    ...contactPayload,
                    createdAt: new Date(),
                }).returning();
                savedContact = newContact;
                console.log(`🏪 [Recorrido] Created new contact: ${businessName}`);
            }

            // Build emoji for interest level
            const interestEmoji: Record<string, string> = {
                'interested': '🟢 Interesado',
                'not_interested': '🔴 No le interesó',
                'maybe': '🟡 Quizás',
                'quoted': '📋 Cotizado',
            };
            const interestLabel = interestEmoji[data?.interest_level || 'maybe'] || '🟡 Sin definir';

            // Send confirmation summary to César
            const summary = `✅ *Recorrido registrado.*\n\n` +
                `🏪 *Negocio:* ${businessName}\n` +
                `👤 *Contacto:* ${contactName || 'No especificado'}\n` +
                `📍 *Ubicación:* ${data?.location || 'No especificada'}\n` +
                `${interestLabel}\n` +
                `🤝 *Acuerdos:* ${data?.verbal_agreements || 'Ninguno especificado'}\n` +
                `🛒 *Interés en:* ${data?.interested_product || 'No especificado'}\n\n` +
                `_¿Hay algo que corregir?_`;

            await this.sendToOriginalChannel(input, replyContext, summary);

            // If quotation or proposal was also requested, trigger it
            if (data?.generate_proposal) {
                console.log('📝 [Recorrido] Proposal requested. Triggering document generation...');
                await this.handleDocumentGeneration(
                    { intent: 'PROPUESTA', data: { ...data, contact_name: contactName, business_name: businessName } },
                    savedContact?.id,
                    originalText,
                    replyContext,
                    input,
                    history
                );
            } else if (data?.generate_quotation) {
                console.log('📋 [Recorrido] Quotation requested. Triggering document generation...');
                await this.handleDocumentGeneration(
                    { intent: 'COTIZACION', data: { ...data, contact_name: contactName, business_name: businessName } },
                    savedContact?.id,
                    originalText,
                    replyContext,
                    input,
                    history
                );
            }

        } catch (error) {
            console.error('❌ [Recorrido] Failed to save:', error);
            await this.sendToOriginalChannel(input, replyContext,
                `Anoté tu recorrido mentalmente, pero hubo un error al guardarlo en la base de datos. Intenta de nuevo o escríbelo con el nombre del negocio claramente.`
            );
        }
    }

    private async handleDocumentGeneration(parsed: any, contactId: string | undefined, originalText: string, replyContext: any, input: any, history: string = '') {
        const intent = parsed.intent;
        const data = parsed.data || {}; // Prevent undefined access during MODIFY_DOC or generic flows
        const contact = contactId ? (await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1))[0] : null;

        // Prefer extracted data over DB context for the specific document
        const contactName = data.contact_name || contact?.contactName || 'Prospecto';
        const businessName = data.business_name || contact?.businessName || 'Negocio';
        const pains = contact?.pains || 'Dolores no identificados aún';
        const plan = data.interest_tier || 'PRO';

        // 1. CEREBRO 1: IDENTIFICADOR DE CATÁLOGO (Product Recognizer)
        // Skip Cerebro 1 if we are in an iterative modify loop (textOverride provided)
        // Skip Cerebro 1 if we ALREADY HAVE recognized products from a session (Phase 10 Fix)
        let productRecognitionResult = null;
        if (data.productos_identificados && Array.isArray(data.productos_identificados) && data.productos_identificados.length > 0) {
            console.log('🧠 [Cerebro 1] Reutilizando productos identificados en la sesión:', data.productos_identificados.length);
            productRecognitionResult = {
                productos_identificados: data.productos_identificados,
                es_claro: true,
                pregunta_clarificacion: null,
                tipo_documento_sugerido: intent as any
            };
        } else if (!parsed.textOverride && (intent === 'COTIZACION' || intent === 'PROPUESTA' || intent === 'CONTRATO')) {
            console.log('🧠 [Cerebro 1] Activando Product Recognizer...');
            try {
                // Fetch historical instructions/corrections (The RAG "Mochila de Experiencia")
                const instructionsHistory = await documentIntelligenceService.getExperiencePack();
                productRecognitionResult = await documentIntelligenceService.recognizeProducts(originalText, instructionsHistory);

                console.log('🧠 [Cerebro 1] Resultado:', JSON.stringify(productRecognitionResult, null, 2));

                if (!productRecognitionResult.es_claro || !productRecognitionResult.productos_identificados.length) {
                    const question = productRecognitionResult.pregunta_clarificacion || 'César, no me queda claro qué producto(s) del catálogo debo cotizar. ¿Podrías ser más específico?';

                    // Start an 'open' session to collect more info
                    if (input.chatId) {
                        await sessionManagerService.createSession(input.chatId, intent, data, contactId);
                        const enhancedQuestion = `${question}\n\n*(He abierto un borrador de ${intent.toLowerCase()} para ir anotando lo que me digas).*`;
                        await this.sendToOriginalChannel(input, replyContext, enhancedQuestion);
                    } else {
                        await this.sendToOriginalChannel(input, replyContext, question);
                    }
                    return; // Stop here, wait for user clarification
                }

                console.log('✅ [Cerebro 1] Productos identificados. Avanzando a generación.');
            } catch (error) {
                console.error('❌ [Cerebro 1] Falló la extracción:', error);
                // Fallback to normal flow if intelligence service throws
            }
        }

        // 2. Generate or Use Text Content
        let docContent = '';

        if (parsed.textOverride) {
            console.log('📝 [DocumentGen] Using text override from session edit.');
            docContent = parsed.textOverride;
        } else if (intent === 'COTIZACION' || intent === 'PROPUESTA' || intent === 'CONTRATO') {
            // 🧠 CEREBRO 2: THE REASONER (Solo si usamos Cerebro 1)
            let chosenFormat: 'COTIZACION' | 'PROPUESTA' | 'CONTRATO' = intent;
            if (productRecognitionResult && productRecognitionResult.productos_identificados.length > 0) {
                console.log('🧠 [Cerebro 2] Activando Estratega de Formato...');
                const reasonerResult = await documentIntelligenceService.determineFormat(originalText, productRecognitionResult);
                chosenFormat = reasonerResult.formato_decidido;
                console.log(`🧠 [Cerebro 2] Decisión: ${chosenFormat} | Razón: ${reasonerResult.razonamiento_interno}`);
            }

            // 📝 Send "processing" message
            let waitingDocName = chosenFormat === 'COTIZACION' ? 'borrador de la cotización' : 'borrador de la propuesta';
            if (chosenFormat === 'CONTRATO') waitingDocName = 'borrador del contrato legal';
            const waitingMsg = `⏳ Dame un minuto, estoy redactando el ${waitingDocName}...`;
            await this.sendToOriginalChannel(input, replyContext, waitingMsg);

            // ✍️ CEREBRO 3: THE PRESENTER
            console.log(`🧠 [Cerebro 3] Generando documento final (${chosenFormat})...`);

            // Re-fetch instructions in case they weren't fetched in Cerebro 1
            const instructionsHistory = await documentIntelligenceService.getExperiencePack();

            docContent = await documentIntelligenceService.generateDocument(
                chosenFormat,
                productRecognitionResult || { productos_identificados: [], es_claro: true, pregunta_clarificacion: null, tipo_documento_sugerido: chosenFormat },
                { contactName, businessName, pains },
                instructionsHistory
            );
            console.log(`✅ [Cerebro 3] Documento generado exitosamente.`);

            // ⚖️ LEGAL BRAIN: AUDIT (Solo para Contratos)
            if (chosenFormat === 'CONTRATO') {
                console.log('⚖️ [LegalBrain] Iniciando auditoría experta...');
                try {
                    const legalReview = await legalBrain.reviewContract(docContent, { contactName, businessName, pains, catalog_products: productRecognitionResult?.productos_identificados });
                    docContent = legalReview.contract_content; // Usar la versión mejorada por el experto legal
                    console.log('✅ [LegalBrain] Auditoría completada. Cláusulas añadidas:', legalReview.suggested_clauses.length);

                    if (legalReview.missing_critical_info.length > 0) {
                        const alert = `⚠️ *Nota Legal:* El consultor jurídico menciona que falta información crítica: ${legalReview.missing_critical_info.join(', ')}.`;
                        await this.sendToOriginalChannel(input, replyContext, alert);
                    }
                } catch (e) {
                    console.error('❌ [LegalBrain] Falló la auditoría:', e);
                }
            }

        } else {
            // Fallback para Contratos (Intent: CONTRATO)
            const catalog = this.getExpertPrompt('product_catalog.md');
            let prompt = this.getExpertPrompt('prompt_contrato_generic.md');

            prompt = prompt.replace(/{{CONTACT_NAME}}/g, contactName);
            prompt = prompt.replace(/{{BUSINESS_NAME}}/g, businessName);
            prompt = prompt.replace(/{{PAINS}}/g, pains);
            prompt = prompt.replace(/{{PRODUCT_CATALOG}}/g, catalog);
            prompt = prompt.replace(/{{HISTORY}}/g, originalText);
            prompt = prompt.replace(/{{REQUESTED_PLAN}}/g, plan);
            prompt = prompt.replace(/{{AGREEMENTS}}/g, originalText);

            // 💰 Inject explicit commercial terms
            const quantity = data.quantity ? String(data.quantity) : 'No especificada';
            const unitPrice = data.unit_price ? `$${data.unit_price}` : 'No especificado';
            const totalPrice = data.total_price
                ? `$${data.total_price}`
                : (data.quantity && data.unit_price ? `$${(data.quantity * data.unit_price).toFixed(2)}` : 'No especificado');
            const paymentTerms = data.payment_terms || 'No especificadas';
            const deliveryDays = data.delivery_days ? `${data.delivery_days} días` : 'No especificado';
            const today = new Date();
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
            const quoteDate = tomorrow.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });

            prompt = prompt.replace(/{{QUANTITY}}/g, quantity);
            prompt = prompt.replace(/{{UNIT_PRICE}}/g, unitPrice);
            prompt = prompt.replace(/{{TOTAL_PRICE}}/g, totalPrice);
            prompt = prompt.replace(/{{PAYMENT_TERMS}}/g, paymentTerms);
            prompt = prompt.replace(/{{DELIVERY_DAYS}}/g, deliveryDays);
            prompt = prompt.replace(/{{DATE}}/g, quoteDate);

            const aiClientGen = getAIClient('STANDARD');
            const modelIdGen = getModelId('STANDARD');

            const waitingMsg = `⏳ Dame un minuto, estoy redactando el borrador del contrato...`;
            await this.sendToOriginalChannel(input, replyContext, waitingMsg);

            const genResponse = await aiClientGen.chat.completions.create({
                model: modelIdGen,
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: 'Por favor redacta el documento basado en nuestra discusión anterior.' }
                ],
                temperature: 0.7
            });

            const rawContent = genResponse.choices[0]?.message?.content || '';

            // 🛡️ Robust Extract
            let cleanText = rawContent.trim();
            if (cleanText.includes('```')) {
                cleanText = cleanText.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim();
            }

            try {
                const parsedContent = JSON.parse(cleanText);
                docContent = parsedContent.data?.response || parsedContent.response || cleanText;
            } catch (e) {
                docContent = cleanText;
            }
        }

        docContent = docContent.replace(/^```markdown\n/m, '').replace(/```$/m, '').trim();

        // 3. Save to DB (Optional for contracts, mandatory for quotations/proposals)
        if ((intent === 'COTIZACION' || intent === 'PROPUESTA') && contactId) {
            await db.update(contacts)
                .set({
                    quotation: docContent,
                    updatedAt: new Date()
                })
                .where(eq(contacts.id, contactId));
        }

        // 4. Generate PDF and Send
        try {
            console.log('📄 [DocumentGen] Rendering PDF...');
            const pdfDocType = (intent === 'COTIZACION' || intent === 'PROPUESTA') ? 'quotation' : 'contract';
            const pdfBuffer = await pdfDocumentService.generatePdf(docContent, pdfDocType, {
                clientName: contactName,
                signerName: "Ing. César Reyes Jaramillo"
            });

            // 5. Upload to Meta (WhatsApp)
            const prefix = intent === 'COTIZACION' ? 'Cotizacion' : (intent === 'PROPUESTA' ? 'Propuesta' : 'Contrato');
            const fileName = `${prefix}_${businessName.replace(/\s+/g, '_')}.pdf`;
            const uploadResult = await whatsappService.uploadMedia(pdfBuffer, fileName, 'application/pdf', 'document');

            if (uploadResult.success && uploadResult.mediaId) {
                const captionText = intent === 'COTIZACION' ? 'borrador de cotización' : (intent === 'PROPUESTA' ? 'borrador de propuesta' : 'contrato');
                const media: WhatsAppMedia = {
                    type: 'document',
                    id: uploadResult.mediaId,
                    filename: fileName,
                    caption: `📄 Aquí tienes el ${captionText} para ${businessName}.`
                };

                // ✅ Always reply on original channel
                await this.sendToOriginalChannel(input, replyContext, '', media);

                // --- SESSION TRANSITION ---
                // If we just sent a PDF, we should be in 'reviewing' state
                if (input.chatId) {
                    const activeSession = await sessionManagerService.getActiveSession(input.chatId);
                    if (activeSession) {
                        await sessionManagerService.setReviewingDocument(activeSession.id, docContent);
                    } else {
                        // Create a new session in 'reviewing' state if it didn't exist
                        const sess = await sessionManagerService.createSession(input.chatId, intent, data, contactId);
                        await sessionManagerService.setReviewingDocument(sess.id, docContent);
                    }

                    const postSendMsg = `¿Qué te parece? ¿Necesitas algún ajuste o damos por cerrada esta sesión?`;
                    await this.sendToOriginalChannel(input, replyContext, postSendMsg);
                }
            } else {
                throw new Error(uploadResult.error || 'Fallo upload a Meta');
            }
        } catch (pdfError: any) {
            console.error('❌ Error en flujo PDF:', pdfError);
            const fallbackMsg = `Generé el texto, pero hubo un error con el PDF: ${pdfError.message}\n\nTexto:\n${docContent}`;
            // ✅ FIX: Fallback text also goes to original channel
            await this.sendToOriginalChannel(input, replyContext, fallbackMsg);
        }
    }

    /**
     * Handles inputs when a session (Drafting/Reviewing) is currently active.
     */
    private async handleActiveSession(session: any, input: any, replyContext: any): Promise<any> {
        const aiClient = getAIClient();
        const modelId = getModelId();

        // 1. EVALUATE NEXT STEP
        const evalPrompt = this.getExpertPrompt('prompt_session_evaluator.md')
            .replace('{{documentType}}', session.documentType)
            .replace('{{sessionStatus}}', session.status)
            .replace('{{collectedData}}', JSON.stringify(session.collectedData || {}, null, 2))
            .replace('{{userInput}}', input.text);

        const evalResponse = await aiClient.chat.completions.create({
            model: modelId,
            messages: [{ role: 'system', content: evalPrompt }],
            response_format: { type: 'json_object' }
        });

        const decisionJson = JSON.parse(evalResponse.choices[0].message.content || '{}');
        const decision = decisionJson.decision;

        console.log(`⚖️ [SessionManager] Decision: ${decision} (${decisionJson.reason})`);

        if (decision === 'GENERATE_NOW') {
            // Build a rich context string from session data so Cerebro 1 gets full product info.
            // ⚠️ Critical: we CANNOT pass input.text (e.g. 'generar') here because Cerebro 1 uses it to
            // identify products. Instead we reconstruct the key commercial context.
            const sd = session.collectedData || {};
            const contextParts: string[] = [];
            if (sd.business_name) contextParts.push(`Negocio: ${sd.business_name}`);
            if (sd.contact_name) contextParts.push(`Cliente: ${sd.contact_name}`);
            if (sd.description) contextParts.push(sd.description);
            if (sd.interested_product) contextParts.push(`Producto: ${sd.interested_product}`);
            if (sd.price || sd.unit_price) contextParts.push(`Precio: $${sd.price || sd.unit_price}`);
            if (sd.notes) contextParts.push(sd.notes);
            // Fallback: stringify all collected data
            const sessionContextText = contextParts.length > 0
                ? contextParts.join('. ')
                : JSON.stringify(sd);

            const richOriginalText = sessionContextText || input.text;
            console.log(`📄 [GENERATE_NOW] Passing session context to DocumentGen: "${richOriginalText.substring(0, 80)}..."`);

            return this.handleDocumentGeneration({
                intent: session.documentType,
                data: session.collectedData
            }, session.contactId, richOriginalText, replyContext, input);
        }

        if (decision === 'CLOSE_SESSION') {
            await sessionManagerService.updateSessionStatus(session.id, 'closed');
            const msg = `✅ Sesión de ${session.documentType} cerrada correctamente.`;
            await this.sendToOriginalChannel(input, replyContext, msg);
            return { status: 'session_closed' };
        }

        if (decision === 'CONTINUE_COLLECTING' || session.status === 'open') {
            // MERGE DATA
            const mergePrompt = this.getExpertPrompt('prompt_session_merge.md')
                .replace('{{documentType}}', session.documentType)
                .replace('{{collectedData}}', JSON.stringify(session.collectedData, null, 2))
                .replace('{{userInput}}', input.text);

            const mergeResponse = await aiClient.chat.completions.create({
                model: modelId,
                messages: [{ role: 'system', content: mergePrompt }],
                response_format: { type: 'json_object' }
            });

            const updatedData = JSON.parse(mergeResponse.choices[0].message.content || '{}');
            await sessionManagerService.updateCollectedData(session.id, updatedData);

            const confirmMsg = `📝 Anotado. Sigo armando tu ${session.documentType.toLowerCase()}. ¿Algo más o la generamos?`;
            await this.sendToOriginalChannel(input, replyContext, confirmMsg);
            return { status: 'collecting' };
        }

        if (decision === 'MODIFY_DOC' && session.status === 'reviewing') {
            // EDIT EXISTING DOCUMENT TEXT
            const editPrompt = this.getExpertPrompt('prompt_session_edit_doc.md')
                .replace('{{documentType}}', session.documentType)
                .replace('{{lastGeneratedText}}', session.lastGeneratedText || '')
                .replace('{{userInput}}', input.text);

            const editResponse = await aiClient.chat.completions.create({
                model: modelId,
                messages: [{ role: 'system', content: editPrompt }]
            });

            const newText = editResponse.choices[0].message.content || '';
            await sessionManagerService.setReviewingDocument(session.id, newText);

            // Re-generate and send PDF
            return this.handleDocumentGeneration({
                intent: session.documentType,
                textOverride: newText // We'll need to update handleDocumentGeneration to accept this
            }, session.contactId, input.text, replyContext, input);
        }

        if (decision === 'OTHER') {
            // Auto-close and let normal routing handle the current message
            await sessionManagerService.updateSessionStatus(session.id, 'closed');
            console.log(`🔌 [SessionManager] Switching to normal routing for unrelated topic.`);
            return this.processInput({ ...input, skipSave: true }); // Avoid double saving
        }

        return { status: 'session_handled' };
    }
}

export const cortexRouter = new CortexRouterService();
