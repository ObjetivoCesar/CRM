import { NextResponse } from 'next/server'
import { QuotationGenerator, LeadData } from '@/lib/openai/quotation-generator'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
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

  try {
    const { leadId, templateId } = await request.json()
    console.log(`[API] Starting generation for lead: ${leadId}, template: ${templateId}`);

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 })
    }

    // Fetch lead data using Supabase
    const { data: rawLead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !rawLead) {
      console.error('Lead not found or error:', error);
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Map snake_case to camelCase to match previous Drizzle object structure
    const lead = {
      ...rawLead, // Keep original keys too just in case
      businessName: rawLead.business_name,
      contactName: rawLead.contact_name,
      interestedProduct: rawLead.interested_product,
      businessActivity: rawLead.business_activity,
      // Add others if needed by Generator
    };

    // Safely parse interestedProduct - it might be a string or JSON array
    let interestedProductArray: string[] = [];
    if (lead.interestedProduct) {
      if (typeof lead.interestedProduct === 'string') {
        // Try to parse as JSON, if it fails, treat as a single string
        try {
          interestedProductArray = JSON.parse(lead.interestedProduct);
        } catch {
          // Not JSON, just a plain string - wrap it in an array
          interestedProductArray = [lead.interestedProduct];
        }
      } else if (Array.isArray(lead.interestedProduct)) {
        interestedProductArray = lead.interestedProduct;
      }
    }

    // Cast to LeadData interface
    const leadData: LeadData = {
      ...lead,
      interested_product: interestedProductArray,
    } as unknown as LeadData;

    const generator = new QuotationGenerator();
    const quotation = await generator.generateFullQuotation(leadData, templateId);

    return NextResponse.json({ success: true, quotation })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error generating full quotation:', errorMessage)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
