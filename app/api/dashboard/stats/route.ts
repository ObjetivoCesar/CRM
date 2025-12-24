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
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // 1. Pipeline Health (Funnel) - Fetch count by status
        // Since Supabase doesn't support GROUP BY easily in client without RPC, we fetch status column
        const { data: leadsData, error: leadsError } = await supabase
            .from('contacts')
            .select('status')
            .eq('entity_type', 'lead');

        if (leadsError) throw leadsError;

        // 2. Financial Metrics (Current Month)
        const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount, type, date')
            .gte('date', firstDayOfMonth)
            .lte('date', lastDayOfMonth);

        if (transactionsError) throw transactionsError;

        // 3. Goal
        const { data: goalData, error: goalError } = await supabase
            .from('financial_goals')
            .select('revenue_target')
            .eq('month', now.getMonth() + 1)
            .eq('year', now.getFullYear())
            .single();

        // Ignore goal error if it's just "not found" (PGRST116)
        if (goalError && goalError.code !== 'PGRST116') throw goalError;

        // 4. Action Center (Urgent Tasks)
        // Fetch pending tasks and sort in JS for better control over "Priority" text enum
        const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'todo')
            .limit(20); // Fetch a few to sort

        if (tasksError) throw tasksError;

        // 5. Client Breakdown by Industry
        const { data: clientTypes, error: clientTypesError } = await supabase
            .from('contacts')
            .select('business_type')
            .eq('entity_type', 'client');

        if (clientTypesError) throw clientTypesError;

        // 6. Client Count
        const { count: clientsCount, error: clientsError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('entity_type', 'client');

        if (clientsError) throw clientsError;

        // 7. Discovery Queue Count
        const { count: queueCount, error: queueError } = await supabase
            .from('discovery_leads')
            .select('*', { count: 'exact', head: true })
            .eq('columna2', 'en_cola');

        if (queueError) throw queueError;

        // --- Processing Data ---

        // Pipeline
        const pipeline = {
            total: 0,
            contacted: 0,
            interested: 0,
            converted: 0
        };

        (leadsData || []).forEach((row: any) => {
            pipeline.total++;
            if (['primer_contacto', 'segundo_contacto', 'tercer_contacto', 'cotizado'].includes(row.status)) {
                pipeline.contacted++;
            }
            if (['cotizado'].includes(row.status)) {
                pipeline.interested++;
            }
            if (['convertido'].includes(row.status)) {
                pipeline.converted++;
            }
        });

        // Finances
        let currentIncome = 0;
        let currentExpenses = 0;

        (transactionsData || []).forEach((t: any) => {
            if (t.type === 'INCOME') currentIncome += t.amount || 0;
            if (t.type === 'EXPENSE') currentExpenses += t.amount || 0;
        });

        const monthlyGoal = goalData?.revenue_target || 5000;

        // Tasks Sorting (High > Medium > Low)
        const priorityScore = (p: string) => {
            if (p === 'high') return 3;
            if (p === 'medium') return 2;
            return 1;
        };

        const urgentTasks = (tasksData || [])
            .sort((a, b) => {
                const pDiff = priorityScore(b.priority) - priorityScore(a.priority);
                if (pDiff !== 0) return pDiff;
                // If same priority, closest due date first
                return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
            })
            .slice(0, 5);

        // Client Breakdown logic
        const breakdownMap: Record<string, number> = {};
        (clientTypes || []).forEach((c: any) => {
            const type = c.business_type || 'Otros';
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
            clientsvTwo: clientsCount || 0,
            discoveryQueue: queueCount || 0,
            clientBreakdown,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }
}
