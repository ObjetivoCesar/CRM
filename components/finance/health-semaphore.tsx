"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

interface HealthSemaphoreProps {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
    expectedCash: number
    totalCommitments: number
}

export function HealthSemaphore({ status, expectedCash, totalCommitments }: HealthSemaphoreProps) {
    const configs = {
        HEALTHY: {
            bg: "bg-green-50 border-green-200",
            icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
            title: "Estado: Saludable",
            desc: "Tu liquidez proyectada cubre todos tus compromisos de negocio y personales.",
            textColor: "text-green-900"
        },
        WARNING: {
            bg: "bg-yellow-50 border-yellow-200",
            icon: <AlertTriangle className="h-8 w-8 text-yellow-600" />,
            title: "Estado: Alerta de Liquidez",
            desc: "El margen de seguridad es bajo. Asegura los cobros pendientes para evitar retrasos.",
            textColor: "text-yellow-900"
        },
        CRITICAL: {
            bg: "bg-red-50 border-red-200",
            icon: <AlertCircle className="h-8 w-8 text-red-600" />,
            title: "Estado: Riesgo de Impago",
            desc: "Compromisos superan la liquidez esperada. Revisa prioridades de pago inmediatamente.",
            textColor: "text-red-900"
        }
    }

    const config = configs[status] || configs.HEALTHY

    return (
        <Card className={`${config.bg} border-2 shadow-sm mb-6`}>
            <CardContent className="pt-6 pb-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-3 bg-white rounded-full shadow-inner">
                        {config.icon}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className={`text-2xl font-black ${config.textColor} uppercase tracking-tight`}>
                            {config.title}
                        </h2>
                        <p className={`${config.textColor} opacity-80 text-sm font-medium`}>
                            {config.desc}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 px-6 border-l hidden md:flex">
                        <span className="text-xs font-bold uppercase opacity-50">Cobertura Proyectada</span>
                        <div className="flex items-center gap-2 text-xl font-black">
                            <span>${expectedCash.toLocaleString()}</span>
                            <ArrowRight className="h-4 w-4 opacity-30" />
                            <span className="opacity-40">${totalCommitments.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
