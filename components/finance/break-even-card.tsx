"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Target, CreditCard, Loader2 } from "lucide-react"

interface BreakEvenMetrics {
    breakEvenPoint: number
    currentFixedCosts: number
    totalSalesCurrentMonth: number
    totalMonthlyPersonalBurden: number
    surplus: number
}

interface BreakEvenCardProps {
    metrics: BreakEvenMetrics | null
    loading: boolean
}

export function BreakEvenCard({ metrics, loading }: BreakEvenCardProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
    }

    if (loading) return (
        <Card className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
    )

    if (!metrics) return null;

    const progress = Math.min((metrics.totalSalesCurrentMonth / metrics.breakEvenPoint) * 100, 100);
    const isProfitable = metrics.totalSalesCurrentMonth >= metrics.breakEvenPoint;

    return (
        <Card className={`border-2 transition-all duration-500 ${isProfitable ? 'border-green-500 bg-green-50/10' : 'border-indigo-200 bg-indigo-50/10'}`}>
            <CardHeader>
                <CardTitle className={`text-xl flex items-center gap-2 ${isProfitable ? 'text-green-700' : 'text-indigo-900'}`}>
                    <Target className="h-5 w-5" /> Meta de Supervivencia (Break-even)
                </CardTitle>
                <CardDescription>Ventas necesarias para cubrir Negocio + Vida Personal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Carga Total (Fij + Pers)</p>
                        <p className="text-2xl font-black">{formatCurrency(metrics.breakEvenPoint)}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Ventas Logradas</p>
                        <p className={`text-2xl font-black ${isProfitable ? 'text-green-600' : 'text-indigo-600'}`}>{formatCurrency(metrics.totalSalesCurrentMonth)}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-black italic">
                        <span>{isProfitable ? '¡LIBERTAD FINANCIERA!' : 'ESFUERZO DE VENTA'}</span>
                        <span className={isProfitable ? 'text-green-600' : 'text-orange-600 font-black'}>
                            {progress.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-4 w-full bg-zinc-200 rounded-full overflow-hidden border">
                        <div
                            className={`h-full transition-all duration-1000 ${isProfitable ? 'bg-green-500' : 'bg-gradient-to-r from-red-500 via-orange-500 to-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs font-medium mt-2">
                        {isProfitable
                            ? `🎉 Estás en zona de UTILIDAD. Has superado la meta por ${formatCurrency(metrics.totalSalesCurrentMonth - metrics.breakEvenPoint)}`
                            : `Faltan ${formatCurrency(metrics.breakEvenPoint - metrics.totalSalesCurrentMonth)} para poder dormir tranquilo este mes.`}
                    </p>
                </div>

                <div className={`p-4 rounded-xl border shadow-sm ${isProfitable ? 'bg-green-600 text-white' : 'bg-white text-indigo-900'}`}>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest">Utilidad Proyectada</span>
                        <span className="text-2xl font-black">{formatCurrency(metrics.surplus)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
