import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, conversationStates, donnaChatMessages, lopdpConsentimientos } from '@/lib/db/schema';
import { whatsappService } from '@/lib/whatsapp/WhatsAppService';
import { getAIClient, getModelId } from '@/lib/ai/client';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ConsentPayload {
  numero: string;
  nombre?: string;
  email?: string;
  acepta_comercial?: boolean;
  acepta_exito?: boolean;
  version?: string;
  url_origen?: string;
}

/**
 * POST /api/webhooks/consentimiento
 * Recibe el webhook de activaqr.com/privacidad cuando un cliente
 * acepta las políticas LOPDP en la web.
 */
export async function POST(req: Request) {
  try {
    const body: ConsentPayload = await req.json();
    const { numero, nombre, email, acepta_comercial, version, url_origen } = body;

    if (!numero) {
      return NextResponse.json({ error: 'Número requerido' }, { status: 400 });
    }

    const cleanPhone = numero.replace(/\D/g, '');
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const auditId = 'REG-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    console.log(`🛡️ [LOPDP] Webhook recibido para ${cleanPhone} (${nombre || 'sin nombre'})`);

    // 0. Save audit trail in lopdp_consentimientos
    try {
      await db.insert(lopdpConsentimientos).values({
        auditId,
        numero: cleanPhone,
        nombre: nombre || null,
        email: email || null,
        aceptaComercial: acepta_comercial ?? true,
        ip,
        userAgent,
        version: version || null,
        urlOrigen: url_origen || null,
      });
      console.log(`🛡️ [LOPDP] Audit trail guardado: ${auditId}`);
    } catch (e: any) {
      console.error('🛡️ [LOPDP] Error guardando audit trail:', e.message);
    }

    // 1. Sync consent to contacts table
    try {
      const last9 = cleanPhone.slice(-9);
      const [contact] = await db.select()
        .from(contacts)
        .where(sql`${contacts.phone} LIKE ${'%' + last9}`)
        .limit(1);

      if (contact) {
        await db.update(contacts)
          .set({
            aceptoProteccion: true,
            aceptoFecha: new Date(),
            contactName: nombre || contact.contactName,
            businessName: nombre || contact.businessName,
          } as any)
          .where(eq(contacts.id, contact.id));
        console.log(`🛡️ [LOPDP] Consent synced to contacts for ${cleanPhone}`);
      }
    } catch (e: any) {
      console.error('🛡️ [LOPDP] Error updating contacts:', e.message);
    }

    // 2. Update conversationStates ficha
    let mensajeOriginal: string | null = null;
    try {
      const [state] = await db.select()
        .from(conversationStates)
        .where(eq(conversationStates.key, cleanPhone))
        .limit(1);

      if (state?.data) {
        const parsed = typeof state.data === 'string'
          ? JSON.parse(state.data as string)
          : state.data;
        const ficha = parsed.ficha || parsed;

        ficha.acepto_proteccion = true;
        ficha.acepto_fecha = new Date().toISOString();
        if (nombre) ficha.nombre = nombre;
        if (!ficha.sesion) ficha.sesion = {};
        ficha.sesion.onboarding_completado = true;
        ficha.sesion.paso_onboarding = 3;
        ficha.sesion.paso_barrera = 0;

        // Recuperar mensaje original que activó la barrera
        mensajeOriginal = ficha.sesion.mensaje_pendiente || null;
        delete ficha.sesion.mensaje_pendiente;

        await db.insert(conversationStates).values({
          key: cleanPhone,
          data: JSON.stringify({ ficha }),
          updatedAt: new Date()
        }).onConflictDoUpdate({
          target: conversationStates.key,
          set: {
            data: JSON.stringify({ ficha }),
            updatedAt: new Date()
          }
        });
        console.log(`🛡️ [LOPDP] Ficha actualizada para ${cleanPhone}`);
      }
    } catch (e: any) {
      console.error('🛡️ [LOPDP] Error updating ficha:', e.message);
    }

    // 3. Send confirmation via WhatsApp
    let msgConfirmacion = `✅ ¡Listo! He registrado tu autorización legal. Sigamos con lo que estábamos conversando...`;
    try {
      const aiClient = getAIClient('FAST');
      const modelId = getModelId('FAST');
      const resp = await aiClient.chat.completions.create({
        model: modelId,
        messages: [{
          role: 'system',
          content: `Eres Ale, de ActivaQR. El cliente acaba de firmar la barrera legal LOPDP. Genera un mensaje corto, profesional (1-2 oraciones) confirmando que la autorización fue registrada.`
        }],
        temperature: 0.7,
        max_tokens: 100,
      });
      const llmMsg = resp.choices[0]?.message?.content?.trim();
      if (llmMsg && llmMsg.length > 10) msgConfirmacion = llmMsg;
    } catch (e: any) {
      console.error('🛡️ [LOPDP] Error generating confirmation:', e.message);
    }

    await whatsappService.sendMessage(cleanPhone, msgConfirmacion);

    // 4. Save confirmation in chat history
    try {
      await db.insert(donnaChatMessages).values({
        chatId: cleanPhone,
        role: 'assistant',
        content: msgConfirmacion,
        platform: 'whatsapp',
        messageTimestamp: new Date(),
        metadata: { source: 'lopdp_consentimiento_webhook', audit_id: auditId }
      });
    } catch (e: any) {
      console.error('🛡️ [LOPDP] Error saving confirmation:', e.message);
    }

    // 5. Replay original message if exists (will be picked up by worker)
    if (mensajeOriginal) {
      console.log(`🛡️ [LOPDP] Mensaje pendiente para replay: "${mensajeOriginal.substring(0, 80)}"`);
      try {
        const { pendingMessagesQueue } = await import('@/lib/db/schema');
        await db.insert(pendingMessagesQueue).values({
          chatId: cleanPhone,
          content: mensajeOriginal,
          platform: 'whatsapp',
          receivedAt: new Date(),
          metadata: { source: 'lopdp_replay', audit_id: auditId }
        });
        console.log(`🛡️ [LOPDP] Mensaje reencolado para procesamiento.`);
      } catch (e: any) {
        console.error('🛡️ [LOPDP] Error en replay:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      audit_id: auditId,
      message: 'Consentimiento registrado correctamente'
    });

  } catch (error: any) {
    console.error('🛡️ [LOPDP] Webhook error:', error.message);
    return NextResponse.json(
      { error: 'Error interno al procesar consentimiento' },
      { status: 500 }
    );
  }
}
