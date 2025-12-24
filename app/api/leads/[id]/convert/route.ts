import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const leadId = params.id;

    // ✅ NUEVO: Simplemente actualizar entity_type a 'client'
    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({
        entity_type: 'client',
        converted_to_client_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) {
      console.error('Error converting lead to client:', updateError);
      return NextResponse.json({ error: 'Failed to convert lead: ' + updateError.message }, { status: 500 });
    }

    if (!updatedContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, client: updatedContact });

  } catch (error) {
    console.error('Error converting lead:', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}