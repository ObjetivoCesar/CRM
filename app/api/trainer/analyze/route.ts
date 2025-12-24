import { type NextRequest, NextResponse } from "next/server";
import { TrainerAnalyzer } from "@/lib/trainer/trainer-analyzer";
import { db } from "@/lib/db";
import { callAnalyses } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File;
        const leadId = formData.get("leadId") as string;
        const discoveryLeadId = formData.get("discoveryLeadId") as string;

        if (!audioFile) {
            return NextResponse.json({ error: "No se encontró archivo de audio" }, { status: 400 });
        }

        // 1. Transcribe (Reuse logic or call internal helper)
        // For simplicity, we'll implement it here using OpenAI Whisper
        const apiKey = process.env.OPENAI_API_KEY;
        const transcriptionFormData = new FormData();
        transcriptionFormData.append("file", audioFile);
        transcriptionFormData.append("model", "whisper-1");
        transcriptionFormData.append("language", "es");

        const transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: transcriptionFormData,
        });

        if (!transcribeRes.ok) throw new Error("Transcription failed");
        const { text: transcription } = await transcribeRes.json();

        // 2. Analyze with Trainer Agents
        const analyzer = new TrainerAnalyzer();
        const analysis = await analyzer.analyzeCall(transcription);

        // 3. Save to DB
        const saved = await db.insert(callAnalyses).values({
            leadId: leadId || null,
            discoveryLeadId: discoveryLeadId || null,
            transcription: JSON.stringify({ text: transcription }),
            metrics: JSON.stringify(analysis.metrics),
            feedback: JSON.stringify(analysis.feedback),
            nextFocus: analysis.feedback.next_focus || "",
        }).returning();

        return NextResponse.json({
            success: true,
            analysisId: saved[0].id,
            analysis
        });
    } catch (error) {
        console.error("Error in trainer analyze API:", error);
        return NextResponse.json({ error: "Error al procesar el análisis de la llamada" }, { status: 500 });
    }
}
