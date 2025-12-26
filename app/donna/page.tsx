"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Clock, AlertTriangle, ArrowRight, CheckCircle2, User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface Commitment {
    id: string;
    title: string;
    description: string;
    status: string;
    dueDate: string;
    severity: 'low' | 'medium' | 'high';
    contactName: string;
    businessName: string;
    contactId: string;
    actorRole: string;
}

export default function DonnaPage() {
    const [commitments, setCommitments] = useState<Commitment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const response = await fetch('/api/donna/commitments/active');
                const data = await response.json();
                if (data.success) {
                    setCommitments(data.commitments);
                }
            } catch (error) {
                console.error("Error loading Donna ledger:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const severityColor = {
        high: 'bg-red-500/10 text-red-600 border-red-200',
        medium: 'bg-amber-500/10 text-amber-600 border-amber-200',
        low: 'bg-blue-500/10 text-blue-600 border-blue-200'
    };

    return (
        <DashboardLayout>
            <div className="container mx-auto py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">DONNA</h1>
                            <p className="text-indigo-600 dark:text-indigo-400 font-bold italic">Tu Cerebro Auxiliar y Sistema de Confiabilidad</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Card className="bg-white dark:bg-gray-950 px-6 py-2 border-indigo-100 flex items-center gap-4 shadow-sm">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Pendientes</p>
                                <p className="text-2xl font-black text-indigo-600">{commitments.length}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-100 dark:bg-gray-800" />
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Riesgo</p>
                                <p className="text-2xl font-black text-red-500">{commitments.filter(c => c.severity === 'high').length}</p>
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Ledger */}
                    <div className="lg:col-span-3 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 px-1 text-gray-700 dark:text-gray-300">
                            <Clock className="w-5 h-5 text-indigo-500" /> Libro Maestro de Compromisos
                        </h2>

                        {loading ? (
                            <div className="py-20 text-center text-gray-400 animate-pulse font-medium">
                                Consultando registros de Donna...
                            </div>
                        ) : commitments.length === 0 ? (
                            <Card className="border-dashed border-2 py-20 bg-gray-50/50 dark:bg-gray-900/20">
                                <CardContent className="flex flex-col items-center justify-center text-center">
                                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 opacity-40" />
                                    <p className="text-lg font-bold text-gray-500">¡Cero deudas! Todos los compromisos están al día.</p>
                                    <p className="text-sm text-gray-400">Donna está orgullosa de tu confiabilidad.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {commitments.map((c) => (
                                    <Card key={c.id} className="group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm hover:shadow-md bg-white dark:bg-gray-950">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className={`text-[10px] font-bold ${severityColor[c.severity]}`}>
                                                    {c.severity.toUpperCase()}
                                                </Badge>
                                                <p className="text-[10px] font-black text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(c.dueDate), "dd MMM, yyyy", { locale: es })}
                                                </p>
                                            </div>
                                            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 transition-colors">
                                                {c.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 italic">
                                                "{c.description}"
                                            </p>

                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                                            {c.businessName || c.contactName}
                                                        </p>
                                                        <p className="text-[9px] uppercase font-bold text-gray-400">{c.actorRole}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-indigo-50 text-indigo-600" asChild>
                                                    <Link href={`/clients/${c.contactId}`}>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
