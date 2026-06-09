
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isUUID) {
            await db.update(contacts)
                .set({ unreadCount: 0 })
                .where(eq(contacts.id, id));
        } else {
            await db.update(contacts)
                .set({ unreadCount: 0 })
                .where(eq(contacts.phone, id));
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error marking as read:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
