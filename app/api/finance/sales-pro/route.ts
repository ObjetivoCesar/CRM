import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod';

const SalesProSchema = z.object({
    clientId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    businessName: z.string().optional(),
    contactName: z.string().optional(),
    totalAmount: z.number().positive(),
    downPayment: z.number().nonnegative(),
    downPaymentStatus: z.enum(['PAID', 'PENDING']),
    paymentMethod: z.string(),
    balanceDueDate: z.string().optional(),
    description: z.string(),
    category: z.string().default('Venta'),
    subType: z.enum(['BUSINESS_VARIABLE']).default('BUSINESS_VARIABLE'),
});

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
        const validated = SalesProSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 });
        }

        const data = validated.data;
        const balanceAmount = data.totalAmount - data.downPayment;

        // 1. Create Down Payment (Anticipo)
        const downPaymentTx = {
            type: 'INCOME',
            category: data.category,
            description: `${data.description} (Anticipo)`,
            amount: data.downPayment,
            date: new Date().toISOString(),
            status: data.downPaymentStatus,
            payment_method: data.paymentMethod,
            sub_type: data.subType,
            client_id: data.clientId,
            lead_id: data.leadId,
        };

        const { data: createdDownPayment, error: dpError } = await supabase
            .from('transactions')
            .insert([downPaymentTx])
            .select()
            .single();

        if (dpError) throw dpError;

        // 2. Create Balance (Saldo) if amount remains
        let createdBalance = null;
        if (balanceAmount > 0) {
            const balanceTx = {
                type: 'INCOME',
                category: data.category,
                description: `${data.description} (Saldo)`,
                amount: balanceAmount,
                date: new Date().toISOString(),
                due_date: data.balanceDueDate ? new Date(data.balanceDueDate).toISOString() : null,
                status: 'PENDING',
                payment_method: data.paymentMethod,
                sub_type: data.subType,
                client_id: data.clientId,
                lead_id: data.leadId,
                parent_transaction_id: createdDownPayment.id,
            };

            const { data: resBalance, error: bError } = await supabase
                .from('transactions')
                .insert([balanceTx])
                .select()
                .single();

            if (bError) throw bError;
            createdBalance = resBalance;
        }

        return NextResponse.json({
            success: true,
            downPayment: createdDownPayment,
            balance: createdBalance
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
