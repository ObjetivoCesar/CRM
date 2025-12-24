# PDR — Sistema Personal de Entrenamiento en Llamadas High Ticket

**Versión:** 1.0
**Eje Central:** Entrenamiento de high ticket closers (modelo diagnóstico, no guiones, no presión).

## 1. PROPÓSITO DEL SISTEMA
Aplicación independiente que funciona como **entrenador personal de llamadas de venta**, enfocada en:
- Escucha activa
- Control del marco conversacional
- Diagnóstico del lead
- Mejora progresiva

## 2. PRINCIPIOS FUNDAMENTALES
1. No guiones completos.
2. Indicadores visuales, no instrucciones.
3. Entrenamiento post-llamada como núcleo.
4. Un objetivo por llamada.
5. Diseño sobrio y no intrusivo.

## 3. FASES DEL SISTEMA

### FASE 1 — PRE-LLAMADA (Preparación)
- **Input:** Información cruda del negocio (nombres, ubicación, canales, brechas detectadas).
- **Procesamiento IA:** Resumen estructurado, hipótesis inicial y objetivo de la llamada.
- **Output:** Vista limpia con datos clave y el objetivo de la llamada.

### FASE 2 — DURANTE LA LLAMADA (Asistencia Pasiva)
- **Grabación:** Audio completo con separación de hablantes.
- **Indicadores:** Barra de % de habla, clasificación de discurso (Narrativo, Factual, Defensivo), ritmo de turnos.
- **Restricciones:** ❌ No frases sugeridas ni alertas intrusivas.

### FASE 3 — POST-LLAMADA (Entrenamiento)
- **Análisis IA:** Transcripción, métricas objetivas (preguntas abiertas vs cerradas, interrupciones, explicaciones no solicitadas).
- **Momentos Clave:** Detección de aperturas ignoradas, oportunidades de transición, objeciones reales.
- **Feedback:** Directo y concreto ("Aquí hablaste cuando el lead procesaba").
- **Foco Próximo:** Un solo foco de mejora para la siguiente llamada.

## 4. INTEGRACIÓN CON CRM
- **Flujo:** La app se abre desde un Lead en el CRM usando su ID.
- **Retorno:** Envía transcripción, métricas y feedback a la base central (Supabase).

## 5. PROMPTS POR AGENTE
- **Agente 1:** Estructuración Pre-llamada.
- **Agente 2:** Análisis Conversacional.
- **Agente 3:** Feedback y Entrenamiento.
