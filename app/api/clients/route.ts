import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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
    const { data: allClients, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('entity_type', 'client')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    const mappedClients = allClients?.map(client => ({
      id: client.id,
      businessName: client.business_name,
      contactName: client.contact_name,
      phone: client.phone,
      email: client.email,
      city: client.city,
      businessType: client.business_type,
      contractValue: client.contract_value,
      contractStartDate: client.contract_start_date,
      quotation: client.quotation,
      notes: client.notes,
    })) || [];

    return NextResponse.json(mappedClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
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

    const newClientData = {
      business_name: body.businessName,
      contact_name: body.contactName,
      phone: body.phone,
      email: body.email,
      city: body.city,
      business_type: body.businessType,
      contract_value: body.contractValue || null,
      // contract_start_date: body.contractStartDate, // Add if needed
    };

    const { data: newClient, error } = await supabase
      .from('contacts')
      .insert([{ ...newClientData, entity_type: 'client' }])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json({ error: 'Failed to create client: ' + error.message }, { status: 500 });
    }

    // Map back to camelCase for response
    const mappedClient = {
      id: newClient.id,
      businessName: newClient.business_name,
      contactName: newClient.contact_name,
      phone: newClient.phone,
      email: newClient.email,
      city: newClient.city,
      businessType: newClient.business_type,
      contractValue: newClient.contract_value,
    };

    return NextResponse.json(mappedClient);
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
