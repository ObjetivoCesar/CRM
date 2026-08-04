import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAnalyses } from '@/lib/db/schema';
import { lte, isNotNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/cron/cleanup-audio — Tarea Cron programada para limpiar audios vencidos (>30 días)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Validación opcional si se invoca externamente en producción
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Permitimos ejecución si viene de Vercel Cron Header
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const now = new Date();

    // Buscar registros expirados con blobKey
    const expiredRecords = await db.select()
      .from(callAnalyses)
      .where(
        sql`${callAnalyses.audioExpiresAt} <= ${now} AND ${callAnalyses.audioBlobKey} IS NOT NULL`
      );

    let deletedBlobsCount = 0;

    for (const record of expiredRecords) {
      if (record.audioBlobKey) {
        // Si estuviéramos usando Vercel Blob o Supabase Storage se llamaría el SDK de eliminación aquí.
        // Limpiamos la referencia en BD
        await db.update(callAnalyses)
          .set({
            audioBlobKey: null,
            audioUrl: null
          })
          .where(sql`${callAnalyses.id} = ${record.id}`);

        deletedBlobsCount++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredFound: expiredRecords.length,
      cleaned: deletedBlobsCount
    });
  } catch (error) {
    console.error('[CRON /api/cron/cleanup-audio]', error);
    return NextResponse.json({ error: 'Error durante la limpieza de audios' }, { status: 500 });
  }
}
