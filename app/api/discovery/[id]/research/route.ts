import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { ResearchAgent } from '@/lib/discovery/research-agent';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!process.env.GOOGLE_API_KEY) {
            console.error("MISSING GOOGLE_API_KEY");
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
        }

        const { id } = await params;
        console.log(`Starting real-time research for Discovery Lead ID: ${id}`);

        // 1. Fetch Lead Data
        const lead = await db.query.discoveryLeads.findFirst({
            where: eq(discoveryLeads.id, id),
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // 2. Initialize Agent and run research
        const agent = new ResearchAgent();
        const research = await agent.researchBusiness({
            businessName: lead.nombreComercial,
            businessType: (lead.actividadModalidad || lead.clasificacion) || undefined,
            representative: (lead.representanteLegal || lead.personaContacto) || undefined,
            city: lead.canton || undefined,
            province: lead.provincia || undefined
        });

        // 3. Update Database
        await db.update(discoveryLeads)
            .set({
                researchData: research.report,
                bookingInfo: research.bookingInfo,
                googleInfo: research.googleInfo,
                status: 'investigated'
            })
            .where(eq(discoveryLeads.id, id));

        return NextResponse.json({
            success: true,
            report: research.report,
            bookingInfo: research.bookingInfo,
            googleInfo: research.googleInfo
        });

    } catch (error: any) {
        console.error('CRITICAL ERROR in Research API:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate research',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
