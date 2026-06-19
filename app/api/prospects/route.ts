import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { prospects } from '@/lib/db/schema';
import { desc, ilike, or, count, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/prospects
// Supports pagination: ?page=1&limit=50&search=foo
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        // Count total (with optional search filter)
        let totalCountQuery = db.select({ value: count() }).from(prospects);
        if (search) {
            totalCountQuery = totalCountQuery.where(
                or(
                    ilike(prospects.businessName, `%${search}%`),
                    ilike(prospects.contactName, `%${search}%`),
                    ilike(prospects.city, `%${search}%`)
                )
            ) as typeof totalCountQuery;
        }
        const [totalResult] = await totalCountQuery;

        // Fetch paginated data
        let dataQuery = db.select().from(prospects)
            .orderBy(desc(prospects.createdAt))
            .limit(limit)
            .offset(offset);

        if (search) {
            dataQuery = dataQuery.where(
                or(
                    ilike(prospects.businessName, `%${search}%`),
                    ilike(prospects.contactName, `%${search}%`),
                    ilike(prospects.city, `%${search}%`)
                )
            ) as typeof dataQuery;
        }

        const allProspects = await dataQuery;

        const mappedProspects = allProspects.map(p => ({
            id: p.id,
            businessName: p.businessName,
            contactName: p.contactName,
            phone: p.phone,
            email: p.email,
            city: p.city,
            businessType: p.businessType,
            outreachStatus: p.outreachStatus,
            whatsappStatus: p.whatsappStatus,
            notes: p.notes,
            createdAt: p.createdAt,
        }));

        return NextResponse.json({
            data: mappedProspects,
            metadata: {
                page,
                limit,
                totalCount: totalResult?.value || 0,
                totalPages: Math.ceil((totalResult?.value || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Failed to fetch prospects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prospects' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const newProspectData = {
            businessName: body.businessName || 'Desconocido',
            contactName: body.contactName || 'Desconocido',
            phone: body.phone,
            email: body.email,
            city: body.city,
            businessType: body.businessType,
            source: 'manual' as const,
            outreachStatus: 'new' as const,
            whatsappStatus: 'pending' as const,
        };

        const [newProspect] = await db.insert(prospects)
            .values(newProspectData)
            .returning();

        const mappedProspect = {
            id: newProspect.id,
            businessName: newProspect.businessName,
            contactName: newProspect.contactName,
            phone: newProspect.phone,
            email: newProspect.email,
            city: newProspect.city,
            businessType: newProspect.businessType,
            outreachStatus: newProspect.outreachStatus,
            whatsappStatus: newProspect.whatsappStatus,
            notes: newProspect.notes,
            createdAt: newProspect.createdAt,
        };

        return NextResponse.json(mappedProspect);
    } catch (error) {
        console.error('Error creating prospect:', error);
        return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 });
    }
}
