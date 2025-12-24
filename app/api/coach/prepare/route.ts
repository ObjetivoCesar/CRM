
import { db } from '@/lib/db';
import { discoveryLeads, leads, clients, interactions } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// PROMPT MADRE (Regla 40/40/20 - Modo Minimalista)
const MASTER_PROMPT = `
Eres el **Trainer de Alta Gama**, un preparador táctico para César. 
Tu misión es generar un **PITCH HÍBRIDO ESTRATÉGICO**.

**REGLAS DE ORO:**
1. **Detección de Persona vs Empresa:** Analiza el nombre del Dueño proporcionado.
   - Si es una persona (ej: ROJAS CASTILLO MARIA SOLEDAD), tu objetivo es aplicar la técnica de **"Igualación de Estatus"**.
     - **Paso 1 (Formal):** Saluda usando el NOMBRE COMPLETO para verificar identidad con respeto. (ej: "¿Hablo con María Rojas Castillo?").
     - **Paso 2 (Igualación):** Inmediatamente después, cambia el tono y usa **SOLO EL PRIMER NOMBRE** para establecer igualdad y confianza. (ej: "Un gusto María..."). ¡Esto es crítico para no parecer subordinado!
   - Si es una empresa (ej: Hotel Sol), usa el nombre comercial siempre de forma cordial.
2. **Filtro de Descarte (CRÍTICO):** Si NO hay datos claros de Booking NI de Google en el contexto, la respuesta debe ser exactamente:
   { "pitch": "SIN DATOS PARA CONTINUAR", "disparadores": [] }
3. **Limpieza:** NO incluyas textos explicativos entre paréntesis como (Busco un "Si") en el texto final. El pitch debe ser limpio, listo para leer.
4. **Modos Tácticos:**
   - **Asesor:** Tono pausado, enfocado en alcance.
   - **Vendedor:** Enfocado en el dolor del 20-30% de comisión.
   - **Consultor:** Enfocado en benchmarking ("otros negocios similares").
   - **Contención:** Tono bajo, empático, para leads defensivos.

---

## ESTRUCTURA DEL PITCH (GUION CÉSAR)

"Buenas tardes, ¿me comunico con ((NOMBRE_COMPLETO_O_EMPRESA))?"
"Un gusto ((NOMBRE_PILA_O_EMPRESA)) te saluda César Reyes, le llamo de la empresa Objetivo."
"Nosotros trabajamos exclusivamente como consultores para negocios turísticos en Ecuador."
"¿Me permite un par de minutos? Prometo ser muy puntual."

((BLOQUE VALIDACIÓN - ELEGIR EL MÁS RELEVANTE))
- SI HAY BOOKING: "Vi que ustedes trabajan con Booking. Y la verdad, es una buena decisión, porque hay perfiles de viajeros a los que por alcance propio es difícil llegar."
- SI NO HAY BOOKING PERO HAY GOOGLE: "Vi que tienen su ficha de Google con ((X)) estrellas. Es una buena base, pero hay mucho potencial por explotar."

"Ahora, algo que escucho muy seguido en el sector es que, pagan comisión de booking, prefered en algunos casos, IVA y costo de tarjeta, normalmente eso ronda entre un 20 a un 30% ¿o es más?"

"El problema no es Booking en sí… el problema es que cuando el crecimiento depende de plataformas externas, se vuelve muy difícil competir en una guerra de precios, sobre todo con Airbnb."

"En Objetivo, lo que hacemos es ayudarles a depender menos de plataformas, y a capturar reservas directas de personas que ya están buscando hospedaje como el suyo."

"Por eso quería preguntarle algo muy puntual: ¿le gustaría conocer cómo lo están haciendo otros negocios similares al suyo?"

"Entonces ((NOMBRE_PILA_O_EMPRESA)) le voy a enviar por WhatsApp nuestra página con la propuesta. Revísela con calma, porque nos contrate o no, lo que ahí mostramos es totalmente aplicable a su negocio."

"La diferencia es que esto no es manejo de redes ni publicaciones, es un sistema pensado exclusivamente para capturar reservas directas en GOOGLE y cuando te investiguen con CHATGPT, y nosotros nos dedicamos solo a eso desde el 2020."

"((NOMBRE_PILA_O_EMPRESA)) Has sido muy amable, ¿tienes alguna pregunta antes de cortar?"

---

## FORMATO DE SALIDA (JSON)
{
  "pitch": "El pitch completo con variables rellenas",
  "disparadores": [
    { "titulo": "DISPARADOR 1 – INTRO", "keywords": ["Nombre/Empresa", "Objetivo", "Turismo Ecuador"] },
    { "titulo": "DISPARADOR 2 – VALIDACIÓN", "keywords": ["Booking/Google", "Estrellas/Comentarios", "Alcance"] },
    { "titulo": "DISPARADOR 3 – PROVOCACIÓN", "keywords": ["20-30% comisión", "IVA/Tarjeta", "Ya lo tiene medido"] },
    { "titulo": "DISPARADOR 4 – DOLOR", "keywords": ["Dependencia plataformas", "Guerra de precios", "Airbnb"] },
    { "titulo": "DISPARADOR 5 – SOLUCIÓN", "keywords": ["Reservas Directas", "Gente que ya busca", "GMB/ChatGPT"] },
    { "titulo": "DISPARADOR 6 – CIERRE", "keywords": ["Benchmark similares", "WhatsApp Propuesta", "Cierre amable"] }
  ]
}
`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { entityId, entityType, role } = body;

        if (!entityId || !entityType || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let contextData = "";

        // 1. Fetch Data
        if (entityType === 'discovery') {
            const lead = await db.query.discoveryLeads.findFirst({
                where: eq(discoveryLeads.id, entityId),
            });
            if (!lead) return NextResponse.json({ error: 'Discovery Lead not found' }, { status: 404 });

            // Pass raw name to LLM for better parsing
            const rawName = lead.razonSocialPropietario || lead.nombreComercial;

            contextData = `
                PERFIL DISCOVERY:
                Nombre Comercial: ${lead.nombreComercial}
                Dueño (Nombre Crudo): ${rawName}
                Tipo: ${lead.actividadModalidad || lead.tipoEstablecimiento}
                Ubicación: ${lead.provincia}, ${lead.canton}
                
                DATOS ESPECÍFICOS DE INVESTIGACIÓN:
                - Booking/OTAs: ${lead.bookingInfo || "No detectado"}
                - Google/GMB: ${lead.googleInfo || "No detectado"}
                
                REPORTE COMPLETO: ${lead.researchData || "Sin datos de investigación."}
            `;

        } else if (entityType === 'lead') {
            const lead = await db.query.leads.findFirst({
                where: eq(leads.id, entityId),
            });
            if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

            // Get last few interactions
            const history = await db.query.interactions.findMany({
                where: eq(interactions.contactId, entityId),
                orderBy: [desc(interactions.performedAt)],
                limit: 5
            });

            contextData = `
                PERFIL LEAD:
                Nombre: ${lead.businessName}
                Tipo: ${lead.businessType}
                Dolor Cuantificado: ${lead.quantifiedProblem || 'No especificado'}
                Objetivo: ${lead.conservativeGoal || 'No especificado'}
                
                HISTORIAL RECIENTE:
                ${history.map(h => `- ${h.type} (${h.outcome}): ${h.content}`).join('\n')}
            `;
        }

        // 2. Build Prompt
        const finalPrompt = `
            ${MASTER_PROMPT}

            DATOS DE ENTRADA:
            MODO SOLICITADO: ${role.toUpperCase()}
            
            CONTEXTO DEL INTERLOCUTOR:
            ${contextData}
        `;

        // 3. Generate
        const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-flash-latest";
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(finalPrompt);
        const text = result.response.text();

        // 4. Parse JSON (with rudimentary cleanup if md blocks are included)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(cleanedText);

        return NextResponse.json(jsonResponse);

    } catch (error) {
        console.error('Coach API Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate coach response' },
            { status: 500 }
        );
    }
}
