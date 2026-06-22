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
import { messagingService } from "@/lib/messaging/MessagingService";// Helper function to process a single webhook event (message or comment)
async function processSingleEvent(
  platform: string,
  senderId: string,
  text: string | undefined,
  externalId: string,
  type: string,
  metadata: any
) {
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
      return;
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
      return;
    }
  }

  // 3. IDENTITY RESOLUTION (Basic Ghost Creation)
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
    try {
      await messagingService.replyToComment(
        platform as any,
        externalId,
        "¡Gracias por tu comentario! Nos contactaremos enseguida. 🙌"
      );
    } catch (err) {
      console.error("❌ Comment auto-reply error:", err);
    }
  }
}

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
    const entries = body.entry || [];

    for (const entry of entries) {
      // 1. Process Messages (messaging array)
      if (entry.messaging) {
        for (const messagingEvent of entry.messaging) {
          if (!messagingEvent.message) continue;

          const senderId = messagingEvent.sender.id;
          const text = messagingEvent.message.text;
          const externalId = messagingEvent.message.mid;
          const isEcho = messagingEvent.message.is_echo;
          const type = platform;

          if (!senderId || isEcho) continue;

          await processSingleEvent(platform, senderId, text, externalId, type, { platform });
        }
      }

      // 2. Process Comments/Changes (changes array)
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field !== "comments") continue;

          const commentData = change.value;
          // Skip if it's a deletion or if it doesn't have text
          if (change.value.verb === "remove" || !commentData.text) continue;

          const senderId = commentData.from.id;
          const text = commentData.text;
          const externalId = commentData.id;
          const type = `${platform}_comment`; // "instagram_comment" or "facebook_comment"
          const metadata = {
            platform,
            commentId: externalId,
            mediaId: commentData.id
          };

          if (!senderId) continue;

          await processSingleEvent(platform, senderId, text, externalId, type, metadata);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Instagram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
