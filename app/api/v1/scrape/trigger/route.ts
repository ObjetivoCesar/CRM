import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { acquisitionCampaigns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// POST /api/v1/scrape/trigger — Despacha la orden de scraping hacia el microservicio Railway/Render
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, ciudad, canton, categoria, limit } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId es requerido' }, { status: 400 });
    }

    const [campaign] = await db.select().from(acquisitionCampaigns).where(eq(acquisitionCampaigns.id, campaignId)).limit(1);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    const scraperUrl = process.env.SCRAPER_WEBHOOK_URL;
    const scraperSecret = process.env.SCRAPER_WEBHOOK_SECRET;

    if (!scraperUrl) {
      // Retornar simulación de encolamiento si el microservicio aún no está levantado
      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Modo Simulación: SCRAPER_WEBHOOK_URL no configurado. La orden fue registrada.',
        job: { campaignId, ciudad: ciudad || campaign.ciudad, categoria: categoria || campaign.categoriaBusqueda, limit: limit || 30 }
      });
    }

    // Llamada al microservicio desacoplado (Playwright Docker en Railway/Render)
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${scraperSecret || ''}`,
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        ciudad: ciudad || campaign.ciudad,
        canton: canton || campaign.canton,
        categoria: categoria || campaign.categoriaBusqueda,
        limit: limit || 30,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.objetivo.com'}/api/v1/campaigns/${campaignId}/import`,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Scraper Trigger Error]', errText);
      return NextResponse.json({ error: 'Error al comunicarse con el microservicio de scraping' }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[POST /api/v1/scrape/trigger]', error);
    return NextResponse.json({ error: 'Error interno activando el scraper' }, { status: 500 });
  }
}
