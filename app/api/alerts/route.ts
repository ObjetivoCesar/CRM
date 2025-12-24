import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    try {
        const { searchParams } = new URL(request.url);
        const contactId = searchParams.get('contactId');
        const status = searchParams.get('status') || 'active';
        const severity = searchParams.get('severity');

        let query = supabase
            .from('client_alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (contactId) {
            query = query.eq('contact_id', contactId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (severity) {
            query = query.eq('severity', severity);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching alerts:', error);
            return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error in GET /api/alerts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    try {
        const body = await request.json();
        const {
            contactId,
            interactionId,
            alertType,
            severity,
            title,
            message,
            rawNote,
            confidenceScore,
            extractedEntities
        } = body;

        if (!contactId || !alertType || !severity || !title || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('client_alerts')
            .insert([
                {
                    contact_id: contactId,
                    interaction_id: interactionId,
                    alert_type: alertType,
                    severity,
                    title,
                    message,
                    raw_note: rawNote,
                    confidence_score: confidenceScore,
                    extracted_entities: extractedEntities,
                    status: 'active'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating alert:', error);
            return NextResponse.json(
                { error: 'Failed to create alert' },
                { status: 500 }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/alerts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
