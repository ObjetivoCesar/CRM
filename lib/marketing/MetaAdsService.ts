import { db } from '@/lib/db';
import { systemSettings, campaigns as campaignsTable } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * MetaAdsService: Orchestrates the creation of campaigns, ad sets, and ads
 * targeting Facebook, Instagram, and WhatsApp.
 * 
 * Hierarchy: Campaign -> AdSet -> Ad
 */
export class MetaAdsService {
    private baseURL: string = 'https://graph.facebook.com/v19.0';
    private accessToken: string = '';
    private adAccountId: string = '';

    private async initialize() {
        try {
            const [igConfig] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'instagram_config')).limit(1);
            if (igConfig?.value) {
                const val = igConfig.value as any;
                this.accessToken = val.accessToken;
                this.adAccountId = val.adAccountId; // User needs to configure this in settings
            }
        } catch (e) {
            console.error('MetaAdsService Init Error:', e);
        }
    }

    /**
     * Creates a high-level Campaign
     */
    async createCampaign(params: {
        name: string;
        objective: 'OUTCOME_TRAFFIC' | 'OUTCOME_SALES' | 'OUTCOME_MESSAGES' | 'OUTCOME_ENGAGEMENT';
        dailyBudget?: number; // in cents
    }) {
        await this.initialize();
        if (!this.accessToken || !this.adAccountId) {
            throw new Error('Meta Ads Configuration missing (accessToken or adAccountId)');
        }

        const payload: any = {
            name: params.name,
            objective: params.objective,
            status: 'PAUSED',
            special_ad_categories: 'NONE',
        };

        if (params.dailyBudget) {
            payload.daily_budget = params.dailyBudget;
        }

        const response = await fetch(`${this.baseURL}/act_${this.adAccountId}/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Meta API Error: Campaign Creation');

        return data.id; // Returns Campaign ID
    }

    /**
     * Creates an Ad Set (Targeting, Placement, Budget)
     * For Click-to-WhatsApp, use destination_type: ['WHATSAPP']
     */
    async createAdSet(params: {
        campaignId: string;
        name: string;
        dailyBudget: number;
        optimizationGoal: 'REPLIES' | 'REACH' | 'IMPRESSIONS' | 'POST_ENGAGEMENT';
        billingEvent: 'IMPRESSIONS';
        targeting: any; // Meta targeting spec
        promotedObject: { page_id: string; whatsapp_number?: string };
    }) {
        await this.initialize();

        const payload = {
            campaign_id: params.campaignId,
            name: params.name,
            daily_budget: params.dailyBudget,
            optimization_goal: params.optimizationGoal,
            billing_event: params.billingEvent,
            targeting: params.targeting,
            promoted_object: params.promotedObject,
            status: 'PAUSED',
        };

        const response = await fetch(`${this.baseURL}/act_${this.adAccountId}/adsets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Meta API Error: AdSet Creation');

        return data.id;
    }

    /**
     * Creates the Ad Creative and the Ad itself
     */
    async createAd(params: {
        adSetId: string;
        name: string;
        creative: any; // Meta Ad Creative object
    }) {
        await this.initialize();

        // Step 1: Create Ad Creative first
        const creativeRes = await fetch(`${this.baseURL}/act_${this.adAccountId}/adcreatives`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: JSON.stringify(params.creative)
        });

        const creativeData = await creativeRes.json();
        if (!creativeRes.ok) throw new Error(creativeData.error?.message || 'Meta API Error: Creative Creation');

        const creativeId = creativeData.id;

        // Step 2: Create the Ad
        const adRes = await fetch(`${this.baseURL}/act_${this.adAccountId}/ads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: JSON.stringify({
                name: params.name,
                adset_id: params.adSetId,
                creative: { creative_id: creativeId },
                status: 'PAUSED'
            })
        });

        const adData = await adRes.json();
        if (!adRes.ok) throw new Error(adData.error?.message || 'Meta API Error: Ad Creation');

        return adData.id;
    }

    /**
     * Helper to create a Click-to-WhatsApp Flow from scratch
     */
    async createClickToWhatsAppFlow(params: {
        name: string;
        budget: number;
        pageId: string;
        messageText: string;
        imageUrl: string;
    }) {
        // 1. Campaign
        const campaignId = await this.createCampaign({
            name: `${params.name} (Campaign)`,
            objective: 'OUTCOME_ENGAGEMENT'
        });

        // 2. AdSet (Engagement -> WhatsApp)
        const adSetId = await this.createAdSet({
            campaignId,
            name: `${params.name} (AdSet)`,
            dailyBudget: params.budget,
            optimizationGoal: 'REPLIES',
            billingEvent: 'IMPRESSIONS',
            targeting: { geo_locations: { countries: ['EC'] } }, // Example: Ecuador
            promotedObject: { page_id: params.pageId }
        });

        // 3. Creative & Ad
        const adId = await this.createAd({
            adSetId,
            name: `${params.name} (Ad)`,
            creative: {
                name: `${params.name} (Creative)`,
                object_story_spec: {
                    page_id: params.pageId,
                    link_data: {
                        message: params.messageText,
                        link: `https://facebook.com/${params.pageId}`,
                        image_url: params.imageUrl,
                        call_to_action: { type: 'WHATSAPP_MESSAGE' }
                    }
                }
            }
        });

        // 4. Save to CRM database
        await db.insert(campaignsTable).values({
            name: params.name,
            type: 'meta_ads',
            externalId: campaignId,
            budget: String(params.budget / 100),
            status: 'active',
            metadata: { campaignId, adSetId, adId, pageId: params.pageId }
        } as any);

        return { campaignId, adSetId, adId };
    }
}

export const metaAdsService = new MetaAdsService();
