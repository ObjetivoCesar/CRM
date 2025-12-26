import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Service responsible for parsing unstructured meeting notes
 * and extracting structured Commitment Drafts.
 */
export class CommitmentExtractor {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || "";
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Parses text and returns a list of proposed commitments using Gemini.
     */
    async extractFromNotes(notes: string): Promise<any[]> {
        if (!notes || notes.trim().length < 10) {
            return [];
        }

        console.log("🤖 Donna Analyzing Notes with Gemini...");

        const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash";
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const prompt = `
Actúa como Donna, la Gerente de Operaciones de César en CRM OBJETIVO. Tu especialidad es la **psicología de ventas, el cierre de tratos (Closer) y la fidelización profunda**.

César ha tenido una reunión y estas son sus notas/transcripción:
---
${notes}
---

TU MISIÓN: Extraer una lista de COMPROMISOS y CUES PSICOLÓGICOS en formato JSON. 

Debes identificar:
1. **Compromisos del Closer (César):** Promesas de entrega que demuestren ROI o valor inmediato.
2. **Compromisos del Cliente:** Acuerdos tomados por el lead para mover el trato.
3. **Puntos de Dolor y Gaps (Estratégico):** Frustraciones específicas mencionadas, miedos o la distancia entre donde están y donde quieren estar.
4. **Datos de Fidelización:** Detalles personales (cumpleaños, gustos, anécdotas) o menciones de socios/familia que sirvan para crear una conexión humana.

FORMATO DE SALIDA (JSON ARRAY ONLY):
[
  {
    "title": "Breve título asertivo",
    "description": "Detalle claro. Si es un CUER PSICOLÓGICO, explica cómo usarlo para el cierre/fidelización",
    "actorRole": "client | internal_team | cesar | strategic_cue",
    "assigneeName": "Nombre de la persona o 'Donna' para cues estratégicos",
    "dueDate": "YYYY-MM-DD (Estima +3 días para tareas, null para cues)",
    "severity": "low | medium | high"
  }
]

REGLA DE ORO: No inventes nada. Prioriza lo que permita a César liderar con autoridad y empatía. Solo responde el JSON.
`.trim();

        try {
            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();

            // Basic cleanup of potential markdown blocks
            const cleanedJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);

            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("❌ Donna Extraction Error:", error);
            return [];
        }
    }
}

export const commitmentExtractor = new CommitmentExtractor();
