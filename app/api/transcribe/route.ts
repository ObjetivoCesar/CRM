import { type NextRequest, NextResponse } from "next/server"
import { transcriptionService } from '@/lib/ai/TranscriptionService';

/**
 * Unified Transcription API — Single entry point for ALL audio transcription.
 * 
 * Used by:
 * - Recorridos (lead-capture-form.tsx): Michael's field recordings
 * - Any future module that needs speech-to-text
 * 
 * Pipeline: Gemini cascade (6 keys) → Groq → OpenAI Whisper
 * Max audio: ~2 min (5MB buffer limit). Exceeded → auto-reject with friendly message.
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No se encontró archivo de audio" }, { status: 400 })
    }

    // Convert File to Buffer for unified TranscriptionService
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const transcription = await transcriptionService.transcribe(audioBuffer, audioFile.name || 'audio.wav');

    // null = audio too long
    if (transcription === null) {
      return NextResponse.json({ 
        error: transcriptionService.getTooLongMessage(),
        tooLong: true 
      }, { status: 413 });
    }

    // Error marker
    if (transcription.startsWith('[Error')) {
      return NextResponse.json({ error: transcriptionService.getTranscriptionFailedMessage() }, { status: 500 });
    }

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("Error in transcribe API:", error);
    return NextResponse.json({ error: "Error al transcribir el audio" }, { status: 500 });
  }
}
