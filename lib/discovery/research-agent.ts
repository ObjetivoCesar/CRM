import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ResearchResult {
    businessName: string;
    report: string;
}

export class ResearchAgent {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || "";
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    private async searchTavily(query: string): Promise<string> {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            console.error("Tavily API Key missing");
            return "";
        }

        try {
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "advanced",
                    include_answer: true,
                    max_results: 5,
                }),
            });

            if (!response.ok) {
                console.error("Tavily API error:", await response.text());
                return "";
            }

            const data = await response.json();
            return `
Respuesta Directa: ${data.answer || "N/A"}

Resultados de Búsqueda:
${data.results.map((r: any) => `- ${r.title} (${r.url}):\n  ${r.content}`).join("\n\n")}
      `.trim();
        } catch (error) {
            console.error("Error calling Tavily:", error);
            return "";
        }
    }

    async researchBusiness(data: {
        businessName: string;
        businessType?: string;
        representative?: string;
        city?: string;
        province?: string;
    }): Promise<{ report: string; bookingInfo: string; googleInfo: string }> {
        // 1. Construct the search query
        const searchQuery = `presencia digital profunda, reseñas de Booking.com, Google My Business y comentarios de "${data.businessName}" en ${data.city || data.province || ""}`;
        console.log(`[ResearchAgent] Searching Tavily for: ${searchQuery}`);

        // 2. Perform Search (Tavily)
        const searchContext = await this.searchTavily(searchQuery);

        // 3. Generate Report with Gemini
        const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-flash-latest";
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const prompt = `
Actúa como un experto investigador de negocios para CRM OBJETIVO. Tu objetivo es preparar un "Informe de Inteligencia Pre-Llamada" REAL basado en datos web.

DATOS DEL NEGOCIO:
Nombre comercial: ${data.businessName}
Tipo: ${data.businessType || 'N/A'}
Ubicación: ${data.city || ''}, ${data.province || ''}

CONTEXTO DE BÚSQUEDA WEB EN TIEMPO REAL (TAVILY):
${searchContext ? searchContext : "NO SE PUDO REALIZAR BÚSQUEDA WEB, USA TU CONOCIMIENTO GENERAL (INDICARLO EN EL REPORTE)."}

---
TU MISIÓN ES GENERAR LA SALIDA EXCLUSIVAMENTE EN FORMATO JSON SIGUIENDO ESTA ESTRUCTURA:

{
  "report": "Texto completo del reporte siguiendo los puntos: 1. Resumen Ejecutivo, 2. Presencia Digital, 3. Puntos de Dolor, 4. Estrategia de Entrada, 5. Perfil Estimado. (Usa bullets y formato markdown dentro del string)",
  "bookingInfo": "Resumen corto: 'Si/No trabaja con booking, X estrellas, comentarios positivos/negativos destacados'",
  "googleInfo": "Resumen corto: 'Perfil Google: Si/No, X estrellas, XX reseñas, comentarios resumen: [comentario...]'"
}

REGLAS ESPECÍFICAS PARA EL CONTENIDO:
- En 'bookingInfo', si encuentras Booking, Expedia o similares, menciónalo con sus estrellas y un resumen de las quejas o halagos más comunes.
- En 'googleInfo', sé preciso con el número de estrellas y cita un fragmento de un comentario real si es posible.
- Si no hay datos, pon "Sin información detectada".

REGLA DE ORO: Si Tavily no dio resultados, no inventes datos específicos.
`.trim();

        try {
            const result = await model.generateContent(prompt);
            const textResponse = result.response.text();

            // Cleanup in case Gemini returns markdown blocks
            const cleanedJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);

            return {
                report: parsed.report || "Error en generación de reporte.",
                bookingInfo: parsed.bookingInfo || "Sin datos de Booking.",
                googleInfo: parsed.googleInfo || "Sin datos de Google."
            };
        } catch (error) {
            console.error("Error in Gemini (ResearchAgent):", error);
            return {
                report: "Error al procesar la investigación con IA.",
                bookingInfo: "N/A",
                googleInfo: "N/A"
            };
        }
    }
}
