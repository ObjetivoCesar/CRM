
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { Calendar as CalendarIcon, Filter, Download, DollarSign, TrendingUp, AlertCircle, PieChart } from "lucide-react"
import { DateRange } from "react-day-picker"
import { addDays, format, startOfMonth, subMonths, startOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

export function FinancialAnalyticsWidget() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    })
    const [viewMode, setViewMode] = useState("overview")
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [clientFilter, setClientFilter] = useState("all")
    const [showFilters, setShowFilters] = useState(false)
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")

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
                        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
                        ...(statusFilter !== 'all' ? { status: statusFilter } : {})
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
    }, [date, viewMode, clientFilter, typeFilter, statusFilter])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)
    }

    return (
        <Card className="col-span-1 lg:col-span-7 border-t-4 border-t-indigo-600 shadow-lg">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                            Inteligencia Financiera
                        </CardTitle>
                        <CardDescription>
                            Análisis dinámico de rentabilidad y flujo de caja.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "justify-start text-left font-normal w-[240px]",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd", { locale: es })} -{" "}
                                                {format(date.to, "LLL dd", { locale: es })}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y", { locale: es })
                                        )
                                    ) : (
                                        <span>Seleccionar fechas</span>
                                    )}
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

                        {/* Quick Presets */}
                        <Select onValueChange={(v) => {
                            const now = new Date();
                            if (v === 'this_month') setDate({ from: startOfMonth(now), to: now });
                            if (v === 'last_90') setDate({ from: subMonths(now, 3), to: now });
                            if (v === 'ytd') setDate({ from: startOfYear(now), to: now });
                        }}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Periodo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this_month">Este Mes</SelectItem>
                                <SelectItem value="last_90">Últimos 90d</SelectItem>
                                <SelectItem value="ytd">Año Actual</SelectItem>
                            </SelectContent>
                        </Select>


                        <Popover open={showFilters} onOpenChange={setShowFilters}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-sm mb-3">Filtros Avanzados</h4>
                                    </div>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">Tipo de Transacción</label>
                                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                                <SelectTrigger className="w-full mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="INCOME">Ingresos</SelectItem>
                                                    <SelectItem value="EXPENSE">Gastos</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">Estado</label>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="w-full mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="PAID">Pagado</SelectItem>
                                                    <SelectItem value="PENDING">Pendiente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setTypeFilter("all")
                                                setStatusFilter("all")
                                                setClientFilter("all")
                                            }}
                                        >
                                            Limpiar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setShowFilters(false)}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* KPI STRIP */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Ingresos Reales</p>
                        <p className="text-2xl font-bold text-green-600">
                            {data ? formatCurrency(data.summary.totalIncome) : '...'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Gastos Op.</p>
                        <p className="text-2xl font-bold text-red-600">
                            {data ? formatCurrency(data.summary.totalExpense) : '...'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Efic. Cobranza</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-indigo-600">
                                {data ? data.summary.collectionEfficiency.toFixed(1) : '...'}%
                            </p>
                            {data && data.summary.collectionEfficiency < 80 && (
                                <AlertCircle className="h-4 w-4 text-orange-500 animate-pulse" />
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Por Cobrar</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {data ? formatCurrency(data.summary.pendingCollections) : '...'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.chartData || []}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="label"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="income"
                                    name="Ingresos"
                                    stroke="#16a34a"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorIncome)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="expense"
                                    name="Gastos"
                                    stroke="#dc2626"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorExpense)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Breakdown Side Panel */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <PieChart className="h-4 w-4" /> Top Clientes (Ingresos)
                        </h4>
                        <div className="space-y-3">
                            {data?.breakdown?.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        <span className="truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                    </div>
                                    <span className="font-mono font-medium">{formatCurrency(item.value)}</span>
                                </div>
                            ))}
                            {(!data?.breakdown || data.breakdown.length === 0) && (
                                <p className="text-xs text-muted-foreground italic">No hay datos suficientes en este periodo.</p>
                            )}
                        </div>

                        <Separator className="my-4" />

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-xs text-muted-foreground mb-1">Margen Neto (Periodo)</p>
                            <div className="flex items-end justify-between">
                                <span className={cn(
                                    "text-2xl font-black tracking-tighter",
                                    data?.summary.netProfit >= 0 ? "text-slate-900" : "text-red-600"
                                )}>
                                    {data ? formatCurrency(data.summary.netProfit) : '...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
