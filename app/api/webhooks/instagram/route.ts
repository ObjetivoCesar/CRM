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

    const entry = body.entry?.[0];
    if (!entry) return NextResponse.json({ ok: true });

    let senderId = "";
    let text = "";
    let externalId = "";
    let isEcho = false;
    let type: "instagram" | "instagram_comment" = "instagram";

    // 1. EXTRACT DATA BASED ON EVENT TYPE
    if (entry.messaging) {
      const messagingEvent = entry.messaging[0];
      if (!messagingEvent.message) return NextResponse.json({ ok: true });

      senderId = messagingEvent.sender.id;
      text = messagingEvent.message.text;
      externalId = messagingEvent.message.mid;
      isEcho = messagingEvent.message.is_echo;
      type = "instagram";
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
      type = "instagram_comment";
    }

    if (!senderId || isEcho) {
      return NextResponse.json({ ok: true });
    }

    // 🔄 ANTI-LOOP: Skip comments/messages from our own Instagram Business Account
    try {
      const [igConfig] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "instagram_config"))
        .limit(1);
      const ourIgAccountId = (igConfig?.value as any)?.instagramUserId;
      if (ourIgAccountId && senderId === ourIgAccountId) {
        console.log(
          `🔄 Ignoring event from our own IG account (${senderId}) — skipping to prevent reply loop.`,
        );
        return NextResponse.json({ ok: true });
      }
    } catch (e) {
      /* non-blocking */
    }

    console.log(`📸 Instagram ${type} from ${senderId}: ${text}`);

    // 2. IDEMPOTENCY CHECK
    if (externalId) {
      try {
        await db.execute(sql`
                    INSERT INTO "webhook_events_processed" ("provider", "external_id") 
                    VALUES ('instagram', ${String(externalId)})
                `);
      } catch (e) {
        console.warn(`[Instagram] Skipping duplicate event: ${externalId}`);
        return NextResponse.json({ ok: true });
      }
    }

    // 3. IDENTITY RESOLUTION
    let contactId = null;

    const [channelMatch] = await db
      .select()
      .from(contactChannels)
      .where(
        and(
          eq(contactChannels.platform, "instagram"),
          eq(contactChannels.identifier, senderId),
        ),
      )
      .limit(1);

    if (channelMatch) {
      contactId = channelMatch.contactId;
      // Update existing contact activity
      await db
        .update(contacts)
        .set({
          lastActivityAt: new Date(),
          unreadCount: sql`${contacts.unreadCount} + 1`,
          updatedAt: new Date(),
        } as any)
        .where(eq(contacts.id, contactId));
    } else {
      // Create Ghost Contact
      try {
        const [newGhost] = await db
          .insert(contacts)
          .values({
            businessName: `Instagram User`, // Requerido NOT NULL — se actualiza cuando se identifica
            contactName: `IG_${senderId.slice(-4)}`,
            status: "lead",
            source: "instagram_inbound",
            channelSource: "instagram",
            entityType: "lead",
            lastActivityAt: new Date(),
            unreadCount: 1,
          } as any)
          .returning();

        contactId = newGhost.id;

        await db.insert(contactChannels).values({
          contactId: newGhost.id,
          platform: "instagram",
          identifier: senderId,
          isPrimary: true,
        });
      } catch (err) {
        console.error("Error creating IG ghost contact:", err);
      }
    }

    // 4. SAVE INTERACTION
    await db.insert(interactions).values({
      type: type,
      direction: "inbound",
      content: text,
      contactId: contactId,
      metadata: { platform: "instagram", senderId, externalId },
      performedAt: new Date(),
    });

    // 5. PROCESS WITH CORTEX ROUTER
    // Let's process both as Donna should be able to chime in on comments too.
    await cortexRouter.processInput({
      text: text,
      source: "client",
      chatId: senderId,
      contactId: contactId as any,
      platform: "instagram",
      metadata: { type, externalId },
    });

    // 6. AUTOMATED TEST RESPONSE (Special request: Thank you message for comments)
    if (type === "instagram_comment" && externalId) {
      console.log(`🤖 Attempting to reply to comment: ${externalId}`);
      const replyResult = await messagingService.replyToComment(
        "instagram",
        externalId,
        "¡Gracias por tu comentario! Nos contactaremos enseguida. 🙌",
      );
      if (replyResult?.success) {
        console.log(
          `✅ Comment reply sent successfully:`,
          JSON.stringify(replyResult.data),
        );
      } else {
        console.error(`❌ Comment reply FAILED:`, JSON.stringify(replyResult));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Instagram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
