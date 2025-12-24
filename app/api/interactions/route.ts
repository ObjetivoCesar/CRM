import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const cookieStore = cookies()
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId');
  const discoveryLeadId = searchParams.get('discoveryLeadId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

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
    let query = supabase
      .from('interactions')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    if (discoveryLeadId) {
      query = query.eq('discovery_lead_id', discoveryLeadId);
    }

    const { data: allInteractions, error } = await query;

    if (error) {
      console.error('Error fetching interactions:', error);
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
    }

    // Map back to camelCase for frontend consistency
    const mapped = allInteractions.map((i: any) => ({
      id: i.id,
      type: i.type,
      direction: i.direction,
      content: i.content,
      outcome: i.outcome,
      duration: i.duration,
      contactId: i.contact_id,
      discoveryLeadId: i.discovery_lead_id,
      performedAt: i.performed_at,
      createdAt: i.created_at
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();

    // Map camelCase to snake_case - Resilient Mapping
    const interactionData = {
      type: body.type,
      direction: body.direction,
      content: body.content,
      outcome: body.outcome,
      duration: body.duration,
      contact_id: body.contactId || body.relatedClientId || null, // ✅ Compatibilidad total
      discovery_lead_id: body.discoveryLeadId || body.relatedLeadId || null,
      performed_at: body.performedAt ? new Date(body.performedAt).toISOString() : new Date().toISOString()
    };


    const { data: newInteraction, error } = await supabase
      .from('interactions')
      .insert([interactionData])
      .select()
      .single();

    if (error) {
      console.error('CRITICAL DATABASE ERROR creating interaction:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        error: 'Failed to create interaction',
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    // Map back to camelCase for frontend consistency
    const mappedInteraction = {
      id: newInteraction.id,
      type: newInteraction.type,
      direction: newInteraction.direction,
      content: newInteraction.content,
      outcome: newInteraction.outcome,
      duration: newInteraction.duration,
      contactId: newInteraction.contact_id,
      discoveryLeadId: newInteraction.discovery_lead_id,
      performedAt: newInteraction.performed_at,
      createdAt: newInteraction.created_at
    };

    return NextResponse.json(mappedInteraction);
  } catch (error) {
    console.error('Error creating interaction:', error);
    return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
  }
}
