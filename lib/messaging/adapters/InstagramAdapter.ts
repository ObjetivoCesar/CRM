import { IMessagingAdapter } from "../interfaces";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class InstagramAdapter implements IMessagingAdapter {
  providerId = "instagram";

  private _accessToken: string | null = null; // null = not loaded yet
  private baseURL: string;

  constructor() {
    this.baseURL = "https://graph.facebook.com/v19.0";
    // Do NOT call async init here — it creates a race condition.
    // Token is loaded lazily on first use via getToken().
  }

  /** Lazy token loader — guarantees token is ready before any API call */
  private async getToken(): Promise<string> {
    if (this._accessToken !== null) return this._accessToken;

    // 1. Priority: Environment Variable (Standard for Vercel/Render)
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      this._accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      console.log("🔌 InstagramAdapter: Token loaded from Environment: FOUND");
      return this._accessToken;
    }

    // 2. Fallback: Database Configuration
    try {
      const [dbConfig] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "instagram_config"))
        .limit(1);

      if (dbConfig?.value && (dbConfig.value as any).accessToken) {
        this._accessToken = (dbConfig.value as any).accessToken;
        console.log("🔌 InstagramAdapter: Token loaded from Database");
      } else {
        console.warn("🔌 InstagramAdapter: Token MISSING in Env and Database");
        this._accessToken = "";
      }
    } catch (e) {
      console.error("❌ InstagramAdapter: Error loading token from DB:", e);
      this._accessToken = "";
    }

    return this._accessToken as string;
  }

  private async getInstagramUserId(): Promise<string | null> {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const [dbConfig] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "instagram_config"))
        .limit(1);
      if (dbConfig?.value && (dbConfig.value as any).instagramUserId) {
        return (dbConfig.value as any).instagramUserId;
      }

      // Fetch from Meta: Get the Instagram Business Account ID linked to the Page
      const pagesRes = await fetch(
        `${this.baseURL}/me/accounts?fields=instagram_business_account&access_token=${token}`,
      );
      const pagesData = await pagesRes.json();

      const igUserId = pagesData.data?.[0]?.instagram_business_account?.id;

      if (igUserId) {
        const currentConfig = (dbConfig?.value as any) || {};
        await db
          .update(systemSettings)
          .set({ value: { ...currentConfig, instagramUserId: igUserId } })
          .where(eq(systemSettings.key, "instagram_config"));
        return igUserId;
      }
    } catch (e) {
      console.error("❌ InstagramAdapter: Error resolving IG User ID:", e);
    }
    return null;
  }

  async sendMessage(
    to: string,
    text: string,
    metadata?: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = await this.getToken();
    const igUserId = await this.getInstagramUserId();

    if (!token)
      return { success: false, error: "Instagram Access Token missing" };
    if (!igUserId)
      return {
        success: false,
        error: "Could not resolve Instagram Business Account ID",
      };

    try {
      // Instagram DMs via Messenger API for Instagram
      // Ref: https://developers.facebook.com/docs/messenger-platform/instagram
      const response = await fetch(
        `${this.baseURL}/${igUserId}/messages?access_token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: to },
            message: { text: text },
            messaging_type: "RESPONSE",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        // Error #3 = Missing advanced access / permission scope for DMs
        if (data.error?.code === 3) {
          console.error(
            `❌ InstagramAdapter.sendMessage: App lacks 'instagram_manage_messages' Advanced Access on Meta. Cannot send DMs.`,
            JSON.stringify(data)
          );
        } else {
          console.error(
            `❌ InstagramAdapter.sendMessage failed [${response.status}]:`,
            JSON.stringify(data),
          );
        }
        return {
          success: false,
          error: data.error?.message || "Instagram API Error",
          data,
        };
      }
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ InstagramAdapter.sendMessage threw:", error);
      return { success: false, error: error.message };
    }
  }

  async replyToComment(
    commentId: string,
    text: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = await this.getToken();
    if (!token) {
      console.error(
        "❌ InstagramAdapter.replyToComment: No access token available",
      );
      return { success: false, error: "Instagram Access Token missing" };
    }

    console.log(
      `📤 InstagramAdapter.replyToComment: Posting to /${commentId}/replies`,
    );

    try {
      // Access token must be sent as query param for comment replies
      // NOT as Authorization header — Meta requires this for IG Comment API
      const url = `${this.baseURL}/${commentId}/replies?access_token=${token}`;
      const params = new URLSearchParams({ message: text });
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        // Ignore API error related to duplicate replies on the same comment
        if (data.error?.code === 100 && data.error?.error_subcode === 2207050) {
          console.warn(
            `⚠️ InstagramAdapter.replyToComment: Meta API rejected duplicate reply to comment ${commentId}. Ignoring.`,
          );
          return { success: true, data }; // Consider it a success to stop retries
        }

        // Ignore "response format not supported" — usually means reply already sent
        if (data.error?.error_subcode === 1772107) {
          console.warn(
            `⚠️ InstagramAdapter.replyToComment: Comment ${commentId} already has a reply or format not supported. Ignoring.`,
          );
          return { success: true, data };
        }

        console.error(
          `❌ InstagramAdapter.replyToComment failed [${response.status}]:`,
          JSON.stringify(data),
        );
        return {
          success: false,
          error: data.error?.message || "Instagram API Error",
          data,
        };
      }

      console.log(
        `✅ InstagramAdapter.replyToComment succeeded:`,
        JSON.stringify(data),
      );
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ InstagramAdapter.replyToComment threw:", error);
      return { success: false, error: error.message };
    }
  }

  async createMediaContainer(
    mediaUrl: string,
    caption: string,
    isReel: boolean = false,
  ): Promise<{ success: boolean; creationId?: string; error?: string }> {
    const token = await this.getToken();
    const igUserId = await this.getInstagramUserId();
    if (!igUserId)
      return {
        success: false,
        error: "Could not resolve Instagram Business Account ID",
      };

    try {
      const payload: any = {
        caption,
        access_token: token,
      };

      if (isReel) {
        payload.video_url = mediaUrl;
        payload.media_type = "REELS";
      } else {
        payload.image_url = mediaUrl;
      }

      const response = await fetch(`${this.baseURL}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error?.message };
      return { success: true, creationId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async publishMedia(
    creationId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = await this.getToken();
    const igUserId = await this.getInstagramUserId();
    if (!igUserId)
      return {
        success: false,
        error: "Could not resolve Instagram Business Account ID",
      };

    try {
      const response = await fetch(
        `${this.baseURL}/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: token,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error?.message };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async validateContact(contact: string): Promise<boolean> {
    return typeof contact === "string" && contact.length > 5;
  }
}
