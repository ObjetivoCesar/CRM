
import { IMessagingAdapter } from '../interfaces';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class InstagramAdapter implements IMessagingAdapter {
    providerId = 'instagram';

    private accessToken: string = '';
    private baseURL: string;

    constructor() {
        this.baseURL = 'https://graph.facebook.com/v19.0';
        this.initialize();
    }

    private async initialize() {
        // Try DB first
        try {
            const [dbConfig] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'instagram_config')).limit(1);
            if (dbConfig?.value && (dbConfig.value as any).accessToken) {
                this.accessToken = (dbConfig.value as any).accessToken;
                console.log('🔌 InstagramAdapter: Using token from Database');
            } else {
                this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
                if (this.accessToken) console.log('🔌 InstagramAdapter: Using token from Environment');
            }
        } catch (e) {
            this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
        }
    }

    private async getInstagramUserId(): Promise<string | null> {
        if (!this.accessToken) await this.initialize();
        if (!this.accessToken) return null;

        try {
            const [dbConfig] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'instagram_config')).limit(1);
            if (dbConfig?.value && (dbConfig.value as any).instagramUserId) {
                return (dbConfig.value as any).instagramUserId;
            }

            // Fetch from Meta: We need the Instagram Business Account ID linked to the Page
            // Step 1: Get pages
            const pagesRes = await fetch(`${this.baseURL}/me/accounts?fields=instagram_business_account&access_token=${this.accessToken}`);
            const pagesData = await pagesRes.json();
            
            const igUserId = pagesData.data?.[0]?.instagram_business_account?.id;

            if (igUserId) {
                const currentConfig = (dbConfig?.value as any) || {};
                await db.update(systemSettings)
                    .set({ value: { ...currentConfig, instagramUserId: igUserId } })
                    .where(eq(systemSettings.key, 'instagram_config'));
                return igUserId;
            }
        } catch (e) {
            console.error('❌ InstagramAdapter: Error resolving IG User ID:', e);
        }
        return null;
    }

    async sendMessage(to: string, text: string, metadata?: any): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!this.accessToken) await this.initialize();
        if (!this.accessToken) return { success: false, error: 'Instagram Access Token missing' };

        try {
            const response = await fetch(`${this.baseURL}/me/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    recipient: { id: to },
                    message: { text: text },
                    messaging_type: 'RESPONSE'
                })
            });

            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error?.message || 'Instagram API Error', data };
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async replyToComment(commentId: string, text: string): Promise<{ success: boolean; data?: any; error?: string }> {
        if (!this.accessToken) await this.initialize();
        if (!this.accessToken) return { success: false, error: 'Instagram Access Token missing' };

        try {
            const response = await fetch(`${this.baseURL}/${commentId}/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error?.message || 'Instagram API Error', data };
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async createMediaContainer(mediaUrl: string, caption: string, isReel: boolean = false): Promise<{ success: boolean; creationId?: string; error?: string }> {
        const igUserId = await this.getInstagramUserId();
        if (!igUserId) return { success: false, error: 'Could not resolve Instagram Business Account ID' };

        try {
            const payload: any = {
                caption,
                access_token: this.accessToken
            };

            if (isReel) {
                payload.video_url = mediaUrl;
                payload.media_type = 'REELS';
            } else {
                payload.image_url = mediaUrl;
            }

            const response = await fetch(`${this.baseURL}/${igUserId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error?.message };
            return { success: true, creationId: data.id };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async publishMedia(creationId: string): Promise<{ success: boolean; data?: any; error?: string }> {
        const igUserId = await this.getInstagramUserId();
        if (!igUserId) return { success: false, error: 'Could not resolve Instagram Business Account ID' };

        try {
            const response = await fetch(`${this.baseURL}/${igUserId}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: creationId,
                    access_token: this.accessToken
                })
            });

            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error?.message };
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    async validateContact(contact: string): Promise<boolean> {
        return typeof contact === 'string' && contact.length > 5;
    }
}
