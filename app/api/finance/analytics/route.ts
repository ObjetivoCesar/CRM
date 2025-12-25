
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod';
import { differenceInDays, eachDayOfInterval, format, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Zod Schema for the dynamic request
const AnalyticsQuerySchema = z.object({
    dateRange: z.object({
        from: z.string(), // ISO String
        to: z.string().optional()
    }).optional(),
    groupBy: z.enum(['day', 'month', 'client', 'category']).optional(),
    filters: z.object({
        type: z.enum(['INCOME', 'EXPENSE']).optional(),
        status: z.enum(['PAID', 'PENDING']).optional(),
        clientId: z.array(z.string()).optional()
    }).optional(),
    // What predefined metric set to calculate?
    viewMode: z.enum(['overview', 'cash_flow', 'collections', 'profitability']).default('overview')
});

export async function POST(req: Request) {
    const cookieStore = await cookies()
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
        console.log('🔍 [API] Analytics Request Body:', JSON.stringify(body, null, 2));
        const query = AnalyticsQuerySchema.parse(body);
        console.log('✅ [API] Query Parsed:', query);

        let supabaseQuery = supabase
            .from('transactions')
            .select(`
                id,
                type,
                amount,
                date,
                status,
                category,
                contact_id
            `);

        // 1. Apply Date Filters
        // Default to current month if no date provided
        const fromDate = query.dateRange?.from || startOfMonth(new Date()).toISOString();
        const toDate = query.dateRange?.to || endOfMonth(new Date()).toISOString();

        supabaseQuery = supabaseQuery.gte('date', fromDate).lte('date', toDate);

        // 2. Apply Custom Filters
        if (query.filters?.type) {
            supabaseQuery = supabaseQuery.eq('type', query.filters.type);
        }
        if (query.filters?.status) {
            supabaseQuery = supabaseQuery.eq('status', query.filters.status);
        }
        if (query.filters?.clientId && query.filters.clientId.length > 0) {
            supabaseQuery = supabaseQuery.in('contact_id', query.filters.clientId);
        }

        const { data: transactions, error } = await supabaseQuery;

        if (error) throw error;

        // 3. Process Data based on View Mode (Aggregation)
        // Since we are "Senior Managers", we need high-level KPIs, not just raw lists.

        let result = {
            summary: {
                totalIncome: 0,
                totalExpense: 0,
                netProfit: 0,
                pendingCollections: 0,
                collectionEfficiency: 0
            },
            chartData: [] as any[],
            breakdown: [] as any[]
        };

        // --- CALCULATION ENGINE ---

        let income = 0;
        let expense = 0;
        let billed = 0; // Total Income (Paid + Pending)
        let collected = 0; // Total Income (Paid only)

        const dailyMap = new Map<string, { income: number, expense: number, label: string }>();

        transactions?.forEach((t: any) => {
            const amount = Number(t.amount);

            // Global Summary
            if (t.type === 'INCOME') {
                billed += amount;
                if (t.status === 'PAID') {
                    income += amount;
                    collected += amount;
                } else {
                    result.summary.pendingCollections += amount;
                }
            } else if (t.type === 'EXPENSE') {
                if (t.status === 'PAID') expense += amount;
            }

            // Chart Aggregation (Default by Day)
            const dayKey = format(new Date(t.date), 'yyyy-MM-dd');
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, { income: 0, expense: 0, label: format(new Date(t.date), 'dd MMM', { locale: es }) });
            }
            const entry = dailyMap.get(dayKey)!;

            if (t.type === 'INCOME' && t.status === 'PAID') entry.income += amount;
            if (t.type === 'EXPENSE' && t.status === 'PAID') entry.expense += amount;
        });

        result.summary.totalIncome = income;
        result.summary.totalExpense = expense;
        result.summary.netProfit = income - expense;
        // Avoid division by zero
        result.summary.collectionEfficiency = billed > 0 ? (collected / billed) * 100 : (collected > 0 ? 100 : 0);

        // Sort Chart Data
        result.chartData = Array.from(dailyMap.values()).sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());

        // Fill gaps in dates if range is small for better looking charts
        // (Optional optimization: implementation detailed later if needed)

        // Client Breakdown (Top 10)
        if (query.viewMode === 'profitability' || query.viewMode === 'overview') {
            const clientMap = new Map<string, number>();
            transactions?.forEach((t: any) => {
                if (t.type === 'INCOME' && t.status === 'PAID' && t.contact_id) {
                    const contactId = t.contact_id;
                    clientMap.set(contactId, (clientMap.get(contactId) || 0) + Number(t.amount));
                }
            });

            result.breakdown = Array.from(clientMap.entries())
                .map(([contactId, value]) => ({
                    name: contactId.substring(0, 8) + '...', // Show first 8 chars of UUID
                    value
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Start with Top 5
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Analytics Error:', error);
        return NextResponse.json(
            { error: 'Analytics Engine Failed', details: error.message },
            { status: 500 }
        );
    }
}
