import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp/WhatsAppService';
import { db } from '@/lib/db';
import { donnaChatMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * POST /api/widget/send
 * 
 * Proxy endpoint for the embeddable chat widget.
 * Sends a message via WhatsApp Cloud API on behalf of a visitor.
 * The CRM's webhook + worker handles the bot response automatically.
 * 
 * Body: { phone: string, message: string, visitorId: string }
 */
export async function POST(request: Request) {
    try {
        const { phone, message, visitorId } = await request.json();

        if (!phone || !message) {
            return NextResponse.json({ success: false, error: 'phone and message required' }, { status: 400 });
        }

        // Send via Meta WhatsApp Cloud API
        const result = await whatsappService.sendMessage(phone, `[Web Widget] ${message}`);

        if (result.success) {
            return NextResponse.json({ success: true, data: result.data });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error('❌ Widget Send Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/widget/history?phone=593...
 * 
 * Returns the last N messages for a visitor (pulled from donnaChatMessages).
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!phone) {
        return NextResponse.json({ success: false, error: 'phone required' }, { status: 400 });
    }

    try {
        const messages = await db.select()
            .from(donnaChatMessages)
            .where(eq(donnaChatMessages.chatId, phone))
            .orderBy(desc(donnaChatMessages.messageTimestamp))
            .limit(limit);

        const formatted = messages.reverse().map(m => ({
            role: m.role,
            content: m.content.replace('[Web Widget] ', ''),
            timestamp: m.messageTimestamp,
        }));

        return NextResponse.json({ success: true, messages: formatted });
    } catch (error: any) {
        console.error('❌ Widget History Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
