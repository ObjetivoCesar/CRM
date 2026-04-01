import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialPosts, socialAccounts } from "@/lib/db/schema";
import { PostingEngine } from "@/lib/marketing/PostingEngine";
import { eq, and, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // En producción, podrías proteger esto con un CRON_SECRET en los headers
  try {
    const now = new Date();

    // 1. Buscar posts programados que ya deberían haberse publicado
    const pendingPosts = await db
      .select({
        post: socialPosts,
        account: socialAccounts
      })
      .from(socialPosts)
      .innerJoin(socialAccounts, eq(socialPosts.accountId, socialAccounts.id))
      .where(
        and(
          eq(socialPosts.status, "scheduled"),
          lte(socialPosts.scheduledFor, now)
        )
      );

    if (pendingPosts.length === 0) {
      return NextResponse.json({ ok: true, message: "No pending posts to publish." });
    }

    const results = [];

    for (const item of pendingPosts) {
      const { post, account } = item;
      
      // Actualizar a 'publishing' para evitar doble envío si el cron se solapa
      await db.update(socialPosts).set({ status: "publishing" }).where(eq(socialPosts.id, post.id));

      let publishResult: any;
      const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls as string[] : [];

      if (account.platform === "facebook") {
        publishResult = await PostingEngine.publishToFacebook({
          pageId: account.accountId,
          message: post.content || "",
          mediaUrls: mediaUrls
        });
      } else if (account.platform === "instagram") {
        publishResult = await PostingEngine.publishToInstagram({
          igUserId: account.accountId,
          caption: post.content || "",
          mediaUrls: mediaUrls,
          mediaType: post.mediaType as any
        });
      }

      if (publishResult?.success) {
        await db.update(socialPosts).set({
          status: "published",
          metaPostId: publishResult.id,
          updatedAt: new Date()
        }).where(eq(socialPosts.id, post.id));
        results.push({ id: post.id, status: "published" });
      } else {
        await db.update(socialPosts).set({
          status: "failed",
          errorMessage: publishResult?.error || "Unknown error",
          updatedAt: new Date()
        }).where(eq(socialPosts.id, post.id));
        results.push({ id: post.id, status: "failed", error: publishResult?.error });
      }
    }

    return NextResponse.json({ ok: true, processed: results });
  } catch (error: any) {
    console.error("[Cron Publish] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
