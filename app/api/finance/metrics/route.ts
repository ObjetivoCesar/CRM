import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transactions, personalLiabilities } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Fetch all transactions and liabilities in parallel
        const [allTransactions, liabilities] = await Promise.all([
            db.select({
                amount: transactions.amount,
                type: transactions.type,
                status: transactions.status,
                date: transactions.date,
                paymentMethod: transactions.paymentMethod,
                subType: transactions.subType,
            }).from(transactions),

            db.select({
                monthlyPayment: personalLiabilities.monthlyPayment,
                status: personalLiabilities.status,
            }).from(personalLiabilities),
        ]);

        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let accountsReceivable = 0;
        let accountsPayable = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        let businessFixedCosts = 0;
        let businessVariableCosts = 0;
        let totalSalesCurrentMonth = 0;

        allTransactions.forEach(t => {
            const tDate = new Date(t.date);
            const isCurrentMonth = tDate >= firstDayOfMonth && tDate <= lastDayOfMonth;
            const isPaid = t.status === 'PAID';
            const isPendingOrOverdue = t.status === 'PENDING' || t.status === 'OVERDUE';
            const isLiquid = t.paymentMethod !== 'CANJE';

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
                if (t.subType === 'BUSINESS_FIXED') businessFixedCosts += t.amount;
                if (t.subType === 'BUSINESS_VARIABLE') businessVariableCosts += t.amount;
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
        liabilities.forEach(l => {
            totalMonthlyPersonalBurden += l.monthlyPayment;
        });

        const cashFlow = monthlyIncome - monthlyExpense;
        const balance = totalIncome - totalExpense;

        // Break-even Calculation (Negocio + Personal)
        // Formula: (Fixed Costs + Personal Burden) / (1 - (Variable Costs / Total Sales))
        const totalFixedObligations = businessFixedCosts + totalMonthlyPersonalBurden;
        const margin = totalSalesCurrentMonth > 0 ? (totalSalesCurrentMonth - businessVariableCosts) / totalSalesCurrentMonth : 0;
        const breakEvenPoint = margin > 0 ? totalFixedObligations / margin : totalFixedObligations;

        // Proactive Indicators (Mission Control)
        const expectedCash = balance + accountsReceivable;
        const totalCommitments = accountsPayable + totalMonthlyPersonalBurden;

        let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
        if (expectedCash < totalCommitments) {
            healthStatus = 'CRITICAL';
        } else if (expectedCash < totalCommitments * 1.5) {
            healthStatus = 'WARNING';
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
