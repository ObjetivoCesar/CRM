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

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount, type, status, date, payment_method, sub_type');

        const { data: liabilities, error: liabError } = await supabase
            .from('personal_liabilities')
            .select('monthly_payment, status');

        if (error || liabError) {
            console.error('Error fetching data for metrics:', error || liabError);
            return NextResponse.json({ cashFlow: 0, accountsReceivable: 0, accountsPayable: 0, balance: 0 });
        }

        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let accountsReceivable = 0;
        let accountsPayable = 0;
        let totalIncome = 0;
        let totalExpense = 0;
        let liquidBalance = 0;

        let businessFixedCosts = 0;
        let businessVariableCosts = 0;
        let totalSalesCurrentMonth = 0;

        transactions?.forEach(t => {
            const tDate = new Date(t.date);
            const isCurrentMonth = tDate >= firstDayOfMonth && tDate <= lastDayOfMonth;
            const isPaid = t.status === 'PAID';
            const isPendingOrOverdue = t.status === 'PENDING' || t.status === 'OVERDUE';
            const isLiquid = t.payment_method !== 'CANJE';

            // Cash Flow (Monthly - Real Money Only)
            if (isCurrentMonth && isPaid && isLiquid) {
                if (t.type === 'INCOME') monthlyIncome += t.amount;
                if (t.type === 'EXPENSE') monthlyExpense += t.amount;
            }

            // Sales Tracking for Break-even (Total agreed including pending)
            if (isCurrentMonth && t.type === 'INCOME') {
                totalSalesCurrentMonth += t.amount;
            }

            // Cost Tracking for Break-even
            if (isCurrentMonth && t.type === 'EXPENSE') {
                if (t.sub_type === 'BUSINESS_FIXED') businessFixedCosts += t.amount;
                if (t.sub_type === 'BUSINESS_VARIABLE') businessVariableCosts += t.amount;
            }

            // Accounts Receivable (Income Pending)
            if (t.type === 'INCOME' && isPendingOrOverdue) {
                accountsReceivable += t.amount;
            }

            // Accounts Payable (Expense Pending)
            if (t.type === 'EXPENSE' && isPendingOrOverdue) {
                accountsPayable += t.amount;
            }

            // Total Balance (Lifetime - Liquid Only)
            if (isPaid && isLiquid) {
                if (t.type === 'INCOME') totalIncome += t.amount;
                if (t.type === 'EXPENSE') totalExpense += t.amount;
            }
        });

        // Calculate Personal Burden
        let totalMonthlyPersonalBurden = 0;
        liabilities?.forEach(l => {
            totalMonthlyPersonalBurden += l.monthly_payment;
        });

        const cashFlow = monthlyIncome - monthlyExpense;
        const balance = totalIncome - totalExpense;

        // Break-even Calculation (Negocio + Personal)
        // Formula: (Fixed Costs + Personal Burden) / (1 - (Variable Costs / Total Sales))
        const totalFixedObligations = businessFixedCosts + totalMonthlyPersonalBurden;
        const margin = totalSalesCurrentMonth > 0 ? (totalSalesCurrentMonth - businessVariableCosts) / totalSalesCurrentMonth : 0;
        const breakEvenPoint = margin > 0 ? totalFixedObligations / margin : totalFixedObligations;

        // Proactive Indicators (Mission Control)
        // Health Status logic
        // Total expected cash in 30 days = Balance + AR
        // Total commitments = AP + Personal Burden
        const expectedCash = balance + accountsReceivable;
        const totalCommitments = accountsPayable + totalMonthlyPersonalBurden;

        let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (expectedCash < totalCommitments) {
            healthStatus = 'CRITICAL'; // Doesn't cover this month's obligations
        } else if (expectedCash < totalCommitments * 1.5) {
            healthStatus = 'WARNING'; // Tight runway
        }

        return NextResponse.json({
            cashFlow,
            accountsReceivable,
            accountsPayable,
            balance,
            breakEvenPoint,
            currentFixedCosts: businessFixedCosts,
            totalSalesCurrentMonth,
            totalMonthlyPersonalBurden,
            healthStatus,
            expectedCash,
            totalCommitments,
            margin,
            surplus: expectedCash - totalCommitments
        });

    } catch (error) {
        console.error('Error calculating metrics:', error);
        return NextResponse.json(
            { error: 'Failed to calculate metrics' },
            { status: 500 }
        );
    }
}
