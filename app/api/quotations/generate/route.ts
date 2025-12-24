import { NextResponse } from 'next/server'
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { QuotationGenerator, LeadData } from '@/lib/openai/quotation-generator'

export async function POST(request: Request) {
  try {
    const { leadId, templateId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 })
    }

    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId)
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const leadData: LeadData = {
      ...lead,
      interested_product: typeof lead.interestedProduct === 'string' ? JSON.parse(lead.interestedProduct as string) : lead.interestedProduct,
    } as unknown as LeadData;

    const generator = new QuotationGenerator();
    const quotation = await generator.generateFullQuotation(leadData, templateId);

    return NextResponse.json({ success: true, quotation })
  } catch (error) {
    console.error('Error generating quotation:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}