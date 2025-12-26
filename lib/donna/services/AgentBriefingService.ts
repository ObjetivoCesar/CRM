import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/lib/db';
import { contacts, interactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export class AgentBriefingService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || "";
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async generateBriefing(contactId: string) {
        console.log(`🤖 Donna Generating Briefing for contact: ${contactId}`);

        // 1. Fetch Contact Context
        const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);

        if (!contact) throw new Error("Contact not found");

        // 2. Fetch recent interactions (last 5)
        const recentInteractions = await db
            .select()
            .from(interactions)
            .where(eq(interactions.contactId, contactId))
            .orderBy(desc(interactions.performedAt))
            .limit(5);

        const interactionsText = recentInteractions
            .map(i => `[${i.type}] ${i.content}`)
            .join("\n");

        // 3. Generate with Gemini
        const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash";
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const prompt = `
Actúa como Donna, la Gerente de Operaciones y Mano Derecha Estratégica de César en CRM OBJETIVO. Tu misión es preparar a César como un **CLOSER de alto nivel**. Tu enfoque es la **FIDELIZACIÓN** y el **CIERRE** mediante la aportación de valor incalculable.

DATOS DEL CLIENTE:
Nombre: ${contact.businessName || contact.contactName}
Actividad: ${contact.businessActivity || 'N/A'}
Interés: ${contact.interestedProduct || 'N/A'}

HISTORIAL RECIENTE DE INTERACCIONES:
${interactionsText || 'Sin interacciones previas registradas. Este es el momento de plantar la semilla de la confianza.'}

TU OBJETIVO: Generar un briefing estratégico en JSON que prepare a César para una llamada de **ALTO NIVEL** siguiendo exactamente estas 6 FASES:

1. **Fase 1 - Control del Marco (Frame Control):** Sugiere cómo arrancar para que el lead entienda que es un diagnóstico (ej: "No te voy a vender nada hoy, si no encajamos te lo diré").
2. **Fase 2 - Exploración Emocional:** Sugiere 2-3 preguntas profundas para encontrar la frustración/dolor real (no racional).
3. **Fase 3 - Amplificación:** Cómo reflejar el dolor detectado en el historial para que el cliente se escuche a sí mismo.
4. **Fase 4 - Gap (Brecha):** Cómo hacerle ver la distancia entre su estado actual (dolor) y su futuro deseado.
5. **Fase 5 - Autoridad Tranquila:** Cómo posicionar nuestra solución como experto sin presionar ni mostrar entusiasmo excesivo.
6. **Fase 6 - Invitación:** Cómo sugerir que el lead pida la venta (ej: "¿Te gustaría que te explique cómo lo trabajamos?").

JSON FORMAT:
{
  "summary": "Resumen ejecutivo del estado de poder de la relación.",
  "closerStrategy": {
    "frameControl": "Script/Guía para liderar el inicio",
    "emotionalExploration": ["Pregunta de dolor 1", "Pregunta de dolor 2"],
    "amplification": "Guía para reflejar el dolor sin inventar",
    "gapAnalysis": "Cómo mostrar la brecha del negocio",
    "quietAuthority": "Posicionamiento de experto",
    "invitation": "La invitación final al cierre"
  },
  "talkingPoints": ["Punto clave comercial", "Punto con mentalidad ROI"],
  "objections": [
    {"ob": "Objeción probable", "res": "Respuesta estilo César (Asertiva)"}
  ],
  "iceBreakers": ["Rompehielos estratégico"]
}

No inventes datos. Si no hay historial, céntrate en prepararlo para el primer gran contacto basado en su actividad de negocio.
`.trim();

        try {
            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();
            const cleanedJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanedJson);
        } catch (error) {
            console.error("❌ Donna Briefing Error:", error);
            return null;
        }
    }
}

export const agentBriefingService = new AgentBriefingService();
