
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactChannels, contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params; // Contact ID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let channels: any[] = [];
        if (isUUID) {
            channels = await db.select()
                .from(contactChannels)
                .where(eq(contactChannels.contactId, id));
        } else {
            const [contact] = await db.select({ id: contacts.id })
                .from(contacts)
                .where(eq(contacts.phone, id))
                .limit(1);
            if (contact) {
                channels = await db.select()
                    .from(contactChannels)
                    .where(eq(contactChannels.contactId, contact.id));
            }
        }

        return NextResponse.json(channels);

    } catch (error: any) {
        console.error('Error fetching channels:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
