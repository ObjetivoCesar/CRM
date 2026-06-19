import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db';
import { pendingMessagesQueue } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // General queue stats
        const [stats] = await db.select({
            totalPending: sql<number>`count(*)::int`,
            deadLetters: sql<number>`count(case when retry_count >= 5 then 1 end)::int`,
            zombies: sql<number>`count(case when claimed_at is not null and claimed_at < now() - interval '5 minutes' and retry_count < 5 then 1 end)::int`,
        }).from(pendingMessagesQueue);

        // Fetch all dead letter messages (retryCount >= 5)
        const deadLetterRows = await db.select({
            id: pendingMessagesQueue.id,
            chatId: pendingMessagesQueue.chatId,
            content: pendingMessagesQueue.content,
            retryCount: pendingMessagesQueue.retryCount,
            receivedAt: pendingMessagesQueue.receivedAt,
            failedAt: pendingMessagesQueue.failedAt,
        })
            .from(pendingMessagesQueue)
            .where(sql`retry_count >= 5`)
            .orderBy(desc(pendingMessagesQueue.receivedAt));

        // Group live pending by chatId
        const pendingByChatId = await db.select({
            chatId: pendingMessagesQueue.chatId,
            count: sql<number>`count(*)::int`,
            maxRetry: sql<number>`max(retry_count)::int`,
            oldestAt: sql<string>`min(received_at)`,
        })
            .from(pendingMessagesQueue)
            .where(sql`retry_count < 5`)
            .groupBy(pendingMessagesQueue.chatId)
            .orderBy(desc(sql`count(*)`));

        return NextResponse.json({
            summary: {
                totalPending: stats?.totalPending || 0,
                deadLetters: stats?.deadLetters || 0,
                zombies: stats?.zombies || 0,
            },
            pendingByChatId,
            deadLetterRows,
        });
    } catch (error: any) {
        console.error('Error fetching queue health:', error);
        return NextResponse.json({ error: 'Failed to fetch queue health', details: error.message }, { status: 500 });
    }
}
