import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    try {
        const cookieStore = cookies();
        const supabase = createServerClient();

        // Standard Auth Check
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('contacts')
            .select('id, business_name, contact_name')
            .eq('entity_type', 'client')
            .or(`business_name.ilike.%${query}%,contact_name.ilike.%${query}%`)
            .limit(limit)
            .order('business_name', { ascending: true });

        if (error) throw error;

        // Map back to camelCase for frontend consistency
        const mappedData = data?.map(c => ({
            id: c.id,
            businessName: c.business_name,
            contactName: c.contact_name
        })) || [];

        return NextResponse.json(mappedData);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
