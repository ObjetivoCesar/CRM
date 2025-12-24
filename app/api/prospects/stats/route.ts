import { db, schema } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sql, count } from 'drizzle-orm';

export async function GET() {
    try {
        // Total prospects
        const totalResult = await db.select({ count: count() }).from(schema.prospects);
        const total = totalResult[0]?.count || 0;

        // By status
        const statusResults = await db
            .select({
                status: schema.prospects.outreachStatus,
                count: count(),
            })
            .from(schema.prospects)
            .groupBy(schema.prospects.outreachStatus);

        const byStatus: Record<string, number> = {};
        statusResults.forEach((row) => {
            byStatus[row.status || 'unknown'] = row.count;
        });

        // Contacted today (whatsappSentAt is today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Math.floor(today.getTime() / 1000);

        const contactedTodayResult = await db
            .select({ count: count() })
            .from(schema.prospects)
            .where(sql`${schema.prospects.whatsappSentAt} >= ${todayTimestamp}`);

        const contactedToday = contactedTodayResult[0]?.count || 0;

        // Responded count
        const responded = byStatus['responded'] || 0;

        // Conversion rate (responded / contacted)
        const contacted = byStatus['contacted'] || 0;
        const conversionRate = contacted > 0 ? (responded / contacted) * 100 : 0;

        return NextResponse.json({
            total,
            contactedToday,
            responded,
            conversionRate: Math.round(conversionRate * 10) / 10,
            byStatus,
            new: byStatus['new'] || 0,
            contacted,
            interested: byStatus['interested'] || 0,
            notInterested: byStatus['not_interested'] || 0,
            converted: byStatus['converted_to_lead'] || 0,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
