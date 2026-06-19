import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId');
  const discoveryLeadId = searchParams.get('discoveryLeadId');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

  try {
    // Build query with conditions
    const conditions = [];
    if (contactId) {
      conditions.push(eq(interactions.contactId, contactId));
    }
    if (discoveryLeadId) {
      conditions.push(eq(interactions.discoveryLeadId, discoveryLeadId));
    }

    let query = db.select()
      .from(interactions)
      .orderBy(desc(interactions.performedAt))
      .limit(limit);

    // Apply conditions if any
    if (conditions.length === 1) {
      query = query.where(conditions[0]) as typeof query;
    } else if (conditions.length === 2) {
      // Both filters: AND them
      const { and } = await import('drizzle-orm');
      query = query.where(and(conditions[0], conditions[1])) as typeof query;
    }

    const allInteractions = await query;

    // Map to camelCase for frontend consistency
    // Drizzle already returns camelCase from our schema, so minimal mapping needed
    const mapped = allInteractions.map((i) => ({
      id: i.id,
      type: i.type,
      direction: i.direction,
      content: i.content,
      outcome: i.outcome,
      duration: i.duration,
      contactId: i.contactId,
      discoveryLeadId: i.discoveryLeadId,
      performedAt: i.performedAt,
      metadata: i.metadata,
      createdAt: i.createdAt
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const interactionData = {
      type: body.type as any,
      direction: body.direction as any,
      content: body.content,
      outcome: body.outcome,
      duration: body.duration,
      contactId: body.contactId || body.relatedClientId || null, // ✅ Compatibilidad total
      discoveryLeadId: body.discoveryLeadId || body.relatedLeadId || null,
      performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
    };

    const [newInteraction] = await db.insert(interactions)
      .values(interactionData)
      .returning();

    // Map back to camelCase for frontend consistency
    const mappedInteraction = {
      id: newInteraction.id,
      type: newInteraction.type,
      direction: newInteraction.direction,
      content: newInteraction.content,
      outcome: newInteraction.outcome,
      duration: newInteraction.duration,
      contactId: newInteraction.contactId,
      discoveryLeadId: newInteraction.discoveryLeadId,
      performedAt: newInteraction.performedAt,
      createdAt: newInteraction.createdAt
    };

    return NextResponse.json(mappedInteraction);
  } catch (error) {
    console.error('Error creating interaction:', error);
    return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
  }
}
