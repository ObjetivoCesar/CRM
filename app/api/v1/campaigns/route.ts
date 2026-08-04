import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { acquisitionCampaigns } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/v1/campaigns — Lista todas las campañas de adquisición con orden descendente
export async function GET() {
  try {
    const campaigns = await db.select().from(acquisitionCampaigns).orderBy(desc(acquisitionCampaigns.createdAt));
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('[GET /api/v1/campaigns]', error);
    return NextResponse.json({ error: 'Error al listar campañas' }, { status: 500 });
  }
}

// POST /api/v1/campaigns — Crea una nueva campaña de adquisición
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, descripcion, fuenteTipo, ciudad, canton, categoriaBusqueda, scriptId, metadata } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El campo nombre es obligatorio' }, { status: 400 });
    }

    const [created] = await db.insert(acquisitionCampaigns).values({
      nombre,
      descripcion: descripcion || null,
      fuenteTipo: fuenteTipo || 'scraper_google',
      ciudad: ciudad || null,
      canton: canton || null,
      categoriaBusqueda: categoriaBusqueda || null,
      scriptId: scriptId || null,
      metadata: metadata || {},
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/v1/campaigns]', error);
    return NextResponse.json({ error: 'Error al crear campaña' }, { status: 500 });
  }
}
