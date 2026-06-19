import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, transactions, financialGoals, tasks, discoveryLeads } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // 1. Pipeline Health (Funnel) - Leads by status
        const leadsData = await db.select({ status: contacts.status })
            .from(contacts)
            .where(eq(contacts.entityType, 'lead'));

        // 2. Financial Metrics (Current Month)
        const transactionsData = await db.select({
            amount: transactions.amount,
            type: transactions.type,
            date: transactions.date,
        })
            .from(transactions)
            .where(and(
                gte(transactions.date, firstDayOfMonth),
                lte(transactions.date, lastDayOfMonth)
            ));

        // 3. Goal
        const [goalData] = await db.select({ revenueTarget: financialGoals.revenueTarget })
            .from(financialGoals)
            .where(and(
                eq(financialGoals.month, now.getMonth() + 1),
                eq(financialGoals.year, now.getFullYear())
            ))
            .limit(1);

        // 4. Action Center (Urgent Tasks)
        const tasksData = await db.select()
            .from(tasks)
            .where(eq(tasks.status, 'todo'))
            .limit(20);

        // 5. Client Breakdown by Industry
        const clientTypes = await db.select({ businessType: contacts.businessType })
            .from(contacts)
            .where(eq(contacts.entityType, 'client'));

        // 6. Client Count
        const [clientCountResult] = await db.select({ value: count() })
            .from(contacts)
            .where(eq(contacts.entityType, 'client'));

        // 7. Discovery Queue Count
        const [queueCountResult] = await db.select({ value: count() })
            .from(discoveryLeads)
            .where(eq(discoveryLeads.columna2, 'en_cola'));

        // --- Processing Data ---

        // Pipeline
        const pipeline = {
            total: 0,
            contacted: 0,
            interested: 0,
            converted: 0
        };

        (leadsData || []).forEach((row) => {
            pipeline.total++;
            if (['primer_contacto', 'segundo_contacto', 'tercer_contacto', 'cotizado'].includes(row.status || '')) {
                pipeline.contacted++;
            }
            if (['cotizado'].includes(row.status || '')) {
                pipeline.interested++;
            }
            if (['convertido'].includes(row.status || '')) {
                pipeline.converted++;
            }
        });

        // Finances
        let currentIncome = 0;
        let currentExpenses = 0;

        (transactionsData || []).forEach((t) => {
            if (t.type === 'INCOME') currentIncome += t.amount || 0;
            if (t.type === 'EXPENSE') currentExpenses += t.amount || 0;
        });

        const monthlyGoal = goalData?.revenueTarget || 5000;

        // Tasks Sorting (High > Medium > Low)
        const priorityScore = (p: string | null) => {
            if (p === 'high') return 3;
            if (p === 'medium') return 2;
            return 1;
        };

        const urgentTasks = (tasksData || [])
            .sort((a, b) => {
                const pDiff = priorityScore(b.priority) - priorityScore(a.priority);
                if (pDiff !== 0) return pDiff;
                // If same priority, closest due date first
                return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
            })
            .slice(0, 5);

        // Client Breakdown logic
        const breakdownMap: Record<string, number> = {};
        (clientTypes || []).forEach((c) => {
            const type = c.businessType || 'Otros';
            breakdownMap[type] = (breakdownMap[type] || 0) + 1;
        });

        const clientBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
            name,
            value
        })).sort((a, b) => b.value - a.value);

        return NextResponse.json({
            pipeline,
            finance: {
                income: currentIncome,
                expenses: currentExpenses,
                goal: monthlyGoal,
                progress: monthlyGoal > 0 ? Math.min((currentIncome / monthlyGoal) * 100, 100) : 0
            },
            tasks: urgentTasks,
            clientsvTwo: clientCountResult?.value || 0,
            discoveryQueue: queueCountResult?.value || 0,
            clientBreakdown,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
}
