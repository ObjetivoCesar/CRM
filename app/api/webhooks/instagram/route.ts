import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, and, eq } from "drizzle-orm";
import {
  contacts,
  contactChannels,
  interactions,
  systemSettings,
} from "@/lib/db/schema";

/**
 * Instagram Webhook Endpoint (Meta Graph API)
 */

// HANDLE VERIFICATION (GET)
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const VERIFY_TOKEN =
    process.env.INSTAGRAM_VERIFY_TOKEN || "objetivo_instagram_secret";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Instagram Webhook Verified");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

import { cortexRouter } from "@/lib/donna/services/CortexRouterService";
import { messagingService } from "@/lib/messaging/MessagingService";

// HANDLE MESSAGES AND COMMENTS (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "instagram" && body.object !== "page") {
      return NextResponse.json(
        { error: "Not an instagram or page object" },
        { status: 400 },
      );
    }

    const platform = body.object === "page" ? "facebook" : "instagram";
    const entry = body.entry?.[0];
    if (!entry) return NextResponse.json({ ok: true });

    let senderId = "";
    let text = "";
    let externalId = "";
    let isEcho = false;
    let type = platform; // "instagram" or "facebook"
    let metadata: any = { platform };

    // 1. EXTRACT DATA BASED ON EVENT TYPE
    if (entry.messaging) {
      const messagingEvent = entry.messaging[0];
      if (!messagingEvent.message) return NextResponse.json({ ok: true });

      senderId = messagingEvent.sender.id;
      text = messagingEvent.message.text;
      externalId = messagingEvent.message.mid;
      isEcho = messagingEvent.message.is_echo;
      type = platform;
    } else if (entry.changes) {
      const change = entry.changes[0];
      if (change.field !== "comments") return NextResponse.json({ ok: true });

      const commentData = change.value;
      // Skip if it's a deletion or if it doesn't have text
      if (change.value.verb === "remove" || !commentData.text)
        return NextResponse.json({ ok: true });

      senderId = commentData.from.id;
      text = commentData.text;
      externalId = commentData.id;
      type = `${platform}_comment`; // "instagram_comment" or "facebook_comment"
      metadata.commentId = externalId;
      metadata.mediaId = commentData.id;
    }

    if (!senderId || isEcho) {
      return NextResponse.json({ ok: true });
    }

    // 🔄 ANTI-LOOP: Skip comments/messages from our own Business Account
    try {
      const [config] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, `${platform}_config`))
        .limit(1);
      const ourAccountId = (config?.value as any)?.[`${platform}UserId`];
      if (ourAccountId && senderId === ourAccountId) {
        console.log(`🔄 Ignoring event from our own ${platform} account (${senderId}) — skipping loop.`);
        return NextResponse.json({ ok: true });
      }
    } catch (e) { /* non-blocking */ }

    console.log(`📸 Webhook [${platform}]: ${type} from ${senderId}`);

    // 2. IDEMPOTENCY CHECK
    if (externalId) {
      try {
        await db.execute(sql`
          INSERT INTO "webhook_events_processed" ("provider", "external_id") 
          VALUES (${platform}, ${String(externalId)})
        `);
      } catch (e) {
        console.warn(`[${platform}] Skipping duplicate event: ${externalId}`);
        return NextResponse.json({ ok: true });
      }
    }

    // 3. IDENTITY RESOLUTION (Basic Ghost Creation)
    // We do this here to ensure the CRM UI shows the user immediately.
    const [channelMatch] = await db
      .select()
      .from(contactChannels)
      .where(
        and(
          eq(contactChannels.platform, platform as any),
          eq(contactChannels.identifier, senderId),
        ),
      )
      .limit(1);

    if (channelMatch) {
      await db.update(contacts)
        .set({ 
          lastActivityAt: new Date(), 
          unreadCount: sql`${contacts.unreadCount} + 1` 
        } as any)
        .where(eq(contacts.id, channelMatch.contactId));
    } else {
      try {
        const platformPrefix = platform === "facebook" ? "FB" : "IG";
        const [newGhost] = await db.insert(contacts).values({
          businessName: `${platformPrefix} User`,
          contactName: `${platformPrefix}_${senderId.slice(-4)}`,
          status: "lead",
          source: `${platform}_inbound`,
          channelSource: platform,
          entityType: "lead",
          lastActivityAt: new Date(),
          unreadCount: 1,
        } as any).returning();

        await db.insert(contactChannels).values({
          contactId: newGhost.id,
          platform: platform as any,
          identifier: senderId,
          isPrimary: true,
        });
      } catch (err) { console.error(`Error creating ghost contact:`, err); }
    }

    // 4. PUSH TO ASYNC QUEUE (The Worker will handle CortexRouter and Persistence)
    const { pendingMessagesQueue } = await import("@/lib/db/schema");
    await db.insert(pendingMessagesQueue).values({
      chatId: senderId,
      content: text || "[Media/Attachment]",
      platform: type, // Store granular type (e.g., instagram_comment)
      metadata: { ...metadata, externalId },
      receivedAt: new Date(),
    });

    // 5. IMMEDIATE "FAST" RESPONSE (Special Case for Comments)
    if (type.includes("comment") && externalId) {
      // Non-blocking fire-and-forget for the "Thank you" reply
      messagingService.replyToComment(
        platform as any,
        externalId,
        "¡Gracias por tu comentario! Nos contactaremos enseguida. 🙌"
      ).catch(err => console.error("❌ Comment auto-reply error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Instagram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
