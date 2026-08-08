
import { db } from '@/lib/db';
import { contacts, interactions } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getAIClient, getModelId } from '@/lib/ai/client';
import { getClientContext, formatContextForAI } from '@/lib/ai/context-fetcher';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const MASTER_PROMPT = `
Eres el **Trainer de Alta Gama** de César. Generas guiones tácticos para llamadas, WhatsApp o visitas en frío. Tu trabajo es preparar a César para que entre a la conversación con un plan claro y un pitch que NO suene a venta dura.

**REGLAS DE ORO:**
1. **FORMATO:** Saltos de línea (\\n) después de cada frase corta. Nada de bloques densos. Una idea por línea.
2. **VARIABLES (REEMPLAZA, NO DEJES CORCHETES):**
   - [NOMBRE] → primer nombre + apellido. Si no hay, usa "don" / "estimado" natural.
   - [CIUDAD] → ciudad del prospecto.
   - [NOMBRE_NEGOCIO] → nombre del local.
3. **MISIÓN:** Devuelve un objeto JSON con la forma:
   {
     "pitches": {
       "asesor": "Pitch si es el dueño (tono principal)",
       "contencion": "Pitch si está enojado/ocupado (máx 3 líneas)",
       "consultor": "Pitch si atendió recepción (deja claro que es para el dueño)",
       "workshop": "Mensaje WhatsApp persuasivo",
       "whatsapp_dueño": "Mensaje WhatsApp directo al dueño"
     },
     "gancho_apertura": "Primera frase que rompe el hielo (1 línea)",
     "objecion_comun": "Objeción más probable + respuesta sugerida (2 líneas)",
     "cierre": "Cómo pedir el siguiente paso concreto (1-2 líneas)"
   }
`;

// ─── PROMPT DINÁMICO SEGÚN TIPO DE OUTREACH ───
function buildOutreachModifier(tipo: string, oferta: string, peticion: string): string {
    const t = (tipo || 'venta').toLowerCase();

    if (t === 'colaboracion') {
        return `
🎯 MODO: COLABORACIÓN (no es venta, es propuesta de mutuo beneficio)
- OFERTA DE CÉSAR: ${oferta || '(no especificada)'}
- LO QUE CÉSAR PIDE A CAMBIO: ${peticion || '(no especificado)'}
- TONO: Horizontal, de igual a igual, sin urgencia. Somos dos negocios locales ayudándose.
- ESTRUCTURA SUGERIDA para el pitch:
  1. Conectar como par (no como proveedor)
  2. Hacer el halago específico
  3. Explicar la oferta en lenguaje de "lo que ganas tú", no features
  4. Explicar lo que se pide a cambio (sin presionar)
  5. Cierre suave: "¿Te hace sentido si lo probamos un mes?"
- PROHIBIDO: "comprar", "contratar", "inversión", "descuento", "oferta válida"
- PRIORIDAD: Que el prospecto sienta que gana más de lo que da.`;
    }

    if (t === 'aviso' || t === 'reactivacion') {
        return `
🎯 MODO: AVISO / REACTIVACIÓN
- OBJETIVO: Reencuadrar la conversación, no vender nada nuevo
- TONO: Cálido, breve, recordar el vínculo previo
- ESTRUCTURA: Saludo → referencia a la última vez → pregunta abierta
- PROHIBIDO: Ofrecer productos, pedir compra
- MÁXIMO 4-5 líneas por pitch`;
    }

    // Default: venta (modo legacy)
    return `
🎯 MODO: VENTA directa
- OFERTA DE CÉSAR: ${oferta || '(servicio estándar)'}
- LO QUE CÉSAR PIDE: ${peticion || 'cerrar la venta'}
- TONO: Consultor experto, no vendedor agresivo.
- ESTRUCTURA: Halago → dolor → propuesta → prueba → cierre suave`;
}

export async function POST(req: Request) {
    // Initialize Supabase inside the handler to avoid build-time environment variable requirements
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        const body = await req.json();
        const { entityId, compliment, outreachType, miOferta, miPeticion } = body;

        if (!entityId) {
            return NextResponse.json({ error: 'Missing contact ID' }, { status: 400 });
        }

        // 1. Fetch Unified Context (NEVER fail the request — context-fetcher always returns a profile stub)
        const context = await getClientContext(supabase, entityId);

        const formattedContext = formatContextForAI(context);

        // 2. Build the outreach-specific modifier (parametrizable, NOT stored in DB)
        const outreachModifier = buildOutreachModifier(
            outreachType || 'venta',
            miOferta || '',
            miPeticion || ''
        );

        const finalPrompt = `
            ${MASTER_PROMPT}

            ${outreachModifier}

            CONTEXTO DEL INTERLOCUTOR:
            ${formattedContext}

            HALAGO / DETALLE ESPECÍFICO PROPORCIONADO POR EL USUARIO:
            ${compliment || 'Ninguno (puedes generar uno basado en la investigación si lo consideras mejor)'}

            INSTRUCCIÓN FINAL: Usa el halago del usuario si existe. Adapta el tono al MODO definido arriba. Devuelve SOLO el JSON pedido.
        `;

        // 3. Generate using Standard Model
        console.log(`🤖 Strategy Coach Request (Gemini/Standard) for contact ${entityId}`);

        const aiClient = getAIClient('STANDARD');
        const modelId = getModelId('STANDARD');

        const completion = await aiClient.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: finalPrompt }],
            response_format: { type: "json_object" }
        });

        const text = completion.choices[0].message.content || "{}";

        // 4. Parse JSON
        let jsonResponse = JSON.parse(text);

        return NextResponse.json(jsonResponse);

    } catch (error: any) {
        console.error('❌ Coach API Critical Failure:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate coach response',
                details: error.message,
                pitches: {
                    asesor: "Error: No se pudo generar el pitch.",
                    contencion: "Error: No se pudo generar el pitch.",
                    consultor: "Error: No se pudo generar el pitch.",
                    whatsapp_dueño: "Error: No se pudo generar el mensaje."
                }
            },
            { status: 500 }
        );
    }
}
