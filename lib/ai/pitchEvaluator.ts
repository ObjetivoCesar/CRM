/**
 * pitchEvaluator.ts — Evaluación de pitch de ventas con Groq Llama 3.3 70B
 * 
 * Recibe: transcripción de la llamada + pasos del guion activo
 * Retorna: evaluación estructurada compatible con call_analyses.metrics
 */

export interface ScriptStep {
  orden: number;
  gatillo: string;
  frase: string;
  objetivo?: string;
  keywords?: string;
}

export interface PitchEvaluation {
  puntajeGlobal: number;           // 0-100
  ganchoGananciaTemplrano: boolean;
  demoOfrecida: boolean;
  mencionPrecioComision: boolean;
  objecionTiempoManejada: boolean;
  cierrePedido: boolean;
  capitulosCumplidos: number[];
  fortalezas: string[];
  mejoras: string[];
  modoEvaluacion: 'groq' | 'mock';
}

const MOCK_EVALUATION: PitchEvaluation = {
  puntajeGlobal: 65,
  ganchoGananciaTemplrano: true,
  demoOfrecida: false,
  mencionPrecioComision: true,
  objecionTiempoManejada: false,
  cierrePedido: false,
  capitulosCumplidos: [1, 2, 3],
  fortalezas: ['Apertura natural y confiada', 'Mencionó precio claramente'],
  mejoras: ['No ofreció demo en vivo', 'No manejó objeción de tiempo', 'No cerró con compromiso'],
  modoEvaluacion: 'mock',
};

function buildSystemPrompt(pasos: ScriptStep[]): string {
  const guionJson = JSON.stringify(
    pasos.map(p => ({
      orden: p.orden,
      gatillo: p.gatillo,
      frase: p.frase.substring(0, 200), // Truncar para no exceder tokens
    })),
    null, 2
  );

  return `Eres un auditor experto en ventas telefónicas para la plataforma ActivaQR.
Analiza la siguiente transcripción de una llamada comercial contra el guion de referencia.

Estructura del Guion de Referencia:
${guionJson}

Evalúa estrictamente si la persona que llamó cumplió con la estructura y responde ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin texto adicional):
{
  "gancho_ganancia_temprano": boolean,
  "demo_ofrecida": boolean,
  "mencion_precio_comision": boolean,
  "objecion_tiempo_manejada": boolean,
  "cierre_pedido": boolean,
  "capitulos_cumplidos": [numeros de orden de los pasos cumplidos],
  "fortalezas": ["string con fortaleza específica"],
  "mejoras": ["string con mejora específica y accionable"],
  "puntaje_global": number entre 0 y 100
}

REGLA DE PUNTAJE:
  0-20  = No siguió guion ni basics
  21-40 = Mencionó producto pero sin estructura
  41-60 = Siguió parcialmente, faltaron varios capítulos
  61-80 = Siguió bien, faltaron 1-2 capítulos
  81-100 = Ejecución excelente, cumplimiento casi total del guion`;
}

export async function evaluatePitch(
  transcripcion: string,
  pasos: ScriptStep[]
): Promise<PitchEvaluation> {
  // ⚡ IMPORTANTE: Chequeo de longitud PRIMERO — aplica sin importar si hay API key
  if (!transcripcion || transcripcion.trim().length < 20) {
    console.warn('[PitchEvaluator] Transcripción muy corta — score bajo independiente de API');
    return {
      puntajeGlobal: 5,
      ganchoGananciaTemplrano: false,
      demoOfrecida: false,
      mencionPrecioComision: false,
      objecionTiempoManejada: false,
      cierrePedido: false,
      capitulosCumplidos: [],
      fortalezas: [],
      mejoras: ['Transcripción demasiado corta para evaluar — ¿se grabó correctamente el audio?'],
      modoEvaluacion: 'mock',
    };
  }

  // Ahora verificar si la API Key está disponible
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.warn('[PitchEvaluator] GROQ_API_KEY no configurada, usando evaluación mock');
    return MOCK_EVALUATION;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: buildSystemPrompt(pasos) },
          { role: 'user', content: `Transcripción de la llamada:\n"${transcripcion.substring(0, 4000)}"` },
        ],
        temperature: 0.1, // Bajo para respuestas consistentes y estructuradas
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[PitchEvaluator] Groq API error:', err);
      return { ...MOCK_EVALUATION, modoEvaluacion: 'mock' };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error('Respuesta vacía de Groq');

    const parsed = JSON.parse(rawContent);

    return {
      puntajeGlobal: Math.min(100, Math.max(0, Number(parsed.puntaje_global) || 0)),
      ganchoGananciaTemplrano: Boolean(parsed.gancho_ganancia_temprano),
      demoOfrecida: Boolean(parsed.demo_ofrecida),
      mencionPrecioComision: Boolean(parsed.mencion_precio_comision),
      objecionTiempoManejada: Boolean(parsed.objecion_tiempo_manejada),
      cierrePedido: Boolean(parsed.cierre_pedido),
      capitulosCumplidos: Array.isArray(parsed.capitulos_cumplidos) ? parsed.capitulos_cumplidos : [],
      fortalezas: Array.isArray(parsed.fortalezas) ? parsed.fortalezas : [],
      mejoras: Array.isArray(parsed.mejoras) ? parsed.mejoras : [],
      modoEvaluacion: 'groq',
    };
  } catch (error) {
    console.error('[PitchEvaluator] Error evaluando pitch:', error);
    return { ...MOCK_EVALUATION, modoEvaluacion: 'mock' };
  }
}
