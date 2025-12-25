"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"

export function ForecastChart() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/finance/forecast")
            .then(res => res.json())
            .then(d => {
                if (d.projection) {
                    // Sample every 7 days for better visibility, or keep all
                    setData(d.projection)
                }
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="h-64 flex items-center justify-center bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" /> Calculando proyección...
        </div>
    )

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" /> PROYECCIÓN DE LIQUIDEZ (90 DÍAS)
                </CardTitle>
                <CardDescription>Visualización del saldo disponible sumando ingresos esperados y restando gastos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str, index) => {
                                    const date = new Date(str);
                                    return index % 15 === 0 ? date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) : '';
                                }}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border rounded-lg shadow-xl text-xs">
                                                <p className="font-bold border-b pb-1 mb-1">{new Date(d.date).toLocaleDateString()}</p>
                                                <p className="text-indigo-600 font-black">Saldo: ${d.balance.toLocaleString()}</p>
                                                {d.income > 0 && <p className="text-green-600">Ingresos: +${d.income}</p>}
                                                {d.expense > 0 && <p className="text-red-600">Gastos: -${d.expense}</p>}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
