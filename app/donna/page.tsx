"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import ReactMarkdown from 'react-markdown'

const VISION_TEXT = `
# DONNA — Asistente Ejecutiva Inteligente
**"La Secretaria que se anticipa."**

## 1. Concepto
Donna no es un chatbot. Es una **Gerente de Operaciones basada en IA** que vive en el CRM.
Su objetivo es liberar al usuario (CEO/Closer) de la carga mental administrativa y operativa diaria.

> *"Yo no quiero revisar leads, quiero saber con quién cerrar hoy."* — Filosofía del Usuario

## 2. Funcionalidades Principales (Visión Futura)

### A. Gestión de Agenda Proactiva
- **Antes:** Tienes que mirar el calendario.
- **Donna:** "Tienes 2 reuniones críticas hoy. Bloqueé 30 minutos antes de cada una para preparación profunda. Moví la reunión de baja prioridad al jueves."

### B. Distribución de Tareas (Agentes Pequeños)
Donna es el cerebro central que comanda a agentes especializados:
1.  **Agente de Investigación:** "Investiga a Juan Pérez antes de las 10am."
2.  **Agente de Seguimiento:** "Envía el PDF de cotización a los 5 leads de ayer si no han contestado."
3.  **Agente de Limpieza:** "Archiva los prospectos que no abrieron correos en 30 días."

### C. "Morning Briefing" (El Reporte Diario)
Al iniciar el día, Donna no muestra una lista de leads. Muestra decisiones:
- "Hay 3 clientes calientes listos para cerrar (Score > 80)."
- "Hay 5 correos que requieren tu tono personal; ya redacté borradores."
- "La facturación del mes va al 60% del objetivo."

## 3. Implementación Fase 1 (Actual)
- Enlace directo en el CRM.
- Documentación de visión y roadmap.
- Integración básica con "Cortex AI" para consultas puntuales.

---
*Inspired by Donna Paulsen (Suits): Eficiente, leal, y siempre un paso adelante.*
`

export default function DonnaPage() {
    return (
        <DashboardLayout>
            <div className="container mx-auto py-6 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Donna AI</h1>
                </div>

                <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-2xl">Visión del Módulo</CardTitle>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{VISION_TEXT}</ReactMarkdown>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
