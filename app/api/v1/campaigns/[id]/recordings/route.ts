import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAnalyses, contacts, salesScripts, acquisitionCampaigns } from '@/lib/db/schema';
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

    // 4. Guardar en call_analyses (tabla unificada del Trainer)
    const [insertedAnalysis] = await db.insert(callAnalyses).values({
      contactId,
      campaignId,
      scriptId: scriptIdToSave,
      transcription,
      metrics: JSON.stringify(evalResult),
      feedback: JSON.stringify({ fortalezas: evalResult.fortalezas, mejoras: evalResult.mejoras }),
      nextFocus: evalResult.mejoras[0] || 'Seguir practicando guion',
      audioExpiresAt: expiresAt,
    }).returning();

    // Actualizar métricas de la campaña y del contacto
    await db.update(acquisitionCampaigns)
      .set({
        totalLlamadas: sql`${acquisitionCampaigns.totalLlamadas} + 1`,
        updatedAt: new Date()
      })
      .where(eq(acquisitionCampaigns.id, campaignId));

    await db.update(contacts)
      .set({
        status: 'contactado',
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(contacts.id, contactId));

    return NextResponse.json({
      success: true,
      analysisId: insertedAnalysis.id,
      transcription,
      evaluation: evalResult,
      audioExpiresAt: expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/v1/campaigns/[id]/recordings]', error);
    return NextResponse.json({ error: 'Error procesando la grabación y evaluación' }, { status: 500 });
  }
}
