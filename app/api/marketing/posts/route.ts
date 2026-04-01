import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialPosts } from "@/lib/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query = db.select().from(socialPosts).orderBy(desc(socialPosts.scheduledFor));

    if (status) {
      query.where(eq(socialPosts.status, status as any));
    }

    const posts = await query;
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, content, mediaUrls, mediaType, scheduledFor } = body;

    const newPost = await db.insert(socialPosts).values({
      accountId,
      content,
      mediaUrls,
      mediaType,
      scheduledFor: new Date(scheduledFor),
      status: "scheduled",
    }).returning();

    return NextResponse.json({ success: true, post: newPost[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    await db.delete(socialPosts).where(eq(socialPosts.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
