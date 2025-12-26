import { NextRequest, NextResponse } from 'next/server';
import { commitmentExtractor } from '@/lib/donna/services/CommitmentExtractor';

export async function POST(req: NextRequest) {
    try {
        const { notes } = await req.json();

        if (!notes) {
            return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
        }

        const drafts = await commitmentExtractor.extractFromNotes(notes);

        return NextResponse.json({
            success: true,
            drafts
        });
    } catch (error) {
        console.error('Donna API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
