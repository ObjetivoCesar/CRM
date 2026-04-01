import { PostingEngine } from "./PostingEngine";
import axios from "axios";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export class MetaAccountSync {
  private static graphApiVersion = "v19.0";
  private static graphUrl = `https://graph.facebook.com/${this.graphApiVersion}`;

  /**
   * Sincroniza las páginas de Facebook y cuentas de Instagram asociadas al token maestro
   */
  static async syncAccounts() {
    const token = await PostingEngine.getMasterToken();
    const results: any[] = [];

    try {
      // 1. Fetch FB Pages
      const pagesRes = await axios.get(`${this.graphUrl}/me/accounts`, {
        params: { access_token: token },
      });

      const pages = pagesRes.data.data || [];

      for (const page of pages) {
        // Upsert FB Page
        const fbAccount = {
          platform: "facebook" as const,
          accountId: page.id,
          accountName: page.name,
          isActive: true,
        };

        const existing = await db
          .select()
          .from(socialAccounts)
          .where(
            and(
              eq(socialAccounts.platform, "facebook"),
              eq(socialAccounts.accountId, page.id)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(socialAccounts)
            .set({ accountName: page.name, updatedAt: new Date() })
            .where(eq(socialAccounts.id, existing[0].id));
          results.push({ ...fbAccount, status: "updated", dbId: existing[0].id });
        } else {
          const inserted = await db.insert(socialAccounts).values(fbAccount).returning();
          results.push({ ...fbAccount, status: "created", dbId: inserted[0].id });
        }

        // 2. Fetch IG Business Account linked to this page
        try {
          const igRes = await axios.get(`${this.graphUrl}/${page.id}`, {
            params: {
              fields: "instagram_business_account{id,name,username}",
              access_token: token,
            },
          });

          const igData = igRes.data.instagram_business_account;
          if (igData) {
            const igAccount = {
              platform: "instagram" as const,
              accountId: igData.id,
              accountName: igData.username || igData.name || `IG: ${page.name}`,
              isActive: true,
            };

            const existingIg = await db
              .select()
              .from(socialAccounts)
              .where(
                and(
                  eq(socialAccounts.platform, "instagram"),
                  eq(socialAccounts.accountId, igData.id)
                )
              )
              .limit(1);

            if (existingIg.length > 0) {
              await db
                .update(socialAccounts)
                .set({ accountName: igAccount.accountName, updatedAt: new Date() })
                .where(eq(socialAccounts.id, existingIg[0].id));
              results.push({ ...igAccount, status: "updated", dbId: existingIg[0].id });
            } else {
              const insertedIg = await db.insert(socialAccounts).values(igAccount).returning();
              results.push({ ...igAccount, status: "created", dbId: insertedIg[0].id });
            }
          }
        } catch (igError) {
          console.error(`Error fetching IG for page ${page.id}:`, igError);
        }
      }

      return { success: true, accounts: results };
    } catch (error: any) {
      console.error("[MetaAccountSync] Sync failed:", error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}
