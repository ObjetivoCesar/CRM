import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq, desc, and, sql, inArray, like } from 'drizzle-orm';

// GET discovery leads with filters and pagination
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Extract query parameters
        const provincia = searchParams.get('provincia');
        const canton = searchParams.get('canton');
        const actividadModalidad = searchParams.get('actividad_modalidad');
        const categoria = searchParams.get('categoria');
        const clasificacion = searchParams.get('clasificacion');
        const web = searchParams.get('web');
        const email = searchParams.get('email');
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const col1 = searchParams.get('columna1');
        const col2 = searchParams.get('columna2');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build dynamic filters
        const filters: any[] = [];

        if (provincia && provincia !== 'all') {
            const values = provincia.split(',');
            filters.push(inArray(discoveryLeads.provincia, values));
        }
        if (canton && canton !== 'all') {
            const values = canton.split(',');
            filters.push(inArray(discoveryLeads.canton, values));
        }
        if (actividadModalidad && actividadModalidad !== 'all') {
            const values = actividadModalidad.split(',');
            filters.push(inArray(discoveryLeads.actividadModalidad, values));
        }
        if (categoria && categoria !== 'all') {
            const values = categoria.split(',');
            filters.push(inArray(discoveryLeads.categoria, values));
        }
        if (clasificacion && clasificacion !== 'all') {
            const values = clasificacion.split(',');
            filters.push(inArray(discoveryLeads.clasificacion, values));
        }
        if (web) {
            filters.push(like(discoveryLeads.direccionWeb, `%${web}%`));
        }
        if (email) {
            filters.push(like(discoveryLeads.correoElectronico, `%${email}%`));
        }
        if (status && status !== 'all') {
            const values = status.split(',');
            filters.push(inArray(discoveryLeads.status, values as any));
        }
        if (col1 && col1 !== 'all') {
            const values = col1.split(',');
            filters.push(inArray(discoveryLeads.columna1, values as any));
        }
        if (col2 && col2 !== 'all') {
            const values = col2.split(',');
            filters.push(inArray(discoveryLeads.columna2, values as any));
        }
        if (search) {
            // Search in business name
            filters.push(like(discoveryLeads.nombreComercial, `%${search}%`));
        }

        // Count total matching records
        const [{ count: totalCount }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(discoveryLeads)
            .where(filters.length > 0 ? and(...filters) : undefined);

        // Fetch paginated results
        const offset = (page - 1) * limit;
        const rawLeads = await db
            .select()
            .from(discoveryLeads)
            .where(filters.length > 0 ? and(...filters) : undefined)
            .orderBy(desc(discoveryLeads.createdAt))
            .limit(limit)
            .offset(offset);

        // Map to frontend interface
        const leads = rawLeads.map(lead => ({
            id: lead.id,
            ruc: lead.ruc,
            businessName: lead.nombreComercial,
            businessType: lead.actividadModalidad || lead.tipoEstablecimiento,
            category: lead.categoria,
            province: lead.provincia,
            city: lead.canton,
            representative: lead.representanteLegal || lead.razonSocialPropietario,
            phone1: lead.telefonoPrincipal,
            phone2: lead.telefonoSecundario,
            email: lead.correoElectronico,
            address: lead.direccion,
            researchData: lead.researchData,
            status: lead.status,
            columna1: lead.columna1,
            columna2: lead.columna2,
            clasificacion: lead.clasificacion,
            createdAt: lead.createdAt,
            bookingInfo: lead.bookingInfo,
            googleInfo: lead.googleInfo,
            razonSocialPropietario: lead.razonSocialPropietario, // Keeping raw for specific logic
        }));

        return NextResponse.json({
            leads,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error('Error fetching discovery leads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch discovery leads' },
            { status: 500 }
        );
    }
}

// POST create new discovery lead
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const [newLeadRaw] = await db
            .insert(discoveryLeads)
            .values({
                ruc: body.ruc,
                nombreComercial: body.businessName,
                actividadModalidad: body.businessType, // Best effort mapping
                representanteLegal: body.representative,
                canton: body.city,
                telefonoPrincipal: body.phone1,
                telefonoSecundario: body.phone2,
                correoElectronico: body.email,
                direccion: body.address,
                status: 'pending',
            })
            .returning();

        // return mapped object
        const newLead = {
            id: newLeadRaw.id,
            ruc: newLeadRaw.ruc,
            businessName: newLeadRaw.nombreComercial,
            businessType: newLeadRaw.actividadModalidad,
            representative: newLeadRaw.representanteLegal,
            city: newLeadRaw.canton,
            phone1: newLeadRaw.telefonoPrincipal,
            phone2: newLeadRaw.telefonoSecundario,
            email: newLeadRaw.correoElectronico,
            address: newLeadRaw.direccion,
            researchData: newLeadRaw.researchData,
            status: newLeadRaw.status,
            createdAt: newLeadRaw.createdAt,
        };

        return NextResponse.json(newLead);
    } catch (error) {
        console.error('Error creating discovery lead:', error);
        return NextResponse.json(
            { error: 'Failed to create discovery lead' },
            { status: 500 }
        );
    }
}
