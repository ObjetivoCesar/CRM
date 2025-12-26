import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { commitments, agents, contacts } from '@/lib/db/schema';
import { eq, and, ne, isNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        // Fetch commitments that are NOT fulfilled/broken
        const activeCommitments = await db
            .select({
                id: commitments.id,
                title: commitments.title,
                description: commitments.description,
                status: commitments.status,
                dueDate: commitments.dueDate,
                severity: commitments.severity,
                actorRole: commitments.actorRole,
                contactName: contacts.contactName,
                businessName: contacts.businessName,
                contactId: contacts.id
            })
            .from(commitments)
            .innerJoin(agents, eq(commitments.agentId, agents.id))
            .innerJoin(contacts, eq(agents.contactId, contacts.id))
            .where(
                and(
                    ne(commitments.status, 'fulfilled'),
                    ne(commitments.status, 'broken')
                )
            )
            .orderBy(commitments.dueDate);

        return NextResponse.json({
            success: true,
            commitments: activeCommitments
        });
    } catch (error) {
        console.error('Donna Active Commitments API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
