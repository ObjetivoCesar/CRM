import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const contactId = params.id;

        const [agent] = await db
            .select()
            .from(agents)
            .where(eq(agents.contactId, contactId))
            .limit(1);

        return NextResponse.json({
            success: true,
            agent: agent || null
        });
    } catch (error) {
        console.error('Donna Agent API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
