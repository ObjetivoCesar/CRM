import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { referralLeads } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const apiKey = req.headers.get('x-api-key');
        if (apiKey !== 'bk_live_9f83a710e42d8c91b53e77f0a421bc06') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { phone } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
        }

        // Normalizar teléfono (solo números, formato internacional sin +)
        const cleanPhone = phone.replace(/\D/g, '');

        // Buscar lead activo (no convertido, no expirado)
        // First-Touch Attribution (el lead más antiguo que siga activo)
        const now = new Date();
        const fortyFiveDaysAgo = new Date();
        fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

        const [lead] = await db.select()
            .from(referralLeads)
            .where(
                and(
                    eq(referralLeads.phone, cleanPhone),
                    eq(referralLeads.converted, false),
                    gte(referralLeads.capturedAt, fortyFiveDaysAgo)
                )
            )
            .orderBy(sql`${referralLeads.capturedAt} ASC`) // First-touch
            .limit(1);

        if (lead) {
            // Marcar como convertido para que no se use de nuevo
            await db.update(referralLeads)
                .set({ converted: true, updatedAt: new Date() })
                .where(eq(referralLeads.id, lead.id));

            return NextResponse.json({
                hasCommission: true,
                referralCode: lead.referralCode,
                capturedAt: lead.capturedAt
            });
        }

        return NextResponse.json({
            hasCommission: false,
            referralCode: null
        });

    } catch (error) {
        console.error('[ReferralSaleWebhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
