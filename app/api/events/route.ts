import { db, schema } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const allEvents = await db.select().from(schema.events);
    return NextResponse.json(allEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newEvent = await db.insert(schema.events).values({
        ...body,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime)
    }).returning();
    return NextResponse.json(newEvent[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
