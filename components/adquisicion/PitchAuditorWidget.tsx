"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Sparkles, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface PitchAuditorWidgetProps {
  campaignId: string;
  contactId: string | null;
  onEvaluationComplete?: (result: any) => void;
}

export function PitchAuditorWidget({ campaignId, contactId, onEvaluationComplete }: PitchAuditorWidgetProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!contactId) {
      toast.error("Selecciona un prospecto para evaluar la llamada");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleUploadAndAudit(audioBlob);
      };

      mediaRecorderRef.current.start(1000);
      setRecording(true);
      setEvaluation(null);
      toast.info("🔴 Grabando llamada commercial...");
    } catch (err) {
      toast.error("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setRecording(false);
    }
  };

  const handleUploadAndAudit = async (audioBlob: Blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "call_recording.webm");
      formData.append("contactId", contactId!);

      const res = await fetch(`/api/v1/campaigns/${campaignId}/recordings`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error en el pipeline de evaluación");

      const data = await res.json();
      setEvaluation(data.evaluation);
      toast.success(`Evaluación completada: ⭐ ${data.evaluation.puntajeGlobal}/100`);

      if (onEvaluationComplete) onEvaluationComplete(data);
    } catch (err) {
      toast.error("No se pudo evaluar el pitch");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="border shadow-sm flex flex-col h-full bg-card">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Pitch Auditor IA
        </CardTitle>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Audios guardados 30 días
        </span>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-center py-2">
          {!recording ? (
            <Button
              onClick={startRecording}
              disabled={processing || !contactId}
              className="h-16 w-16 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <Mic className="h-7 w-7 text-white" />
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg flex items-center justify-center animate-pulse"
            >
              <Square className="h-6 w-6 text-white" />
            </Button>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {recording && <span className="text-rose-500 font-semibold animate-pulse">🔴 Grabando llamada en vivo...</span>}
          {processing && (
            <span className="flex items-center justify-center gap-2 text-purple-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Auditando pitch con Groq Llama 3.3...
            </span>
          )}
          {!recording && !processing && !contactId && <span>Selecciona un prospecto para evaluar la llamada</span>}
          {!recording && !processing && contactId && !evaluation && <span>Haz clic en el botón para iniciar grabación</span>}
        </div>

        {evaluation && (
          <div className="flex-1 overflow-y-auto space-y-3 pt-2 border-t text-xs">
            <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border">
              <span className="font-semibold text-foreground">Score Global</span>
              <Badge className={evaluation.puntajeGlobal >= 70 ? "bg-emerald-500" : "bg-amber-500"}>
                ⭐ {evaluation.puntajeGlobal} / 100
              </Badge>
            </div>

            <div className="space-y-1">
              <span className="font-medium text-muted-foreground">Criterios Evaluados:</span>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Gancho Temprano</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Demo Ofrecida</span>
                </div>
              </div>
            </div>

            {evaluation.fortalezas?.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-emerald-600">Puntos Fuertes:</span>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
                  {evaluation.fortalezas.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.mejoras?.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-amber-600">Áreas de Mejora:</span>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
                  {evaluation.mejoras.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
