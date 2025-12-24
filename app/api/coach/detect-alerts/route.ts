import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALERT_DETECTOR_PROMPT = `
Eres un analista de riesgos comerciales experto. Tu misión es detectar SEÑALES CRÍTICAS en notas de interacción con clientes.

**NOTA DE INTERACCIÓN:**
"{{NOTES}}"

**CATEGORÍAS DE ALERTA:**
1. 🔴 **RIESGO** (risk): Problemas financieros, amenaza de cancelación, insatisfacción grave, quejas serias
2. 🟡 **BLOQUEADOR** (blocker): Pausas solicitadas, esperas indefinidas, indecisión prolongada, falta de respuesta
3. 🟢 **OPORTUNIDAD** (opportunity): Interés en expansión, nuevos proyectos, referencias, satisfacción alta
4. ℹ️ **INFO** (info): Cambios de contacto, actualizaciones generales sin urgencia

**SEVERIDAD:**
- **high**: Requiere acción inmediata (ej: "quiere cancelar", "problema financiero grave")
- **medium**: Requiere monitoreo cercano (ej: "pidió pausa temporal", "revisando presupuesto")
- **low**: Informativo, sin urgencia (ej: "cambió de email", "mencionó posible proyecto futuro")

**REGLAS CRÍTICAS:**
1. Solo reporta si hay señal CLARA y ACCIONABLE
2. NO inventes información que no esté en la nota
3. Extrae el contexto específico y relevante
4. Asigna confidence score honesto (0.0-1.0)
5. Si no hay alertas claras, devuelve array vacío

**FORMATO DE SALIDA (JSON ÚNICAMENTE, SIN MARKDOWN):**
{
  "alerts": [
    {
      "type": "risk",
      "severity": "high",
      "title": "Problema Financiero Reportado",
      "message": "Cliente mencionó problema financiero y solicitó pausar trabajos indefinidamente",
      "confidence": 0.95,
      "entities": {
        "financial_issue": true,
        "pause_requested": true,
        "indefinite": true
      }
    }
  ]
}

Si NO hay alertas detectadas, devuelve:
{
  "alerts": []
}
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notes, contactId, interactionId } = body;

    if (!notes || !contactId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Skip AI call if note is too short
    if (notes.length < 15) {
      return NextResponse.json({ alerts: [] });
    }

    const prompt = ALERT_DETECTOR_PROMPT.replace('{{NOTES}}', notes);

    console.log('🚨 Detecting alerts with OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un analista de riesgos comerciales. Respondes ÚNICAMENTE con JSON válido, sin markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content || '{"alerts":[]}';
    const jsonResponse = JSON.parse(responseText);

    console.log('✅ Alerts detected:', jsonResponse.alerts?.length || 0);

    // Add metadata to each alert
    const enrichedAlerts = (jsonResponse.alerts || []).map((alert: any) => ({
      ...alert,
      contactId,
      interactionId,
      rawNote: notes
    }));

    return NextResponse.json({ alerts: enrichedAlerts });

  } catch (error) {
    console.error('❌ Alert Detector Error:', error);
    // Fail gracefully - return empty alerts instead of breaking the flow
    return NextResponse.json({ alerts: [] });
  }
}
