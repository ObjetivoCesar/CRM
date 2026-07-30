import axios from 'axios';
import { db } from '../db';
import { contacts, whatsappLogs, discoveryLeads, interactions, donnaChatMessages } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export interface WhatsAppMedia {
    type: 'image' | 'video' | 'audio' | 'document' | 'contacts';
    url?: string;
    id?: string;
    caption?: string;
    filename?: string;
    contacts?: any[];
}

/**
 * Botón interactivo de tipo "quick reply" (reply button).
 * Meta permite máx. 3 botones por mensaje y 20 caracteres por título.
 */
export interface WhatsAppInteractiveButton {
    id: string;
    title: string;
}

/**
 * Mensaje interactivo tipo "button" (reply buttons).
 * Se envía dentro de la ventana de 24h sin necesidad de template.
 */
export interface WhatsAppInteractive {
    type: 'button';
    bodyText: string;
    buttons: WhatsAppInteractiveButton[];
    footerText?: string;
}

export class WhatsAppService {
    private version: string = 'v21.0';

    constructor() {
        console.log(`📡 WhatsAppService (Meta) Multimedia-Enabled Initialized`);
    }

    private getCredentials() {
        return {
            accessToken: process.env.META_WA_ACCESS_TOKEN || '',
            phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
            verifyToken: process.env.META_WA_VERIFY_TOKEN || ''
        };
    }

    /**
     * Unified method for sending messages (Text, Multimedia or Interactive)
     */
    async sendMessage(
        phone: string,
        text: string,
        metadata: any = {},
        media?: WhatsAppMedia,
        interactive?: WhatsAppInteractive
    ): Promise<any> {
        const { accessToken, phoneNumberId } = this.getCredentials();

        if (!accessToken || !phoneNumberId) {
            console.error('❌ WhatsAppService: Meta Credentials missing');
            return { success: false, error: 'Config missing' };
        }

        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const last9 = cleanPhone.slice(-9);

            const [contact] = await db
                .select()
                .from(contacts)
                .where(sql`${contacts.phone} LIKE ${'%' + last9}`)
                .limit(1);

            if (contact?.whatsappOptOut) {
                console.warn(`🚫 WhatsAppService: Blocked by Opt-Out for ${phone}`);
                return { success: false, error: 'Contact opted out' };
            }

            let payload: any = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone
            };

            if (interactive) {
                // Meta Interactive Message: Reply Buttons (max 3 buttons, 20 chars title)
                payload.type = "interactive";
                payload.interactive = {
                    type: interactive.type,
                    body: { text: interactive.bodyText },
                    action: {
                        buttons: interactive.buttons.map(btn => ({
                            type: 'reply',
                            reply: { id: btn.id, title: btn.title }
                        }))
                    },
                    ...(interactive.footerText ? { footer: { text: interactive.footerText } } : {})
                };
            } else if (media) {
                if (media.type === 'contacts') {
                    payload.type = "contacts";
                    payload.contacts = media.contacts;
                } else {
                    payload.type = media.type;
                    payload[media.type] = {
                        ...(media.id ? { id: media.id } : { link: media.url }),
                        ...(media.caption ? { caption: media.caption } : {}),
                        ...(media.type === 'document' && media.filename ? { filename: media.filename } : {})
                    };
                }
            } else {
                payload.type = "text";
                payload.text = {
                    body: text,
                    preview_url: true
                };
            }

            const url = `https://graph.facebook.com/${this.version}/${phoneNumberId}/messages`;
            const start = Date.now();
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ Meta Response in ${Date.now() - start}ms`);

            try {
                const dbStart = Date.now();
                let contactId = contact?.id || null;
                let discoveryLeadId = null;

                if (!contactId) {
                    const [lead] = await db.select().from(discoveryLeads)
                        .where(sql`${discoveryLeads.telefonoPrincipal} LIKE ${'%' + last9}`)
                        .limit(1);

                    if (lead) {
                        discoveryLeadId = lead.id;
                    } else {
                        const [newContact] = await db.insert(contacts).values({
                            businessName: `WhatsApp ${cleanPhone.slice(-4)}`,
                            contactName: 'Nuevo Contacto (WhatsApp)',
                            phone: cleanPhone,
                            entityType: 'prospect',
                            source: 'whatsapp_outbound',
                            status: 'sin_contacto',
                            outreachStatus: 'new'
                        }).returning();
                        contactId = newContact.id;
                    }
                }

                const logContent = interactive
                ? `[Interactive: ${interactive.type}] ${interactive.bodyText} | Buttons: ${interactive.buttons.map(b => b.title).join(', ')}`
                : media ? `[Multimedia: ${media.type}] ${media.caption || ''}` : text;

                // Fire and forget: Log to interactions (CRM audit trail)
                // Note: donna_chat_messages is now handled by message_worker.ts (Single Writer Pattern)
                db.insert(interactions).values({
                    contactId: contactId,
                    discoveryLeadId: discoveryLeadId,
                    type: 'whatsapp',
                    content: logContent,
                    direction: 'outbound',
                    performedAt: new Date(),
                    createdAt: new Date(),
                    metadata: {
                        source: metadata.source || 'system',
                        data: response.data,
                        media: media || null,
                        interactive: interactive || null
                    }
                }).then(() => {
                    console.log(`🗄️ Interaction logged for ${cleanPhone}`);
                }).catch(err => console.warn('⚠️ Interaction logging error:', err));

                return { success: true, data: response.data };

            } catch (dbError) {
                console.warn('⚠️ Primary DB Resolve failed', dbError);
            }

            return { success: true, data: response.data };
        } catch (error: any) {
            const errorData = error.response?.data?.error || { message: error.message };
            console.error(`❌ Meta WhatsApp error:`, errorData.message);
            return { success: false, error: errorData.message, details: errorData };
        }
    }

    async uploadMedia(fileBuffer: Buffer, fileName: string, mimeType: string, type: string) {
        const { accessToken, phoneNumberId } = this.getCredentials();
        const url = `https://graph.facebook.com/${this.version}/${phoneNumberId}/media`;

