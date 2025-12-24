"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Loader2 } from "lucide-react"
import { NewTransactionDialog } from "@/components/finance/new-transaction-dialog"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface Metrics {
    cashFlow: number
    accountsReceivable: number
    accountsPayable: number
    balance: number
}

interface Transaction {
    id: string
    type: "INCOME" | "EXPENSE"
    category: string
    description: string
    amount: number
    date: string
    status: "PENDING" | "PAID" | "OVERDUE"
    dueDate?: string
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

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
                        <p className="text-muted-foreground">Gestiona tu flujo de caja, ingresos y gastos.</p>
                    </div>
                    <NewTransactionDialog onSuccess={fetchData} />
                </div>

                {/* Metrics Overview */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Flujo de Caja (Mes)</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <div className={`text-2xl font-bold ${metrics && metrics.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {metrics ? formatCurrency(metrics.cashFlow) : '$0.00'}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Ingresos vs Gastos (Pagados)</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <div className="text-2xl font-bold">{metrics ? formatCurrency(metrics.accountsReceivable) : '$0.00'}</div>
                                    <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <div className="text-2xl font-bold">{metrics ? formatCurrency(metrics.accountsPayable) : '$0.00'}</div>
                                    <p className="text-xs text-muted-foreground">Pendiente de pago</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <div className="text-2xl font-bold">{metrics ? formatCurrency(metrics.balance) : '$0.00'}</div>
                                    <p className="text-xs text-muted-foreground">Total Líquido Histórico</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Filters */}
                <Tabs defaultValue="transactions" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                        <TabsTrigger value="overview">Resumen</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transactions">
                        <Card>
                            <CardHeader><CardTitle>Historial de Transacciones</CardTitle></CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : transactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                                        <p>No hay transacciones registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {transactions.map((tx) => (
                                            <div key={tx.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-2 rounded-full ${tx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {tx.type === 'INCOME' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{tx.description}</p>
                                                        <p className="text-sm text-muted-foreground">{tx.category} • {format(new Date(tx.date), 'PPP')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-foreground'}`}>
                                                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </span>
                                                    <Badge variant={tx.status === 'PAID' ? 'default' : tx.status === 'OVERDUE' ? 'destructive' : 'secondary'}>
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

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <Card className="col-span-4">
                                <CardHeader>
                                    <CardTitle>Ingresos vs Gastos</CardTitle>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md">
                                        Gráfico disponible próximamente
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="col-span-3">
                                <CardHeader>
                                    <CardTitle>Alertas de Vencimiento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {transactions.filter(t => t.status === 'PENDING' || t.status === 'OVERDUE').slice(0, 5).map(tx => (
                                            <div key={tx.id} className="flex items-center">
                                                <span className={`flex h-2 w-2 rounded-full mr-2 ${new Date(tx.dueDate || tx.date) < new Date() ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                <div className="ml-2 space-y-1">
                                                    <p className="text-sm font-medium leading-none">{tx.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(tx.dueDate || tx.date) < new Date() ? 'Vencido' : 'Pendiente'} - {formatCurrency(tx.amount)}
                                                    </p>
                                                </div>

                                            </div>
                                        ))}
                                        {transactions.filter(t => t.status === 'PENDING' || t.status === 'OVERDUE').length === 0 && (
                                            <p className="text-sm text-muted-foreground">No hay alertas pendientes</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}
