"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    PlusCircle,
    MinusCircle,
    TrendingUp,
    AlertTriangle,
    Target,
    Flame,
    Lightbulb,
    Briefcase,
    Users,
    Building
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StrategicBoardProps {
    client: any
}

export const StrategicBoard = React.memo(function StrategicBoard({ client }: StrategicBoardProps) {
    const swot = [
        {
            id: "strengths",
            title: "Fortalezas",
            content: client.strengths,
            icon: PlusCircle,
            color: "bg-emerald-50 text-emerald-700 border-emerald-200",
            iconColor: "text-emerald-500",
        },
        {
            id: "weaknesses",
            title: "Debilidades",
            content: client.weaknesses,
            icon: MinusCircle,
            color: "bg-red-50 text-red-700 border-red-200",
            iconColor: "text-red-500",
        },
        {
            id: "opportunities",
            title: "Oportunidades",
            content: client.opportunities,
            icon: Lightbulb,
            color: "bg-blue-50 text-blue-700 border-blue-200",
            iconColor: "text-blue-500",
        },
        {
            id: "threats",
            title: "Amenazas",
            content: client.threats,
            icon: AlertTriangle,
            color: "bg-amber-50 text-amber-700 border-amber-200",
            iconColor: "text-amber-500",
        },
    ]

    const metrics = [
        { label: "Años Negocio", value: client.yearsInBusiness, icon: Building },
        { label: "Empleados", value: client.numberOfEmployees, icon: Users },
        { label: "Sucursales", value: client.numberOfBranches, icon: Briefcase },
        { label: "Ticket Promedio", value: client.averageTicket ? `$${client.averageTicket}` : "N/A", icon: TrendingUp },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.map((m, i) => (
                    <Card key={i} className="border-none shadow-sm bg-muted/30">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background shadow-xs">
                                <m.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
                                <p className="text-lg font-bold">{m.value || "—"}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Goals & Pains Column */}
                <div className="space-y-6">
                    <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                <CardTitle className="text-xl">Objetivos y Metas</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                                {client.goals || "No se han definido metas para este cliente."}
                            </div>
                            {client.conservativeGoal && (
                                <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <p className="text-xs font-bold text-primary uppercase mb-1">Objetivo Conservador</p>
                                    <p className="text-sm italic">"{client.conservativeGoal}"</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-red-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Flame className="w-5 h-5 text-red-500" />
                                <CardTitle className="text-xl">Dolores y Problemas</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                                {client.pains || "No se han registrado dolores o problemas críticos."}
                            </div>
                            {client.quantifiedProblem && (
                                <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <p className="text-xs font-bold text-red-500 uppercase mb-1">Problema Cuantificado</p>
                                    <p className="text-sm italic">"{client.quantifiedProblem}"</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* SWOT Grid Column */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold px-1">Análisis Estratégico (FODA)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {swot.map((s) => (
                            <Card key={s.id} className={cn("border-2 min-h-[200px]", s.color)}>
                                <CardHeader className="p-4 pb-0">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold uppercase tracking-tighter">{s.title}</CardTitle>
                                        <s.icon className={cn("w-5 h-5", s.iconColor)} />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap opacity-90">
                                        {s.content || `Sin ${s.title.toLowerCase()} registradas.`}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-dashed text-center">
                        <p className="text-xs text-muted-foreground">
                            Usa el botón <strong>Gestionar Expediente</strong> para actualizar este mapa estratégico.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
})
