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
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount, type, status, date, due_date')
            .or('status.eq.PAID,status.eq.PENDING,status.eq.OVERDUE');

        const { data: liabilities, error: liabError } = await supabase
            .from('personal_liabilities')
            .select('monthly_payment, due_date');

        if (txError || liabError) throw txError || liabError;

        // Generate 30-day forecast points
        const points = [];
        const now = new Date();

        // Initial Liquid Balance
        let currentBalance = 0;
        transactions?.forEach(t => {
            if (t.status === 'PAID') {
                if (t.type === 'INCOME') currentBalance += t.amount;
                else currentBalance -= t.amount;
            }
        });

        for (let i = 0; i <= 30; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            date.setHours(0, 0, 0, 0);

            // Add expected income/expense for this date
            transactions?.forEach(t => {
                if (t.status === 'PENDING' || t.status === 'OVERDUE') {
                    const targetDate = new Date(t.due_date || t.date);
                    targetDate.setHours(0, 0, 0, 0);

                    if (targetDate.getTime() === date.getTime()) {
                        if (t.type === 'INCOME') currentBalance += t.amount;
                        else currentBalance -= t.amount;
                    }
                }
            });

            // Subtract personal liabilities based on day of month
            const dayOfMonth = date.getDate();
            liabilities?.forEach(l => {
                if (l.due_date === dayOfMonth) {
                    currentBalance -= l.monthly_payment;
                }
            });

            points.push({
                date: date.toISOString().split('T')[0],
                balance: currentBalance
            });
        }

        return NextResponse.json(points);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
