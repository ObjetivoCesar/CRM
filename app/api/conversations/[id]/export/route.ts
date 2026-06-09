import { NextResponse } from 'next/server';
import { messagingService } from '@/lib/messaging/MessagingService';
import { whatsappService } from '@/lib/whatsapp/WhatsAppService';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Guayaquil';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { targetPhone } = await request.json();

        if (!targetPhone) {
            return NextResponse.json({ error: 'targetPhone is required' }, { status: 400 });
        }

        const history = await messagingService.getUnifiedHistory(id);

        if (!history || history.length === 0) {
            return NextResponse.json({ error: 'No message history found' }, { status: 404 });
        }

        // Format history
        const formatted = history.map((msg: any) => {
            const date = new Date(msg.messageTimestamp);
            const zonedDate = toZonedTime(date, TIMEZONE);
            const timeStr = format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
            const roleStr = msg.role === 'user' ? 'Cliente' : msg.role === 'assistant' ? 'Ale (AI)' : 'Sistema';
            return `[${timeStr}] ${roleStr}: ${msg.content}`;
        }).join('\n');

        const exportMessage = `📋 *Exportación de Conversación*\n\n${formatted}`;

        // Send via WhatsApp service
        const normalizedPhone = targetPhone.replace(/\D/g, ''); // keep only digits
        
        await whatsappService.sendMessage(normalizedPhone, exportMessage);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error exporting conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
