import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, and, eq } from "drizzle-orm";
import {
  contacts,
  contactChannels,
  systemSettings,
  pendingMessagesQueue
} from "@/lib/db/schema";
import { messagingService } from "@/lib/messaging/MessagingService";

/**
 * Unified n8n Bridge Webhook
 * Receives events from n8n (Facebook, Instagram, LinkedIn hub)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, payload } = body;

    console.log(`🌉 n8n Bridge Webhook received event from source: ${source}`);

    if (source === "meta") {
      return handleMetaEvent(payload);
    }

    return NextResponse.json({ ok: true, message: "Source not handled" });
  } catch (error: any) {
    console.error("❌ n8n Bridge Webhook Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

async function handleMetaEvent(body: any) {
  if (body.object !== "instagram" && body.object !== "page") {
    return NextResponse.json({ error: "Not an instagram or page object" }, { status: 400 });
  }

  const platform = body.object === "page" ? "facebook" : "instagram";
  const entry = body.entry?.[0];
  if (!entry) return NextResponse.json({ ok: true });

  let senderId = "";
  let text = "";
  let externalId = "";
  let isEcho = false;
  let type = platform;
  let metadata: any = { platform, via: "n8n_bridge" };

  // 1. EXTRACT DATA (Mirroring existing IG webhook logic)
  if (entry.messaging) {
    const messagingEvent = entry.messaging[0];
    if (!messagingEvent.message) return NextResponse.json({ ok: true });

    senderId = messagingEvent.sender.id;
    text = messagingEvent.message.text;
    externalId = messagingEvent.message.mid;
    isEcho = messagingEvent.message.is_echo;
  } else if (entry.changes) {
    const change = entry.changes[0];
    if (change.field !== "comments") return NextResponse.json({ ok: true });

    const commentData = change.value;
    if (change.value.verb === "remove" || !commentData.text)
      return NextResponse.json({ ok: true });

    senderId = commentData.from.id;
    text = commentData.text;
    externalId = commentData.id;
    type = `${platform}_comment`;
    metadata.commentId = externalId;
  }

  if (!senderId || isEcho) return NextResponse.json({ ok: true });

  // 🔄 ANTI-LOOP
  try {
    const [config] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, `${platform}_config`))
      .limit(1);
    const ourAccountId = (config?.value as any)?.[`${platform}UserId`];
    if (ourAccountId && senderId === ourAccountId) {
      return NextResponse.json({ ok: true, message: "self-loop ignored" });
    }
  } catch (e) {}

  // 2. IDEMPOTENCY
  if (externalId) {
    try {
      await db.execute(sql`
        INSERT INTO "webhook_events_processed" ("provider", "external_id") 
        VALUES (${platform}, ${String(externalId)})
      `);
    } catch (e) {
      return NextResponse.json({ ok: true, message: "duplicate ignored" });
    }
  }

  // 3. IDENTITY & QUEUE
  // Resolve channel
  const [channelMatch] = await db
    .select()
    .from(contactChannels)
    .where(and(eq(contactChannels.platform, platform as any), eq(contactChannels.identifier, senderId)))
    .limit(1);

  if (channelMatch) {
    await db.update(contacts)
      .set({ lastActivityAt: new Date(), unreadCount: sql`${contacts.unreadCount} + 1` } as any)
      .where(eq(contacts.id, channelMatch.contactId));
  } else {
    // Create ghost leading contact
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
  }

  // 4. PUSH TO QUEUE
  await db.insert(pendingMessagesQueue).values({
    chatId: senderId,
    content: text || "[Media]",
    platform: type,
    metadata: { ...metadata, externalId },
    receivedAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
