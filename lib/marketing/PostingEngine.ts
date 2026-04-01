import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { socialPosts, socialAccounts, systemSettings } from "@/lib/db/schema";
import axios from "axios";

/**
 * PostingEngine v2.0
 * 
 * Re-engineered for Meta Graph API compliance. 
 * Supports carousels, native scheduling, and multi-step media containers.
 */
export class PostingEngine {
    private static graphApiVersion = "v19.0";
    private static graphUrl = `https://graph.facebook.com/${this.graphApiVersion}`;

    /**
     * Resolves the access token from the database configuration.
     * Priority: Environment > Database (facebook_config/instagram_config)
     */
    static async getAccessToken(platform: 'facebook' | 'instagram' = 'facebook'): Promise<string> {
        // 1. Ultimate Priority: ENVIRONMENT variable
        // This allows users to override database issues by just updating Render/Vercel secrets.
        const envToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_MA_ACCESS_TOKEN;
        if (envToken) {
            console.log(`🔌 PostingEngine: Using Access Token from Environment for ${platform}`);
            return envToken;
        }

        // 2. Database Fallback (facebook_config / instagram_config)
        const configKey = `${platform}_config`;
        const [record] = await db
            .select({ value: systemSettings.value })
            .from(systemSettings)
            .where(eq(systemSettings.key, configKey))
            .limit(1);

        if (record?.value && (record.value as any).accessToken) {
            return (record.value as any).accessToken;
        }

        // 3. Legacy Database fallback (Case Insensitive or All Caps)
        const [legacy] = await db
            .select({ value: systemSettings.value })
            .from(systemSettings)
            .where(eq(systemSettings.key, "INSTAGRAM_ACCESS_TOKEN"))
            .limit(1);

        if (legacy?.value) return legacy.value as unknown as string;

        throw new Error(`Master Access Token not found in ENV or system_settings for ${platform}.`);
    }

    /**
     * FACEBOOK PUBLISHING
     * Flow 1: Upload media as un-published (if any)
     * Flow 2: Publish /feed with linked media IDs OR just text
     */
    static async publishToFacebook(params: {
        pageId: string;
        message: string;
        mediaUrls?: string[];
        scheduledPublishTime?: number; // Unix Timestamp
    }) {
        const token = await this.getAccessToken('facebook');
        const { pageId, message, mediaUrls, scheduledPublishTime } = params;

        try {
            const isScheduled = !!scheduledPublishTime;
            const commonParams: any = {
                access_token: token,
                published: !isScheduled,
            };
            if (isScheduled) commonParams.scheduled_publish_time = scheduledPublishTime;

            // --- CASE A: MULTIPLE IMAGES (CAROUSEL/ALBUM) ---
            if (mediaUrls && mediaUrls.length > 0) {
                console.log(`📸 Facebook: Uploading ${mediaUrls.length} media items as unpublished containers...`);
                
                const attachedMedia: string[] = [];
                for (const url of mediaUrls) {
                    const uploadRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
                        url,
                        published: false,
                        temporary: true, // Only if we don't want them in library forever
                        access_token: token,
                    });
                    attachedMedia.push(JSON.stringify({ media_fbid: uploadRes.data.id }));
                }

                console.log("🚀 Facebook: Finalizing post with attached_media...");
                const response = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
                    ...commonParams,
                    message,
                    attached_media: attachedMedia,
                });
                return { success: true, id: response.data.id };
            }

            // --- CASE B: TEXT ONLY ---
            const response = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
                ...commonParams,
                message,
            });
            return { success: true, id: response.data.id };

        } catch (error: any) {
            console.error("[PostingEngine FB] Error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || "Meta API Error on Facebook",
            };
        }
    }

    /**
     * INSTAGRAM PUBLISHING
     * Requires 2 steps: Container creation -> Publish
     * Supports: Single Image, Carousel (Sidecar), and Reels.
     */
    static async publishToInstagram(params: {
        igUserId: string;
        caption: string;
        mediaUrls: string[];
        mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    }) {
        const token = await this.getAccessToken('instagram');
        const { igUserId, caption, mediaUrls, mediaType } = params;

        try {
            let containerId = "";

            if (mediaType === 'CAROUSEL' && mediaUrls.length > 1) {
                // --- INSTAGRAM CAROUSEL FLOW ---
                const childrenIds: string[] = [];
                for (const url of mediaUrls) {
                    const childRes = await axios.post(`${this.graphUrl}/${igUserId}/media`, {
                        image_url: url, // Assuming images for carousel now
                        is_carousel_item: true,
                        access_token: token,
                    });
                    childrenIds.push(childRes.data.id);
                }

                const carouselRes = await axios.post(`${this.graphUrl}/${igUserId}/media`, {
                    caption,
                    media_type: 'CAROUSEL',
                    children: childrenIds,
                    access_token: token,
                });
                containerId = carouselRes.data.id;

            } else if (mediaType === 'VIDEO') {
                // --- INSTAGRAM REELS / VIDEO FLOW ---
                const videoRes = await axios.post(`${this.graphUrl}/${igUserId}/media`, {
                    video_url: mediaUrls[0],
                    media_type: 'REELS',
                    caption,
                    access_token: token,
                });
                containerId = videoRes.data.id;
                
                // ⏳ IMPORTANT: For videos, we must wait for Meta to process it before publishing
                console.log(`⏳ IG Video (Container ${containerId}) processing...`);
                await this.pollMediaContainerStatus(containerId, token);

            } else {
                // --- SINGLE IMAGE FLOW ---
                const imageRes = await axios.post(`${this.graphUrl}/${igUserId}/media`, {
                    image_url: mediaUrls[0],
                    caption,
                    access_token: token,
                });
                containerId = imageRes.data.id;
            }

            // FINAL STEP: PUBLISH
            const publishRes = await axios.post(`${this.graphUrl}/${igUserId}/media_publish`, {
                creation_id: containerId,
                access_token: token,
            });

            return { success: true, id: publishRes.data.id };

        } catch (error: any) {
            console.error("[PostingEngine IG] Error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || "Meta API Error on Instagram",
            };
        }
    }

    /**
     * Polls the status of a media container (required for IG Videos)
     */
    private static async pollMediaContainerStatus(containerId: string, token: string, maxAttempts = 12) {
        for (let i = 0; i < maxAttempts; i++) {
            const statusRes = await axios.get(`${this.graphUrl}/${containerId}`, {
                params: { fields: 'status_code', access_token: token }
            });
            const status = statusRes.data.status_code;

            if (status === 'FINISHED') return true;
            if (status === 'ERROR') throw new Error("Meta reported an error processing the media container.");
            
            console.log(`... [IG Poll] Attempt ${i + 1}/${maxAttempts}: Status is ${status}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s between checks
        }
        throw new Error("Timeout waiting for Instagram media processing.");
    }
}
