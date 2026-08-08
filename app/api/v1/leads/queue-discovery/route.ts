import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/leads/queue-discovery
 * Retorna los prospectos de Discovery que están marcados como "en_cola"
 * (los que añadiste con el botón 📋 en /discovery).
 *
 * No toca ninguna tabla, no duplica, no crea contactos. Solo LEE.
 *
 * Query params:
 *   - limit: int (default 200)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    const leads = await db
      .select()
      .from(discoveryLeads)
      .where(eq(discoveryLeads.columna2, 'en_cola'))
      .orderBy(asc(discoveryLeads.createdAt))
      .limit(limit);

    // Mapear a la forma que espera /adquisicion (snake_case de BD → camelCase)
    const mapped = leads.map((l) => ({
      id: l.id,
      businessName: l.nombreComercial || 'Sin nombre',
      contactName: l.personaContacto || l.representanteLegal || 'Desconocido',
      phone: l.telefonoPrincipal || l.telefonoSecundario || null,
      email: l.correoElectronico || null,
      city: l.canton || null,
      address: l.direccion || null,
      businessType: l.actividadModalidad || l.clasificacion || null,
      status: l.status || 'pending',
      _source: 'discovery',
    }));

    return NextResponse.json({
      leads: mapped,
      total: mapped.length,
    });
  } catch (error: any) {
    console.error('[GET /api/v1/leads/queue-discovery]', error);
    return NextResponse.json(
      { error: 'Error al cargar cola de Discovery', details: error.message },
      { status: 500 }
    );
  }
}
