
import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq, and, like, sql, isNotNull, not, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Base filters (what the user has already selected)
        const provincia = searchParams.get('provincia');
        const canton = searchParams.get('canton');
        const actividad = searchParams.get('actividad_modalidad');
        const categoria = searchParams.get('categoria');
        const clasificacion = searchParams.get('clasificacion');
        const status = searchParams.get('status');
        const col1 = searchParams.get('columna1');
        const col2 = searchParams.get('columna2');


        // Helper to build conditions
        const buildConditions = (excludeField?: string) => {
            const conditions = [];

            if (provincia && provincia !== 'all' && excludeField !== 'provincia') {
                conditions.push(inArray(discoveryLeads.provincia, provincia.split(',') as any));
            }
            if (canton && canton !== 'all' && excludeField !== 'canton') {
                conditions.push(inArray(discoveryLeads.canton, canton.split(',') as any));
            }
            if (actividad && actividad !== 'all' && excludeField !== 'actividad') {
                conditions.push(inArray(discoveryLeads.actividadModalidad, actividad.split(',') as any));
            }
            if (categoria && categoria !== 'all' && excludeField !== 'categoria') {
                conditions.push(inArray(discoveryLeads.categoria, categoria.split(',') as any));
            }
            if (clasificacion && clasificacion !== 'all' && excludeField !== 'clasificacion') {
                conditions.push(inArray(discoveryLeads.clasificacion, clasificacion.split(',') as any));
            }
            if (status && status !== 'all' && excludeField !== 'status') {
                conditions.push(inArray(discoveryLeads.status, status.split(',') as any));
            }
            if (col1 && col1 !== 'all' && excludeField !== 'col1') {
                conditions.push(inArray(discoveryLeads.columna1, col1.split(',') as any));
            }
            if (col2 && col2 !== 'all' && excludeField !== 'col2') {
                conditions.push(inArray(discoveryLeads.columna2, col2.split(',') as any));
            }

            return conditions.length > 0 ? and(...conditions) : undefined;
        };

        const [provincesRaw, cantonsRaw, activitiesRaw, categoriesRaw, clasificacionesRaw, col1Raw, col2Raw, statusRaw] = await Promise.all([
            // Provinces
            db.selectDistinct({ val: discoveryLeads.provincia })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.provincia), not(eq(discoveryLeads.provincia, '')), buildConditions('provincia')))
                .orderBy(discoveryLeads.provincia),

            // Cantons
            db.selectDistinct({ val: discoveryLeads.canton })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.canton), not(eq(discoveryLeads.canton, '')), buildConditions('canton')))
                .orderBy(discoveryLeads.canton),

            // Activities
            db.selectDistinct({ val: discoveryLeads.actividadModalidad })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.actividadModalidad), not(eq(discoveryLeads.actividadModalidad, '')), buildConditions('actividad')))
                .orderBy(discoveryLeads.actividadModalidad),

            // Categories
            db.selectDistinct({ val: discoveryLeads.categoria })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.categoria), not(eq(discoveryLeads.categoria, '')), buildConditions('categoria')))
                .orderBy(discoveryLeads.categoria),

            // Clasificaciones
            db.selectDistinct({ val: discoveryLeads.clasificacion })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.clasificacion), not(eq(discoveryLeads.clasificacion, '')), buildConditions('clasificacion')))
                .orderBy(discoveryLeads.clasificacion),

            // Columna 1
            db.selectDistinct({ val: discoveryLeads.columna1 })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.columna1), buildConditions('col1')))
                .orderBy(discoveryLeads.columna1),

            // Columna 2
            db.selectDistinct({ val: discoveryLeads.columna2 })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.columna2), buildConditions('col2')))
                .orderBy(discoveryLeads.columna2),

            // Status
            db.selectDistinct({ val: discoveryLeads.status })
                .from(discoveryLeads)
                .where(and(isNotNull(discoveryLeads.status), buildConditions('status')))
                .orderBy(discoveryLeads.status),
        ]);

        return NextResponse.json({
            provinces: provincesRaw.map(p => p.val).filter(Boolean),
            cantons: cantonsRaw.map(c => c.val).filter(Boolean),
            activities: activitiesRaw.map(a => a.val).filter(Boolean),
            categories: categoriesRaw.map(c => c.val).filter(Boolean),
            clasificaciones: clasificacionesRaw.map(c => c.val).filter(Boolean),
            columna1: col1Raw.map(c => c.val).filter(Boolean),
            columna2: col2Raw.map(c => c.val).filter(Boolean),
            status: statusRaw.map(s => s.val).filter(Boolean),
        });

    } catch (error) {
        console.error('Error fetching facets:', error);
        return NextResponse.json({ error: 'Failed to fetch facets' }, { status: 500 });
    }
}
