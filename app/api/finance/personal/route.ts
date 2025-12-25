import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod';

const PersonalLiabilitySchema = z.object({
    name: z.string().min(1),
    category: z.string(),
    monthlyPayment: z.number(),
    totalDebt: z.number().optional().nullable(),
    remainingDebt: z.number().optional().nullable(),
    dueDate: z.number().min(1).max(31).optional().nullable(),
    status: z.enum(['UP_TO_DATE', 'PENDING', 'OVERDUE']).default('UP_TO_DATE'),
    notes: z.string().optional().nullable(),
});

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
        const { data, error } = await supabase
            .from('personal_liabilities')
            .select('*')
            .order('due_date', { ascending: true });

        if (error) throw error;

        // Map snake_case to camelCase
        const mappedData = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            monthlyPayment: item.monthly_payment,
            totalDebt: item.total_debt,
            remainingDebt: item.remaining_debt,
            dueDate: item.due_date,
            status: item.status,
            notes: item.notes,
            createdAt: item.created_at,
        }));

        return NextResponse.json(mappedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
        const validated = PersonalLiabilitySchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 });
        }

        const payload = {
            name: validated.data.name,
            category: validated.data.category,
            monthly_payment: validated.data.monthlyPayment,
            total_debt: validated.data.totalDebt,
            remaining_debt: validated.data.remainingDebt,
            due_date: validated.data.dueDate,
            status: validated.data.status,
            notes: validated.data.notes,
        };

        const { data, error } = await supabase
            .from('personal_liabilities')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
