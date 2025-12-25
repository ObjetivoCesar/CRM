"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Loader2, Phone, Receipt, Wallet, UserCircle, BookOpen } from "lucide-react"
import { NewTransactionDialog } from "@/components/finance/new-transaction-dialog"
import { VentaProDialog } from "@/components/finance/venta-pro-dialog"
import { PersonalLiabilitiesCard } from "@/components/finance/personal-liabilities-card"
import { HealthSemaphore } from "@/components/finance/health-semaphore"
import { ForecastChart } from "@/components/finance/forecast-chart"
import { BreakEvenCard } from "@/components/finance/break-even-card"
import { format, isBefore, addDays } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Metrics {
    cashFlow: number
    accountsReceivable: number
    accountsPayable: number
    balance: number
    breakEvenPoint: number
    currentFixedCosts: number
    totalSalesCurrentMonth: number
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL'
    expectedCash: number
    totalCommitments: number
    totalMonthlyPersonalBurden: number
    surplus: number
    margin: number
}

interface Transaction {
    id: string
    type: "INCOME" | "EXPENSE"
    category: string
    description: string
    amount: number
    date: string
    dueDate?: string
    status: "PENDING" | "PAID" | "OVERDUE"
    client_id?: string
}

export default function FinancePage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        try {
            setLoading(true)
            const [metricsRes, transactionsRes] = await Promise.all([
                fetch("/api/finance/metrics"),
                fetch("/api/finance/transactions")
            ])

            if (metricsRes.ok) {
                const data = await metricsRes.json()
                setMetrics(data)
            }

            if (transactionsRes.ok) {
                const data = await transactionsRes.json()
                setTransactions(data)
            }

        } catch (error) {
            console.error("Failed to fetch finance data", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value)
    }

    // Proactive Logic: Find critical collections
    const criticalReceivables = transactions.filter(tx =>
        tx.type === 'INCOME' && tx.status === 'PENDING' && tx.dueDate &&
        isBefore(new Date(tx.dueDate), addDays(new Date(), 7))
    )

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                            Mando de Control Maestro
                        </h1>
                        <p className="text-muted-foreground font-medium">Análisis predictivo y gestión de liquidez integrada.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <VentaProDialog onSuccess={fetchData} />
                        <NewTransactionDialog onSuccess={fetchData} />
                    </div>
                </div>

                {/* MISSION CONTROL: HEALTH SEMAPHORE */}
                {metrics && (
                    <HealthSemaphore
                        status={metrics.healthStatus}
                        expectedCash={metrics.expectedCash}
                        totalCommitments={metrics.totalCommitments}
                    />
                )}

                <Tabs defaultValue="ledger" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 border">
                        <TabsTrigger value="ledger" className="gap-2"><BookOpen className="h-4 w-4" /> Libro Diario</TabsTrigger>
                        <TabsTrigger value="overview" className="gap-2"><TrendingUp className="h-4 w-4" /> Centro de Mando</TabsTrigger>
                        <TabsTrigger value="ar" className="gap-2"><Receipt className="h-4 w-4" /> Cobranzas (AR)</TabsTrigger>
                        <TabsTrigger value="personal" className="gap-2"><UserCircle className="h-4 w-4" /> Control Personal</TabsTrigger>
                    </TabsList>

                    {/* Ledger Tab (Now First) */}
                    <TabsContent value="ledger" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Libro Diario Operativo</CardTitle>
                                <CardDescription>Registro completo de entradas y salidas de negocio.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : (
                                    <div className="space-y-2">
                                        {transactions.map((tx) => (
                                            <div key={tx.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${tx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {tx.type === 'INCOME' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm lowercase first-letter:uppercase">{tx.description}</p>
                                                        <p className="text-xs text-muted-foreground">{tx.category} • {format(new Date(tx.date), 'dd/MM/yyyy')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`font-black ${tx.type === 'INCOME' ? 'text-green-600' : 'text-foreground'}`}>
                                                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </span>
                                                    <Badge variant={tx.status === 'PAID' ? 'default' : tx.status === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                                                        {tx.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB Content: Overview / Mission Control */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Secondary Metrics Grid */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-l-4 border-l-blue-500 bg-blue-50/20">
                                <CardHeader className="flex flex-row items-center justify-between py-2">
                                    <CardTitle className="text-[10px] font-black uppercase opacity-60">Efectivo Real (Banco)</CardTitle>
                                    <Wallet className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-black tracking-tighter">{metrics ? formatCurrency(metrics.balance) : '$0.00'}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-orange-400 bg-orange-50/20">
                                <CardHeader className="flex flex-row items-center justify-between py-2">
                                    <CardTitle className="text-[10px] font-black uppercase opacity-60">Cobranzas (AR)</CardTitle>
                                    <Receipt className="h-4 w-4 text-orange-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-black tracking-tighter text-orange-600">{metrics ? formatCurrency(metrics.accountsReceivable) : '$0.00'}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-red-500 bg-red-50/20">
                                <CardHeader className="flex flex-row items-center justify-between py-2">
                                    <CardTitle className="text-[10px] font-black uppercase opacity-60">Pagos Pendientes (AP)</CardTitle>
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-black tracking-tighter text-red-600">{metrics ? formatCurrency(metrics.accountsPayable) : '$0.00'}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-indigo-600 bg-indigo-50/20">
                                <CardHeader className="flex flex-row items-center justify-between py-2">
                                    <CardTitle className="text-[10px] font-black uppercase opacity-60">Meta Personal + Fij</CardTitle>
                                    <DollarSign className="h-4 w-4 text-indigo-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-black tracking-tighter">{metrics ? formatCurrency(metrics.breakEvenPoint) : '$0.00'}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Proactive Actions & Forecast Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Critical Actions Block */}
                                <Card className="border-dashed border-2">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-orange-500" /> ACCIONES CRÍTICAS RECOMENDADAS
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {criticalReceivables.length > 0 ? (
                                            criticalReceivables.map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-orange-100 rounded-lg">
                                                            <Phone className="h-4 w-4 text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">Cobrar Saldo: {tx.description}</p>
                                                            <p className="text-xs text-muted-foreground">Vence: {format(new Date(tx.dueDate!), 'PPP')} • Monto: {formatCurrency(tx.amount)}</p>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-xs">Llamar Ahora</Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center p-8 text-muted-foreground text-sm italic">
                                                No hay cobranzas críticas pendientes para los próximos 7 días.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Simple Forecast */}
                                <ForecastChart />
                            </div>

                            {/* Sidebar: Totals & Summary */}
                            <div className="space-y-6">
                                <BreakEvenCard metrics={metrics} loading={loading} />

                                <Card className="bg-black text-white shadow-xl">
                                    <CardHeader>
                                        <CardTitle className="text-xs font-black uppercase opacity-70">Capital de Supervivencia (30d)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-black mb-2 tracking-tighter">
                                            {metrics ? formatCurrency(metrics.expectedCash) : '$0.00'}
                                        </div>
                                        <p className="text-[10px] opacity-60 leading-tight">Total disponible proyectado si todos pagan a tiempo y se cubren las deudas personales.</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-xs font-bold uppercase opacity-50">Estructura de Costos</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-end border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Ocurridos este mes</span>
                                            <span className="font-bold text-red-600">-${metrics ? metrics.totalSalesCurrentMonth - metrics.cashFlow : '0'}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b pb-2">
                                            <span className="text-sm text-muted-foreground">Cuotas Personales</span>
                                            <span className="font-bold text-indigo-600">-${metrics ? metrics.totalMonthlyPersonalBurden : '0'}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* AR Tab */}
                    <TabsContent value="ar" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cuentas por Cobrar (AR)</CardTitle>
                                <CardDescription>Saldos pendientes de clientes por pagar.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {transactions.filter(t => t.type === 'INCOME' && t.status !== 'PAID').map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 border rounded-xl border-orange-100 bg-orange-50/10">
                                            <div className="flex items-center gap-4">
                                                <Receipt className="h-5 w-5 text-orange-500" />
                                                <div>
                                                    <p className="font-bold">{tx.description}</p>
                                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Vence: {tx.dueDate ? format(new Date(tx.dueDate), 'PPP') : 'Sin fecha'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-xl text-orange-600">{formatCurrency(tx.amount)}</p>
                                                <Button variant="ghost" size="sm" className="text-xs h-7">Notificar Cliente</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Personal Tab */}
                    <TabsContent value="personal">
                        <PersonalLiabilitiesCard />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}
