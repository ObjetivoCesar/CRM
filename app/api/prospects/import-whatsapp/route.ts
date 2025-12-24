import { db, schema } from '@/lib/db';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

// WhatsApp App Lead format
interface WhatsAppLead {
    id: string;
    nombreComercial: string;
    personaContacto: string;
    telefonoPrincipal: string;
    status: 'pending' | 'initial_sent' | 'responded' | 'not_interested' | 'converted' | 'contacted' | 'no_whatsapp';
    lastInteractionNote?: string;
}

export async function POST(req: Request) {
    try {
        const whatsappLeads: WhatsAppLead[] = await req.json();

        if (!Array.isArray(whatsappLeads)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let updatedCount = 0;
        let notFoundCount = 0;

        // Update prospects based on WhatsApp app status
        for (const lead of whatsappLeads) {
            // Find prospect by business name and contact name
            const prospects = await db
                .select()
                .from(schema.prospects)
                .where(eq(schema.prospects.businessName, lead.nombreComercial));

            if (prospects.length === 0) {
                notFoundCount++;
                continue;
            }

            const prospect = prospects[0];

            // Map WhatsApp status to CRM outreach status
            let outreachStatus = prospect.outreachStatus;
            let whatsappStatus = prospect.whatsappStatus;

            if (lead.status === 'initial_sent') {
                outreachStatus = 'contacted';
                whatsappStatus = 'sent';
            } else if (lead.status === 'responded') {
                outreachStatus = 'responded';
            } else if (lead.status === 'not_interested') {
                outreachStatus = 'not_interested';
            } else if (lead.status === 'converted') {
                outreachStatus = 'converted_to_lead';
            } else if (lead.status === 'no_whatsapp') {
                whatsappStatus = 'failed';
            }

            // Update prospect
            await db
                .update(schema.prospects)
                .set({
                    outreachStatus,
                    whatsappStatus,
                    whatsappSentAt: lead.status === 'initial_sent' ? new Date() : prospect.whatsappSentAt,
                    notes: lead.lastInteractionNote
                        ? `${prospect.notes || ''}\n\nWhatsApp: ${lead.lastInteractionNote}`
                        : prospect.notes,
                    updatedAt: new Date(),
                })
                .where(eq(schema.prospects.id, prospect.id));

            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            notFound: notFoundCount,
            total: whatsappLeads.length,
        });
    } catch (error) {
        console.error('Error importing from WhatsApp:', error);
        return NextResponse.json({ error: 'Failed to import' }, { status: 500 });
    }
}
