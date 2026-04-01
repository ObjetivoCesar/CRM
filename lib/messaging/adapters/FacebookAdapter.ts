import { IMessagingAdapter } from "../interfaces";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class FacebookAdapter implements IMessagingAdapter {
  providerId = "facebook";

  private _accessToken: string | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL = "https://graph.facebook.com/v19.0";
  }

  private async getToken(): Promise<string> {
    if (this._accessToken !== null) return this._accessToken;

    try {
      const [dbConfig] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "facebook_config"))
        .limit(1);
      if (dbConfig?.value && (dbConfig.value as any).accessToken) {
        this._accessToken = (dbConfig.value as any).accessToken;
        console.log("🔌 FacebookAdapter: Token loaded from Database");
      } else {
        this._accessToken = process.env.FACEBOOK_ACCESS_TOKEN || "";
        console.log(
          "🔌 FacebookAdapter: Token loaded from Environment:",
          this._accessToken ? "FOUND" : "MISSING",
        );
      }
    } catch (e) {
      console.error("❌ FacebookAdapter: Error loading token:", e);
      this._accessToken = process.env.FACEBOOK_ACCESS_TOKEN || "";
    }

    return this._accessToken as string;
  }

  private async getPageId(): Promise<string | null> {
    const token = await this.getToken();
    if (!token) return null;

    try {
      const [dbConfig] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "facebook_config"))
        .limit(1);
      if (dbConfig?.value && (dbConfig.value as any).facebookPageId) {
        return (dbConfig.value as any).facebookPageId;
      }

      // Fetch from Meta: Get the Page ID
      const pagesRes = await fetch(
        `${this.baseURL}/me?fields=id,name&access_token=${token}`,
      );
      const pagesData = await pagesRes.json();

      const pageId = pagesData.id;

      if (pageId) {
        const currentConfig = (dbConfig?.value as any) || {};
        await db
          .update(systemSettings)
          .set({ value: { ...currentConfig, facebookPageId: pageId } })
          .where(eq(systemSettings.key, "facebook_config"));
        return pageId;
      }
    } catch (e) {
      console.error("❌ FacebookAdapter: Error resolving Page ID:", e);
    }
    return null;
  }

  async sendMessage(
    to: string,
    text: string,
    metadata?: any,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = await this.getToken();
    const pageId = await this.getPageId();

    if (!token)
      return { success: false, error: "Facebook Access Token missing" };
    if (!pageId)
      return { success: false, error: "Could not resolve Facebook Page ID" };

    try {
      const response = await fetch(`${this.baseURL}/${pageId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient: { id: to },
          message: { text: text },
          messaging_type: "RESPONSE",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(
          `❌ FacebookAdapter.sendMessage failed [${response.status}]:`,
          JSON.stringify(data),
        );
        return {
          success: false,
          error: data.error?.message || "Facebook API Error",
          data,
        };
      }
      return { success: true, data };
    } catch (error: any) {
      console.error("❌ FacebookAdapter.sendMessage threw:", error);
      return { success: false, error: error.message };
    }
  }

  async replyToComment(
    commentId: string,
    text: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = await this.getToken();
    if (!token) return { success: false, error: "Facebook Access Token missing" };

    try {
      const url = `${this.baseURL}/${commentId}/comments`; // Facebook uses /comments for replies too
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || "Facebook API Error",
          data,
        };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error("❌ FacebookAdapter.replyToComment threw:", error);
      return { success: false, error: error.message };
    }
  }

  async validateContact(contact: string): Promise<boolean> {
    return typeof contact === "string" && contact.length > 5;
  }
}
