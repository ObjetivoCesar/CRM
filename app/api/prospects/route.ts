import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/prospects
// Supports pagination: ?page=1&limit=50&search=foo
export async function GET(request: NextRequest) {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''
        const offset = (page - 1) * limit

        let query = supabase
            .from('prospects')
            .select('*', { count: 'exact' })

        if (search) {
            query = query.or(`business_name.ilike.%${search}%,contact_name.ilike.%${search}%,city.ilike.%${search}%`)
        }

        const { data: allProspects, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Failed to fetch prospects:', error)
            return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
        }

        const mappedProspects = allProspects?.map(p => ({
            id: p.id,
            businessName: p.business_name,
            contactName: p.contact_name,
            phone: p.phone,
            email: p.email,
            city: p.city,
            businessType: p.business_type,
            outreachStatus: p.outreach_status,
            whatsappStatus: p.whatsapp_status,
            notes: p.notes,
            createdAt: p.created_at,
        })) || []

        return NextResponse.json({
            data: mappedProspects,
            metadata: {
                page,
                limit,
                totalCount: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })
    } catch (error) {
        console.error('Failed to fetch prospects:', error)
        return NextResponse.json(
            { error: 'Failed to fetch prospects' },
            { status: 500 }
        )
    }
}

export async function POST(req: Request) {
    const cookieStore = cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const body = await req.json();

        const newProspectData = {
            business_name: body.businessName,
            contact_name: body.contactName,
            phone: body.phone,
            email: body.email,
            city: body.city,
            business_type: body.businessType,
            source: 'manual',
            outreach_status: 'new', // Default
            whatsapp_status: 'pending' // Default
        };

        const { data: newProspect, error } = await supabase
            .from('prospects')
            .insert([newProspectData])
            .select()
            .single();

        if (error) {
            console.error('Error creating prospect:', error);
            return NextResponse.json({ error: 'Failed to create prospect: ' + error.message }, { status: 500 });
        }

        const mappedProspect = {
            id: newProspect.id,
            businessName: newProspect.business_name,
            contactName: newProspect.contact_name,
            phone: newProspect.phone,
            email: newProspect.email,
            city: newProspect.city,
            businessType: newProspect.business_type,
            outreachStatus: newProspect.outreach_status,
            whatsappStatus: newProspect.whatsapp_status,
            notes: newProspect.notes,
            createdAt: newProspect.created_at,
        };

        return NextResponse.json(mappedProspect);
    } catch (error) {
        console.error('Error creating prospect:', error);
        return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 });
    }
}
