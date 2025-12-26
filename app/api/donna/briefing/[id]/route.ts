import { NextRequest, NextResponse } from 'next/server';
import { agentBriefingService } from '@/lib/donna/services/AgentBriefingService';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const contactId = params.id;

        if (!contactId) {
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }

        const briefing = await agentBriefingService.generateBriefing(contactId);

        if (!briefing) {
            return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            briefing
        });
    } catch (error) {
        console.error('Donna Briefing API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
