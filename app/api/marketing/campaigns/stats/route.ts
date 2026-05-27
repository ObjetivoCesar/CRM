import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, interactions, campaigns } from '@/lib/db/schema';
import { eq, desc, sql, and, or } from 'drizzle-orm';

/**
 * GET /api/marketing/campaigns/stats
 * 
 * Returns real-time funnel metrics for the Facebook Ads campaign.
 * Tracks: leads generated, conversations started, interested, converted.
 * 
 * Query params:
 *   - days: number (default 7) — lookback window
 *   - source: string (default 'whatsapp_inbound') — campaign source tag
 */

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const source = searchParams.get('source') || 'whatsapp_inbound';

    try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // 1. Total leads from campaign source
        const totalLeads = await db.select({ count: sql<number>`count(*)::int` })
            .from(contacts)
            .where(
                and(
                    eq(contacts.source, source),
                    sql`${contacts.createdAt} >= ${since}`
                )
            )
            .then(r => r[0]?.count || 0);

        // 2. Leads by funnel stage
        const stageBreakdown = await db.select({
            status: contacts.status,
            count: sql<number>`count(*)::int`
        })
            .from(contacts)
            .where(
                and(
                    eq(contacts.source, source),
                    sql`${contacts.createdAt} >= ${since}`
                )
            )
            .groupBy(contacts.status)
            .orderBy(contacts.status);

        // 3. Conversations started (contacts with at least 1 interaction)
        const conversationsStarted = await db
            .select({ count: sql<number>`count(DISTINCT ${interactions.contactId})::int` })
            .from(interactions)
            .where(
                and(
                    eq(interactions.direction, 'inbound'),
                    sql`${interactions.performedAt} >= ${since}`
                )
            )
            .then(r => r[0]?.count || 0);

        // 4. Leads with interested product (have business activity detected)
        const enrichedLeads = await db.select({ count: sql<number>`count(*)::int` })
            .from(contacts)
            .where(
                and(
                    eq(contacts.source, source),
                    sql`${contacts.businessActivity} IS NOT NULL`,
                    sql`${contacts.createdAt} >= ${since}`
                )
            )
            .then(r => r[0]?.count || 0);

        // 5. Converted to client
        const convertedToClient = await db.select({ count: sql<number>`count(*)::int` })
            .from(contacts)
            .where(
                and(
                    eq(contacts.source, source),
                    eq(contacts.entityType, 'client'),
                    sql`${contacts.createdAt} >= ${since}`
                )
            )
            .then(r => r[0]?.count || 0);

        // 6. Active campaigns
        const activeCampaigns = await db.select({
            id: campaigns.id,
            name: campaigns.name,
            budget: campaigns.budget,
            status: campaigns.status,
            sentCount: campaigns.sentCount,
            responseCount: campaigns.responseCount,
            createdAt: campaigns.createdAt
        })
            .from(campaigns)
            .where(
                or(
                    eq(campaigns.status, 'active'),
                    eq(campaigns.status, 'paused')
                )
            )
            .orderBy(desc(campaigns.createdAt))
            .limit(5);

        // Build funnel
        const stageMap: Record<string, number> = {};
        stageBreakdown.forEach(s => { if (s.status) stageMap[s.status] = s.count; });

        const funnel = {
            total: totalLeads,
            sinContacto: stageMap['sin_contacto'] || 0,
            primerContacto: stageMap['primer_contacto'] || 0,
            segundoContacto: stageMap['segundo_contacto'] || 0,
            tercerContacto: stageMap['tercer_contacto'] || 0,
            convertido: stageMap['convertido'] || stageMap['client'] || 0,
        };

        // Cost estimates (assumes $5/day budget)
        const dailyBudget = 5; // USD
        const totalBudget = dailyBudget * days;
        const costPerLead = totalLeads > 0 ? (totalBudget / totalLeads).toFixed(2) : '—';
        const costPerConversation = conversationsStarted > 0 ? (totalBudget / conversationsStarted).toFixed(2) : '—';

        return NextResponse.json({
            success: true,
            period: { days, since: since.toISOString() },
            funnel,
            conversationsStarted,
            enrichedLeads,
            convertedToClient,
            costs: {
                totalBudget,
                dailyBudget,
                costPerLead,
                costPerConversation
            },
            conversionRate: totalLeads > 0 ? ((convertedToClient / totalLeads) * 100).toFixed(1) : '0.0',
            activeCampaigns,
            stageBreakdown
        });

    } catch (error: any) {
        console.error('❌ Campaign Stats Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
