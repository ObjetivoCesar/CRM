"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, AlertCircle, TrendingDown, Landmark, Home, ShoppingCart, User } from "lucide-react"
import { toast } from "sonner"

interface Liability {
    id: string
    name: string
    category: string
    monthlyPayment: number
    totalDebt?: number
    remainingDebt?: number
    dueDate?: number
    status: 'UP_TO_DATE' | 'PENDING' | 'OVERDUE'
}

export function PersonalLiabilitiesCard() {
    const [liabilities, setLiabilities] = useState<Liability[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLiabilities = async () => {
        try {
            const res = await fetch('/api/finance/personal')
            if (res.ok) {
                const data = await res.json()
                setLiabilities(data)
            }
        } catch (error) {
            console.error("Error fetching liabilities", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLiabilities()
    }, [])

    const toggleStatus = async (item: Liability) => {
        const newStatus = item.status === 'UP_TO_DATE' ? 'PENDING' : 'UP_TO_DATE'
        try {
            const res = await fetch(`/api/finance/personal/${item.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                setLiabilities(prev => prev.map(l => l.id === item.id ? { ...l, status: newStatus } : l))
                toast.success(`${item.name} actualizado`)
            }
        } catch (error) {
            toast.error("Error al actualizar")
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
    }

    const getIcon = (cat: string) => {
        switch (cat.toLowerCase()) {
            case 'préstamo': return <Landmark className="h-4 w-4" />
            case 'vivienda': return <Home className="h-4 w-4" />
            case 'alimentación': return <ShoppingCart className="h-4 w-4" />
            default: return <User className="h-4 w-4" />
        }
    }

    if (loading) return <div className="p-4 text-center">Cargando deudas personales...</div>

    return (
        <Card className="border-amber-200/50 bg-amber-50/10">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2 text-amber-900">
                            Control Personal (TDAH Support)
                        </CardTitle>
                        <CardDescription>Deudas de casa y servicios básicos para mantener el enfoque.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {liabilities.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => toggleStatus(item)}
                                >
                                    {item.status === 'UP_TO_DATE' ?
                                        <CheckCircle2 className="h-6 w-6 text-green-500" /> :
                                        <Circle className="h-6 w-6 text-gray-300" />}
                                </Button>
                                <div>
                                    <p className={`font-bold ${item.status === 'UP_TO_DATE' ? 'line-through text-muted-foreground' : ''}`}>
                                        {item.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {getIcon(item.category)}
                                        {item.category} • Día {item.dueDate}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">{formatCurrency(item.monthlyPayment)}</p>
                                <Badge variant={item.status === 'UP_TO_DATE' ? 'secondary' : 'default'} className={item.status === 'UP_TO_DATE' ? '' : 'bg-amber-500'}>
                                    {item.status === 'UP_TO_DATE' ? 'Pagado' : 'Pendiente'}
                                </Badge>
                            </div>
                        </div>

                        {item.totalDebt && item.remainingDebt && (
                            <div className="mt-3 space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Progreso del Capital</span>
                                    <span>{formatCurrency(item.totalDebt - item.remainingDebt)} / {formatCurrency(item.totalDebt)}</span>
                                </div>
                                <Progress value={((item.totalDebt - item.remainingDebt) / item.totalDebt) * 100} className="h-1.5" />
                            </div>
                        )}
                    </div>
                ))}

                {liabilities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground italic">
                        No hay deudas registradas. ¡Libertad financiera!
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
