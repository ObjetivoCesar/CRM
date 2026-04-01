import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialAccounts, socialPosts } from "@/lib/db/schema";
import { MetaAccountSync } from "@/lib/marketing/MetaAccountSync";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const accounts = await db.select().from(socialAccounts).where(eq(socialAccounts.isActive, true));
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Sincronizar cuentas desde Meta
    const result = await MetaAccountSync.syncAccounts();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
