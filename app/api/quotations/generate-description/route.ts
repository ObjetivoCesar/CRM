import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { QuotationGenerator } from '@/lib/openai/quotation-generator'

export async function POST(request: Request) {
  const { leadId, templateId } = await request.json()

  if (!leadId || !templateId) {
    return NextResponse.json({ success: false, error: 'Missing leadId or templateId' }, { status: 400 })
  }

  try {
    // Fetch lead data
    const lead = await db.query.leads.findFirst({
      where: eq(schema.leads.id, leadId)
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const generator = new QuotationGenerator();
    // @ts-ignore - Assuming lead matches LeadData interface or close enough for now
    const description = await generator.generateDescription(lead, templateId);

    return NextResponse.json({ success: true, description })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error generating description:', errorMessage)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
