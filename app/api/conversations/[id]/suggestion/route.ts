import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageSuggestions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/conversations/[id]/suggestion
 * Returns the latest pending (non-expired) draft suggestion for a chat.
 */
export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const [suggestion] = await db
            .select()
            .from(messageSuggestions)
            .where(
                and(
                    eq(messageSuggestions.chatId, id),
                    eq(messageSuggestions.status, 'pending'),
                    sql`${messageSuggestions.expiresAt} > NOW()`
                )
            )
            .orderBy(sql`${messageSuggestions.createdAt} DESC`)
            .limit(1);

        if (!suggestion) {
            return NextResponse.json({ suggestion: null });
        }

        return NextResponse.json({ suggestion });
    } catch (error: any) {
        console.error('Error fetching suggestion:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/conversations/[id]/suggestion
 * Expires all pending suggestions for a chat (called when client sends a new message
 * or when human manually discards the suggestion).
 * Body: { suggestionId?: string, reason?: 'expired' | 'discarded' }
 */
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await req.json().catch(() => ({}));
        const status = body.reason === 'discarded' ? 'discarded' : 'expired';

        // If a specific suggestion ID is provided, expire only that one
        if (body.suggestionId) {
            await db
                .update(messageSuggestions)
                .set({ status: status as any, updatedAt: new Date() })
                .where(
                    and(
                        eq(messageSuggestions.id, body.suggestionId),
                        eq(messageSuggestions.status, 'pending')
                    )
                );
        } else {
            // Expire all pending suggestions for this chat
            await db
                .update(messageSuggestions)
                .set({ status: status as any, updatedAt: new Date() })
                .where(
                    and(
                        eq(messageSuggestions.chatId, id),
                        eq(messageSuggestions.status, 'pending')
                    )
                );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error expiring suggestion:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
