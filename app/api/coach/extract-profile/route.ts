import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTOR_PROMPT = `
Eres el **Asistente Personal de CRM** del usuario. Tu rol es ayudarle a mantener actualizada la información de sus clientes de forma inteligente.

**CONTEXTO DEL CLIENTE ACTUAL:**
{{CLIENT_CONTEXT}}

**NUEVA NOTA DE INTERACCIÓN:**
"{{NOTES}}"

---

**TU MISIÓN:**
Analiza la nueva nota en el contexto del cliente existente y determina:
1. ¿Hay información nueva o actualizada que deba registrarse?
2. ¿El cliente mencionó explícitamente un cambio (nuevo número, nuevo email)?
3. ¿Hay señales implícitas sobre personalidad, edad, o estilo de comunicación?

**REGLAS DE INTELIGENCIA:**

📞 **Teléfono:**
- Solo extrae si el cliente EXPLÍCITAMENTE mencionó un número nuevo/diferente
- Contextos válidos: "mi nuevo número es...", "llámame al...", "mi WhatsApp es...", "cambié de cel...", "dejó su número...", "dio su teléfono..."
- Si ya existe un teléfono y la nota no menciona cambio → devuelve null
- Si encuentras un número, limpia espacios/guiones y devuelve solo dígitos
- Formatos válidos: 10 dígitos (0991234567) o 9 dígitos (991234567)

📧 **Email:**
- Solo extrae si se menciona explícitamente un correo
- Contextos válidos: "mi email es...", "escríbeme a...", "mi correo cambió a..."
- Si ya existe email y no se menciona cambio → devuelve null

👤 **Datos Inferenciales (Personalidad, Edad, Estilo):**
- Infiere SOLO si hay evidencia clara en la nota
- Personalidad: Basa en tono, receptividad, vocabulario ("amable", "directo", "desconfiado")
- Edad: Basa en pistas ("señora mayor", "joven emprendedor", "voz madura") → Devuelve rango (ej: "50-60")
- Estilo: Basa en ritmo de conversación ("pausado", "rápido", "formal", "informal")
- Interés: Basa en acciones concretas (dio datos = alto, pidió info = medio, evasivo = bajo)

**IMPORTANTE - PIENSA COMO ASISTENTE:**
- NO extraigas números aleatorios sin contexto claro
- Si la nota dice "llamé al cliente" pero no menciona un número nuevo → phone: null
- Si dice "me dio su nuevo cel 099..." o "dejó su número 099..." → phone: "099..."
- Prefiere null sobre datos dudosos
- Tu objetivo es AYUDAR, no llenar campos por llenarlos

**FORMATO OUTPUT (JSON ÚNICAMENTE, SIN MARKDOWN):**
{
  "phone": "0991234567" | null,
  "email": "correo@ejemplo.com" | null,
  "ageRange": "50-60" | null,
  "personalityType": "Amable" | "Directo" | "Analítico" | "Desconfiado" | "Entusiasta" | null,
  "communicationStyle": "Pausado" | "Rápido" | "Formal" | "Informal" | null,
  "interestLevel": "Alto" | "Medio" | "Bajo" | null,
  "summary": "Resumen ejecutivo de 1 línea (ej: 'Cliente interesado, dio nuevo contacto')" | null,
  "reasoning": "Breve explicación de por qué extrajiste estos datos (para debugging)"
}
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notes, clientContext } = body;

    console.log('📥 Extract Profile Request:', { notes: notes?.substring(0, 50), hasContext: !!clientContext });

    if (!notes) {
      return NextResponse.json({ error: 'Missing notes field' }, { status: 400 });
    }

    // Build context string
    let contextStr = "No hay contexto previo del cliente.";
    if (clientContext) {
      contextStr = `
Nombre del Negocio: ${clientContext.businessName || 'No especificado'}
Nombre de Contacto: ${clientContext.contactName || 'No especificado'}
Teléfono Actual: ${clientContext.currentPhone || 'No registrado'}
Email Actual: ${clientContext.currentEmail || 'No registrado'}

Últimas 3 Interacciones:
${clientContext.recentInteractions?.map((int: any, idx: number) =>
        `${idx + 1}. ${new Date(int.date).toLocaleDateString()} - ${int.content || 'Sin contenido'}`
      ).join('\n') || 'Sin interacciones previas'}
            `.trim();
    }

    const prompt = EXTRACTOR_PROMPT
      .replace('{{CLIENT_CONTEXT}}', contextStr)
      .replace('{{NOTES}}', notes);

    console.log('🤖 Calling OpenAI GPT-4o-mini...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en extracción de datos estructurados. Siempre respondes ÚNICAMENTE con JSON válido, sin markdown ni explicaciones adicionales.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content || '{}';
    console.log('✅ OpenAI Response:', responseText.substring(0, 200));

    const jsonResponse = JSON.parse(responseText);
    console.log('📤 Extracted Data:', jsonResponse);

    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error('❌ Profile Extraction Error:', error.message);
    console.error('Stack:', error.stack);
    // Fallback to empty structure to not break the flow
    return NextResponse.json({
      phone: null,
      email: null,
      ageRange: null,
      personalityType: null,
      communicationStyle: null,
      interestLevel: null,
      summary: null,
      reasoning: `Error en extracción: ${error.message}`
    });
  }
}
