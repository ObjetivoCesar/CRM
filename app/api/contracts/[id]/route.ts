import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

// GET single contract
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const [contract] = await db
            .select()
            .from(schema.contracts)
            .where(eq(schema.contracts.id, params.id));

        if (!contract) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contract' },
            { status: 500 }
        );
    }
}

// PUT update contract
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const updated = await db
            .update(schema.contracts)
            .set({
                title: body.title,
                status: body.status,
                contractData: body.contractData ? JSON.stringify(body.contractData) : undefined,
                pdfUrl: body.pdfUrl,
                signedAt: body.signedAt,
                signedBy: body.signedBy,
                notes: body.notes,
                updatedAt: new Date(),
            })
            .where(eq(schema.contracts.id, params.id))
            .returning();

        if (!updated.length) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Error updating contract:', error);
        return NextResponse.json(
            { error: 'Failed to update contract' },
            { status: 500 }
        );
    }
}

// DELETE contract
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await db
            .delete(schema.contracts)
            .where(eq(schema.contracts.id, params.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting contract:', error);
        return NextResponse.json(
            { error: 'Failed to delete contract' },
            { status: 500 }
        );
    }
}
