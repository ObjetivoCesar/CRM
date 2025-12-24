import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
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
        const { status, resolvedBy } = body;

        const updateData: any = { status };

        if (status === 'resolved' || status === 'dismissed') {
            updateData.resolved_at = new Date().toISOString();
            if (resolvedBy) {
                updateData.resolved_by = resolvedBy;
            }
        }

        const { data, error } = await supabase
            .from('client_alerts')
            .update(updateData)
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating alert:', error);
            return NextResponse.json(
                { error: 'Failed to update alert' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in PATCH /api/alerts/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
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
        const { error } = await supabase
            .from('client_alerts')
            .delete()
            .eq('id', params.id);

        if (error) {
            console.error('Error deleting alert:', error);
            return NextResponse.json(
                { error: 'Failed to delete alert' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/alerts/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
