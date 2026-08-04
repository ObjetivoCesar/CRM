import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, acquisitionCampaigns, contactChannels } from '@/lib/db/schema';
import { formatEcuadorPhone } from '@/lib/utils/phoneFormatter';
import { classifyLeadTarget } from '@/lib/utils/targetClassifier';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface RawProspect {
  nombreNegocio: string;
  contactName?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  canton?: string;
  categoria?: string;
  sitioWeb?: string;
  notes?: string;
}

// POST /api/v1/campaigns/[id]/import — Ingesta masiva de prospectos para una campaña
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const body = await request.json();
    const { prospects } = body as { prospects: RawProspect[] };

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'Formato inválido: se requiere array "prospects"' }, { status: 400 });
    }

    // Verificar que la campaña existe
    const [campaign] = await db.select().from(acquisitionCampaigns).where(eq(acquisitionCampaigns.id, campaignId)).limit(1);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    let insertedCount = 0;

    for (const p of prospects) {
      const phoneInfo = formatEcuadorPhone(p.telefono || '');
      const classification = classifyLeadTarget(p.nombreNegocio, p.categoria || '');

      const businessName = p.nombreNegocio || 'Desconocido';
      const contactName = p.contactName || businessName;
      const phone = phoneInfo.valido ? phoneInfo.e164 : (p.telefono || null);

      // Deduplicación rápida por teléfono o nombre
      let existingId: string | null = null;
      if (phoneInfo.valido && phoneInfo.e164) {
        const [match] = await db.select().from(contacts).where(eq(contacts.phone, phoneInfo.e164)).limit(1);
        if (match) existingId = match.id;
      }

      if (existingId) {
        // Actualizar vínculo con la campaña si no lo tenía
        await db.update(contacts).set({
          campaignId: campaignId,
          updatedAt: new Date()
        }).where(eq(contacts.id, existingId));
      } else {
        // Crear nuevo contacto
        const [inserted] = await db.insert(contacts).values({
          entityType: 'prospect',
          businessName,
          contactName,
          phone,
          email: p.email || null,
          address: p.direccion || null,
          city: p.ciudad || campaign.ciudad || null,
          province: p.provincia || null,
          businessType: p.categoria || null,
          source: 'scraper_geo',
          notes: p.notes || null,
          campaignId: campaignId,
          telefonoE164: phoneInfo.e164,
          telefonoTipo: phoneInfo.tipo,
          esTargetReal: classification.esTargetReal,
        }).returning();

        insertedCount++;

        if (phoneInfo.valido && phoneInfo.e164) {
          try {
            await db.insert(contactChannels).values({
              contactId: inserted.id,
              platform: 'whatsapp',
              identifier: phoneInfo.e164,
              isPrimary: true
            });
          } catch (e) {
            // Ignorar duplicados de canal
          }
        }
      }
    }

    // Actualizar conteo de la campaña
    await db.update(acquisitionCampaigns)
      .set({
        totalProspectos: sql`${acquisitionCampaigns.totalProspectos} + ${insertedCount}`,
        updatedAt: new Date()
      })
      .where(eq(acquisitionCampaigns.id, campaignId));

    return NextResponse.json({
      success: true,
      processed: prospects.length,
      inserted: insertedCount,
      campaignId
    });
  } catch (error) {
    console.error('[POST /api/v1/campaigns/[id]/import]', error);
    return NextResponse.json({ error: 'Error al importar prospectos' }, { status: 500 });
  }
}
