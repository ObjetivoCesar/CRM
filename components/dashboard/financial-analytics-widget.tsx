
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar as CalendarIcon, DollarSign } from "lucide-react"
import { DateRange } from "react-day-picker"
import { addDays, format, startOfMonth, subMonths, startOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function FinancialAnalyticsWidget() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    })
    const [viewMode, setViewMode] = useState("overview")
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [clientFilter, setClientFilter] = useState("all")

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/finance/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dateRange: {
                        from: date?.from?.toISOString(),
                        to: date?.to?.toISOString()
                    },
                    viewMode: viewMode,
                    filters: {
                        ...(clientFilter !== 'all' ? { clientId: [clientFilter] } : {}),
                    }
                })
            })

            if (!response.ok) throw new Error("Failed to fetch analytics")
            const result = await response.json()
            setData(result)
        } catch (error) {
            console.error(error)
            toast.error("Error actualizando análisis financiero")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (date?.from) {
            fetchAnalytics()
        }
    }, [date, viewMode, clientFilter])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)
    }

    return (
        <Card className="clean-card">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[#c8a84e]" />
                            Finanzas
                        </CardTitle>
                        <CardDescription>Rentabilidad y flujo de caja.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 text-xs">
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                    {date?.from ? (
                                        date.to ? `${format(date.from, "dd MMM", { locale: es })} - ${format(date.to, "dd MMM", { locale: es })}`
                                            : format(date.from, "LLL dd", { locale: es })
                                    ) : 'Seleccionar'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        <Select onValueChange={(v) => {
                            const now = new Date();
                            if (v === 'this_month') setDate({ from: startOfMonth(now), to: now });
                            if (v === 'last_90') setDate({ from: subMonths(now, 3), to: now });
                            if (v === 'ytd') setDate({ from: startOfYear(now), to: now });
                        }}>
                            <SelectTrigger className="h-9 w-[110px] text-xs">
                                <SelectValue placeholder="Periodo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this_month">Este Mes</SelectItem>
                                <SelectItem value="last_90">90 días</SelectItem>
                                <SelectItem value="ytd">Año Actual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* KPI Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="text-xl font-bold text-emerald-600">
                            {data ? formatCurrency(data.summary.totalIncome) : '—'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Gastos</p>
                        <p className="text-xl font-bold text-rose-600">
                            {data ? formatCurrency(data.summary.totalExpense) : '—'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Cobranza</p>
                        <p className="text-xl font-bold text-[#1a2236]">
                            {data ? data.summary.collectionEfficiency.toFixed(0) : '—'}%
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Por Cobrar</p>
                        <p className="text-xl font-bold text-amber-600">
                            {data ? formatCurrency(data.summary.pendingCollections) : '—'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.chartData || []}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="income" name="Ingresos" stroke="#16a34a" strokeWidth={2} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="Gastos" stroke="#e11d48" strokeWidth={2} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-muted-foreground">Top Clientes</p>
                        {data?.breakdown?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#1a2236]" />
                                    <span className="truncate max-w-[100px]" title={item.name}>{item.name}</span>
                                </div>
                                <span className="font-mono text-xs">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                        {(!data?.breakdown || data.breakdown.length === 0) && (
                            <p className="text-xs text-muted-foreground">Sin datos en este periodo.</p>
                        )}

                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Margen Neto</p>
                            <p className={cn("text-xl font-bold", data?.summary.netProfit >= 0 ? "text-foreground" : "text-rose-600")}>
                                {data ? formatCurrency(data.summary.netProfit) : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