        try {
            // SHIM: Fix MIME types for Meta API
            let finalMimeType = mimeType;
            let finalFileName = fileName;

            if (mimeType.includes('vcard') || fileName.toLowerCase().endsWith('.vcf')) {
                finalMimeType = 'text/vcard';
            }

            // Meta is VERY strict about voice notes requiring audio/ogg; codecs=opus
            // and often fails if the extension is not .ogg or .oga
            if (type === 'audio' || mimeType.includes('audio/webm') || mimeType.includes('audio/weba')) {
                finalMimeType = 'audio/ogg; codecs=opus';
                if (!finalFileName.endsWith('.ogg')) {
                    finalFileName = `voice_${Date.now()}.ogg`;
                }
            }

            const formData = new FormData();
            const blob = new Blob([new Uint8Array(fileBuffer)], { type: finalMimeType });
            formData.append('file', blob, finalFileName);
            formData.append('messaging_product', 'whatsapp');
            formData.append('type', type);

            console.log(`📤 [WhatsAppService] Uploading ${type}: ${finalFileName} (${finalMimeType})`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ [WhatsAppService] Meta Upload Failed:', data);
                throw new Error(data.error?.message || 'Upload failed');
            }

            console.log(`✅ [WhatsAppService] Media Uploaded successfully. ID: ${data.id}`);
            return { success: true, mediaId: data.id };
        } catch (error: any) {
            console.error('❌ uploadMedia Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
        const { accessToken } = this.getCredentials();
        console.log(`🔍 [WhatsAppService] Fetching media details for ID: ${mediaId}`);
        try {
            const infoUrl = `https://graph.facebook.com/${this.version}/${mediaId}`;
            const infoRes = await axios.get(infoUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const mediaUrl = infoRes.data.url;
            const mimeType = infoRes.data.mime_type;
            console.log(`📋 [WhatsAppService] Media info for ${mediaId}: Type=${mimeType}, hasUrl=${!!mediaUrl}`);

            if (!mediaUrl) {
                console.warn(`⚠️ [WhatsAppService] No URL found for media ID: ${mediaId}`);
                return null;
            }

            console.log(`📡 [WhatsAppService] Downloading media from Meta CDN...`);
            const downloadRes = await axios.get(mediaUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                responseType: 'arraybuffer'
            });

            console.log(`✅ [WhatsAppService] Download complete. Size: ${downloadRes.data.byteLength} bytes`);
            return {
                buffer: Buffer.from(downloadRes.data),
                mimeType: mimeType
            };
        } catch (error: any) {
            console.error(`❌ [WhatsAppService] Error in getMedia (${mediaId}):`, error.response?.data || error.message);
            return null;
        }
    }

    async sendTemplate(phone: string, templateName: string, languageCode: string = 'es_ES', components: any[] = []): Promise<any> {
        const { accessToken, phoneNumberId } = this.getCredentials();
        const url = `https://graph.facebook.com/${this.version}/${phoneNumberId}/messages`;
        try {
            const payload: any = {
                messaging_product: "whatsapp",
                to: phone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: languageCode }
                }
            };
            if (components.length > 0) payload.template.components = components;

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return { success: true, data: response.data };
        } catch (error: any) {
            const errorData = error.response?.data?.error || { message: error.message };
            return { success: false, error: errorData.message, details: errorData };
        }
    }

    async sendTypingAction(phone: string): Promise<any> {
        const { accessToken, phoneNumberId } = this.getCredentials();
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://graph.facebook.com/${this.version}/${phoneNumberId}/messages`;

        try {
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                sender_action: "typing_on"
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false };
        }
    }
}

export const whatsappService = new WhatsAppService();
