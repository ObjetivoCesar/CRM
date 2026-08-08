import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAnalyses, contacts, leads, discoveryLeads, salesScripts, acquisitionCampaigns } from '@/lib/db/schema';
import { transcriptionService } from '@/lib/ai/TranscriptionService';
import { evaluatePitch } from '@/lib/ai/pitchEvaluator';
import { eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// POST /api/v1/campaigns/[id]/recordings — Pipeline de audio + transcripción + evaluación de pitch
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const contactId = formData.get('contactId') as string;
    const scriptIdParam = formData.get('scriptId') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'Archivo de audio no recibido' }, { status: 400 });
    }
    if (!contactId) {
      return NextResponse.json({ error: 'ID de contacto requerido' }, { status: 400 });
    }

    // 1. Transcribir audio usando TranscriptionService existente
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const transcription = await transcriptionService.transcribe(audioBuffer, audioFile.name || 'call_recording.webm');

    if (!transcription || transcription.startsWith('[Error')) {
      return NextResponse.json({ error: 'Error durante la transcripción del audio' }, { status: 500 });
    }

    // 2. Obtener Guion para la evaluación
    let scriptPasos: any[] = [];
    let scriptIdToSave: string | null = scriptIdParam || null;

    if (scriptIdToSave) {
      const [s] = await db.select().from(salesScripts).where(eq(salesScripts.id, scriptIdToSave)).limit(1);
      if (s && Array.isArray(s.pasos)) scriptPasos = s.pasos;
    }

    if (scriptPasos.length === 0) {
      // Fallback: buscar guion de la campaña
      const [camp] = await db.select().from(acquisitionCampaigns).where(eq(acquisitionCampaigns.id, campaignId)).limit(1);
      if (camp?.scriptId) {
        scriptIdToSave = camp.scriptId;
        const [s] = await db.select().from(salesScripts).where(eq(salesScripts.id, camp.scriptId)).limit(1);
        if (s && Array.isArray(s.pasos)) scriptPasos = s.pasos;
      }
    }

    // 3. Evaluar pitch con Llama 3.3 (vía Groq)
    const evalResult = await evaluatePitch(transcription, scriptPasos);

    // Calcular fecha de expiración de audio (30 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 4. Determinar a qué tabla pertenece contactId: contacts, leads o discovery_leads
    let contactIdForInsert: string | null = null;
    let leadIdForInsert: string | null = null;
    let discoveryLeadIdForInsert: string | null = null;
    let prospectSource: 'contacts' | 'leads' | 'discovery_leads' | 'unknown' = 'unknown';

    try {
      // Buscar primero en contacts
      const [contactMatch] = await db.select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);

      if (contactMatch) {
        contactIdForInsert = contactId;
        prospectSource = 'contacts';
      } else {
        // Buscar en leads
        const [leadMatch] = await db.select({ id: leads.id })
          .from(leads)
          .where(eq(leads.id, contactId))
          .limit(1);
        if (leadMatch) {
          leadIdForInsert = contactId;
          prospectSource = 'leads';
        } else {
          // Buscar en discovery_leads
          const [discoveryMatch] = await db.select({ id: discoveryLeads.id })
            .from(discoveryLeads)
            .where(eq(discoveryLeads.id, contactId))
            .limit(1);
          if (discoveryMatch) {
            discoveryLeadIdForInsert = contactId;
            prospectSource = 'discovery_leads';
          }
        }
      }
      console.log(`🎯 [recordings] Prospect source detected: ${prospectSource} for ID ${contactId}`);
    } catch (e: any) {
      console.warn('⚠️ [recordings] Could not detect prospect source:', e.message);
    }

    // 5. Guardar en call_analyses
    let insertedAnalysis: any = null;
    try {
      const [row] = await db.insert(callAnalyses).values({
        contactId: contactIdForInsert,
        leadId: leadIdForInsert,
        discoveryLeadId: discoveryLeadIdForInsert,
        campaignId,
        scriptId: scriptIdToSave,
        transcription,
        metrics: JSON.stringify(evalResult),
        feedback: JSON.stringify({ fortalezas: evalResult.fortalezas, mejoras: evalResult.mejoras }),
        nextFocus: evalResult.mejoras[0] || 'Seguir practicando guion',
        audioExpiresAt: expiresAt,
      } as any).returning();
      insertedAnalysis = row;
    } catch (dbErr: any) {
      console.warn('⚠️ [recordings] No se pudo guardar en call_analyses:', dbErr.message);
    }

    // 6. Actualizar métricas de la campaña
    try {
      await db.update(acquisitionCampaigns)
        .set({
          totalLlamadas: sql`${acquisitionCampaigns.totalLlamadas} + 1`,
          updatedAt: new Date()
        })
        .where(eq(acquisitionCampaigns.id, campaignId));
    } catch (e: any) {
      console.warn('⚠️ [recordings] No se pudo actualizar counter de campaña:', e.message);
    }

    // 7. Actualizar el estado del prospecto según la fuente detectada
    try {
      if (prospectSource === 'contacts') {
        await db.update(contacts)
          .set({ status: 'contactado', lastActivityAt: new Date(), updatedAt: new Date() })
          .where(eq(contacts.id, contactId));
      } else if (prospectSource === 'discovery_leads') {
        // discovery_leads.status es: pending|investigated|no_answer|not_interested|sent_info|converted|discarded
        // Para "ya lo llamé" usamos 'no_answer' (fue contactado pero sin respuesta) o 'investigated' (sí habló)
        await db.update(discoveryLeads)
          .set({ status: 'investigated', updatedAt: new Date() })
          .where(eq(discoveryLeads.id, contactId));
        console.log(`📍 [recordings] Marcado discovery_lead ${contactId} como 'investigated'`);
      } else if (prospectSource === 'leads') {
        // leads.status es: sin_contacto|primer_contacto|segundo_contacto|tercer_contacto|cotizado|convertido
        await db.update(leads)
          .set({ status: 'primer_contacto', updatedAt: new Date() })
          .where(eq(leads.id, contactId));
      }
    } catch (e: any) {
      console.warn(`⚠️ [recordings] No se pudo actualizar ${prospectSource}:`, e.message);
    }

    return NextResponse.json({
      success: true,
      analysisId: insertedAnalysis?.id || null,
      prospectSource,
      transcription,
      evaluation: evalResult,
      audioExpiresAt: expiresAt,
      _persistence_warning: insertedAnalysis ? null : 'No se pudo guardar análisis en BD (pero la evaluación se generó OK)',
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/v1/campaigns/[id]/recordings]', error);
    return NextResponse.json({ error: 'Error procesando la grabación y evaluación' }, { status: 500 });
  }
}
