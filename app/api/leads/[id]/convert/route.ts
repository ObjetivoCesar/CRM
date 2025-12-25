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
    const { contractValue, initialPayment, balanceDueDate } = await request.json();

    // 1. Update entity_type to 'client'
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

    // 2. Automated Financial Integration (Phase 1 of Mission Control)
    if (contractValue > 0) {
      const transactionsToInsert = [];

      // A. Initial Payment (Income Paid)
      if (initialPayment > 0) {
        transactionsToInsert.push({
          type: 'INCOME',
          category: 'Venta - Anticipo',
          description: `Anticipo de Contrato: ${updatedContact.business_name || updatedContact.contact_name}`,
          amount: initialPayment,
          date: new Date().toISOString(),
          status: 'PAID',
          sub_type: 'BUSINESS_VARIABLE',
          client_id: updatedContact.id
        });
      }

      // B. Remaining Balance (Income Pending)
      const balance = contractValue - initialPayment;
      if (balance > 0) {
        transactionsToInsert.push({
          type: 'INCOME',
          category: 'Venta - Saldo',
          description: `Saldo de Contrato: ${updatedContact.business_name || updatedContact.contact_name}`,
          amount: balance,
          date: new Date().toISOString(),
          due_date: balanceDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'PENDING',
          sub_type: 'BUSINESS_VARIABLE',
          client_id: updatedContact.id
        });
      }

      if (transactionsToInsert.length > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert);

        if (txError) console.error('Error creating linked transactions:', txError);
      }
    }

    return NextResponse.json({ success: true, client: updatedContact });

  } catch (error) {
    console.error('Error converting lead:', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}