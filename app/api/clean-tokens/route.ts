import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function GET() {
  try {
    const deleted = await db.delete(systemSettings).where(
      inArray(systemSettings.key, [
        "facebook_config",
        "instagram_config",
        "INSTAGRAM_ACCESS_TOKEN",
        "META_MA_ACCESS_TOKEN",
      ])
    ).returning();
    
    return NextResponse.json({ success: true, message: "Deleted rotten tokens successfully from Supabase", deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
