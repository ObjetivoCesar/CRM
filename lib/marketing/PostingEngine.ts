import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { socialPosts, socialAccounts, systemSettings } from "@/lib/db/schema";
import axios from "axios";

/**
 * PostingEngine
 *
 * Motor centralizado para manejar la publicación programada e inmediata
 * hacia las plataformas de Meta (Facebook e Instagram).
 */
export class PostingEngine {
  private static graphApiVersion = "v19.0";
  private static graphUrl = `https://graph.facebook.com/${this.graphApiVersion}`;

  /**
   * Obtiene el token maestro guardado por el usuario del sistema "ObjetivoAdmin"
   */
  static async getMasterToken(): Promise<string> {
    const records = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, "INSTAGRAM_ACCESS_TOKEN"))
      .limit(1);

    if (records.length === 0 || !records[0].value) {
      throw new Error("Master Token (INSTAGRAM_ACCESS_TOKEN) not found in system_settings.");
    }
    return records[0].value as unknown as string;
  }

  /**
   * Publica un texto/imagen directamente en una Page de Facebook
   */
  static async publishToFacebook(
    pageId: string,
    message: string,
    mediaUrl?: string
  ) {
    const token = await this.getMasterToken();
    try {
      if (mediaUrl) {
        // Publish photo
        const response = await axios.post(
          `${this.graphUrl}/${pageId}/photos`,
          {
            url: mediaUrl,
            message: message,
            access_token: token,
          }
        );
        return { success: true, id: response.data.id };
      } else {
        // Publish text-only (Feed post)
        const response = await axios.post(
          `${this.graphUrl}/${pageId}/feed`,
          {
            message: message,
            access_token: token,
          }
        );
        return { success: true, id: response.data.id };
      }
    } catch (error: any) {
      console.error("[PostingEngine] Error publishing to FB:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || "Unknown Meta API Error",
      };
    }
  }

  /**
   * Publica una imagen o reel (video) en una cuenta de Instagram Profesional
   * Instagram requiere un ciclo en dos pasos: Contenedor (Container) -> Publicación (Publish)
   */
  static async publishToInstagram(
    igUserId: string,
    caption: string,
    mediaUrl: string,
    mediaType: "IMAGE" | "REELS" = "IMAGE"
  ) {
    const token = await this.getMasterToken();
    try {
      // 1. Create Media Container
      const containerPayload: any = {
        image_url: mediaType === "IMAGE" ? mediaUrl : undefined,
        video_url: mediaType === "REELS" ? mediaUrl : undefined,
        media_type: mediaType === "REELS" ? "REELS" : "IMAGE",
        caption: caption,
        access_token: token,
      };

      const containerRes = await axios.post(`${this.graphUrl}/${igUserId}/media`, containerPayload);
      const containerId = containerRes.data.id;

      // 2. Publish Container
      const publishRes = await axios.post(`${this.graphUrl}/${igUserId}/media_publish`, {
        creation_id: containerId,
        access_token: token,
      });

      return { success: true, id: publishRes.data.id };
    } catch (error: any) {
      console.error("[PostingEngine] Error publishing to IG:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || "Unknown Meta API Error",
      };
    }
  }
}
