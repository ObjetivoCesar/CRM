import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

// GET all contracts
export async function GET() {
    try {
        const contracts = await db
            .select({
                id: schema.contracts.id,
                clientId: schema.contracts.clientId,
                leadId: schema.contracts.leadId,
                title: schema.contracts.title,
                status: schema.contracts.status,
                pdfUrl: schema.contracts.pdfUrl,
                signedAt: schema.contracts.signedAt,
                signedBy: schema.contracts.signedBy,
                createdAt: schema.contracts.createdAt,
                updatedAt: schema.contracts.updatedAt,
                // Join with client data
                clientName: schema.clients.businessName,
                clientContact: schema.clients.contactName,
            })
            .from(schema.contracts)
            .leftJoin(schema.clients, eq(schema.contracts.clientId, schema.clients.id))
            .orderBy(schema.contracts.createdAt);

        return NextResponse.json(contracts);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contracts' },
            { status: 500 }
        );
    }
}

// POST create new contract
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const newContract = await db
            .insert(schema.contracts)
            .values({
                clientId: body.clientId,
                leadId: body.leadId || null,
                title: body.title,
                status: body.status || 'draft',
                contractData: JSON.stringify(body.contractData),
                notes: body.notes || null,
            })
            .returning();

        return NextResponse.json(newContract[0]);
    } catch (error) {
        console.error('Error creating contract:', error);
        return NextResponse.json(
            { error: 'Failed to create contract' },
            { status: 500 }
        );
    }
}
