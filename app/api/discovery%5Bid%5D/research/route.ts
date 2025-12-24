import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { ResearchAgent } from '@/lib/discovery/research-agent';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const leadId = params.id;

        // 1. Fetch the lead data
        const lead = await db.query.discoveryLeads.findFirst({
            where: eq(discoveryLeads.id, leadId),
        });

        if (!lead) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        // 2. Run the research
        const agent = new ResearchAgent();
        const report = await agent.researchBusiness({
            businessName: lead.businessName,
            businessType: lead.businessType || undefined,
            representative: lead.representative || undefined,
            city: lead.city || undefined,
            phone1: lead.phone1 || undefined,
            phone2: lead.phone2 || undefined,
        });

        // 3. Update the lead with the research data
        await db
            .update(discoveryLeads)
            .set({
                researchData: report,
                status: 'investigated',
                updatedAt: new Date(),
            })
            .where(eq(discoveryLeads.id, leadId));

        return NextResponse.json({ success: true, report });
    } catch (error) {
        console.error('Error researching discovery lead:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
