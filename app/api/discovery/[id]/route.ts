import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

// PATCH - Update discovery lead (for tagging - SIMPLIFIED)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { columna1, columna2, status } = body;

        const updateData: any = {};
        if (columna1) updateData.columna1 = columna1;
        if (columna2) updateData.columna2 = columna2;
        if (status) updateData.status = status;

        const [updated] = await db
            .update(discoveryLeads)
            .set(updateData)
            .where(eq(discoveryLeads.id, params.id))
            .returning();

        // No auto-conversion here - that happens in Trainer
        return NextResponse.json({ success: true, discoveryLead: updated });
    } catch (error) {
        console.error('Error updating discovery lead:', error);
        return NextResponse.json(
            { error: 'Failed to update discovery lead' },
            { status: 500 }
        );
    }
}
