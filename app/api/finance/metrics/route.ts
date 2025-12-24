import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Optimization: Fetch all transactions implies retrieving all rows.
        // For a CRM, this is likely < 10,000 rows. In-memory aggregation is acceptable.
        // We select only needed fields.
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount, type, status, date');

        if (error) {
            console.error('Error fetching transactions for metrics:', error);
            // Return zeros instead of error to not crash dashboard
            return NextResponse.json({ cashFlow: 0, accountsReceivable: 0, accountsPayable: 0, balance: 0 });
        }

        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let accountsReceivable = 0;
        let accountsPayable = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        transactions?.forEach(t => {
            const tDate = new Date(t.date);
            const isCurrentMonth = tDate >= firstDayOfMonth && tDate <= lastDayOfMonth;
            const isPaid = t.status === 'PAID';
            const isPendingOrOverdue = t.status === 'PENDING' || t.status === 'OVERDUE';

            // Cash Flow (Monthly)
            if (isCurrentMonth && isPaid) {
                if (t.type === 'INCOME') monthlyIncome += t.amount;
                if (t.type === 'EXPENSE') monthlyExpense += t.amount;
            }

            // Accounts Receivable (Income Pending)
            if (t.type === 'INCOME' && isPendingOrOverdue) {
                accountsReceivable += t.amount;
            }

            // Accounts Payable (Expense Pending)
            if (t.type === 'EXPENSE' && isPendingOrOverdue) {
                accountsPayable += t.amount;
            }

            // Total Balance (Lifetime)
            if (isPaid) {
                if (t.type === 'INCOME') totalIncome += t.amount;
                if (t.type === 'EXPENSE') totalExpense += t.amount;
            }
        });

        const cashFlow = monthlyIncome - monthlyExpense;
        const balance = totalIncome - totalExpense;

        return NextResponse.json({
            cashFlow,
            accountsReceivable,
            accountsPayable,
            balance
        });

    } catch (error) {
        console.error('Error calculating metrics:', error);
        return NextResponse.json(
            { error: 'Failed to calculate metrics' },
            { status: 500 }
        );
    }
}
