import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiTrainingLogs, messageSuggestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/conversations/[id]/training-feedback
 * Logs the result of a Co-Pilot suggestion (approved / edited / discarded).
 *
 * Body:
 * {
 *   suggestionId: string,
 *   originalAiResponse: string,
 *   action: 'approved' | 'edited' | 'discarded',
 *   humanCorrectedResponse?: string,   // Only if action === 'edited'
 *   correctionReason?: 'context' | 'tone' | 'wrong_info', // Only if action === 'edited'
 * }
 */
export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id: chatId } = params;
        const body = await req.json();
        const { suggestionId, originalAiResponse, action, humanCorrectedResponse, correctionReason } = body;

        if (!suggestionId || !originalAiResponse || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Update suggestion status
        const newStatus = action === 'approved' ? 'approved' : action === 'edited' ? 'edited' : 'discarded';
        await db
            .update(messageSuggestions)
            .set({ status: newStatus as any, updatedAt: new Date() })
            .where(eq(messageSuggestions.id, suggestionId));

        // 2. Log the training data (skip log for pure discards — no learning value)
        if (action !== 'discarded') {
            await db.insert(aiTrainingLogs).values({
                chatId,
                suggestionId,
                originalAiResponse,
                humanCorrectedResponse: action === 'edited' ? humanCorrectedResponse : null,
                wasApproved: action === 'approved',
                correctionReason: action === 'edited' ? correctionReason : null,
                metadata: { action }
            });
            console.log(`🧠 [CO-PILOT] Training log saved for ${chatId}: ${action}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving training feedback:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
