import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod';

// Schema Validation for creating a transaction
const TransactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z.string(),
    description: z.string(),
    amount: z.number().positive(),
    date: z.string(), // Expecting ISO string from frontend
    dueDate: z.string().optional(),
    status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
    paymentMethod: z.string().optional(),
    clientId: z.string().optional(),
    leadId: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional(),
    notes: z.string().optional(),
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

        // Validate request body
        const validatedData = TransactionSchema.safeParse(body);

        if (!validatedData.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validatedData.error.flatten() },
                { status: 400 }
            );
        }

        const data = validatedData.data;

        // Map camelCase to snake_case for Supabase
        const transactionData = {
            type: data.type,
            category: data.category,
            description: data.description,
            amount: data.amount,
            date: new Date(data.date).toISOString(),
            due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            status: data.status,
            payment_method: data.paymentMethod,
            client_id: data.clientId,
            lead_id: data.leadId,
            is_recurring: data.isRecurring || false,
            recurrence_rule: data.recurrenceRule,
            notes: data.notes
        };

        const { data: newTransaction, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single();

        if (error) {
            console.error('Error creating transaction:', error);
            return NextResponse.json(
                { error: 'Failed to create transaction: ' + error.message },
                { status: 500 }
            );
        }

        // Map back to camelCase
        const mappedTransaction = {
            id: newTransaction.id,
            type: newTransaction.type,
            category: newTransaction.category,
            description: newTransaction.description,
            amount: newTransaction.amount,
            date: newTransaction.date,
            dueDate: newTransaction.due_date,
            status: newTransaction.status,
            paymentMethod: newTransaction.payment_method,
            clientId: newTransaction.client_id,
            leadId: newTransaction.lead_id,
            isRecurring: newTransaction.is_recurring,
            recurrenceRule: newTransaction.recurrence_rule,
            notes: newTransaction.notes,
            createdAt: newTransaction.created_at
        };

        return NextResponse.json(mappedTransaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            { error: 'Failed to create transaction' },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
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
        const { data: allTransactions, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
        }

        // Map snake_case to camelCase
        const mappedTransactions = allTransactions?.map((t: any) => ({
            id: t.id,
            type: t.type,
            category: t.category,
            description: t.description,
            amount: t.amount,
            date: t.date,
            dueDate: t.due_date,
            status: t.status,
            paymentMethod: t.payment_method,
            clientId: t.client_id,
            leadId: t.lead_id,
            isRecurring: t.is_recurring,
            recurrenceRule: t.recurrence_rule,
            notes: t.notes,
            createdAt: t.created_at
        })) || [];

        return NextResponse.json(mappedTransactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}
