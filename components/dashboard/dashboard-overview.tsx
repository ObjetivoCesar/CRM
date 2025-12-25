"use client"


import { FinancialAnalyticsWidget } from "@/components/dashboard/financial-analytics-widget"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, CheckSquare, FileText, Users, Plus, DollarSign, TrendingUp, TrendingDown, ArrowRight, Sparkles, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'

interface DashboardStats {
  pipeline: {
    total: number
    contacted: number
    interested: number
    converted: number
  }
  finance: {
    income: number
    expenses: number
    goal: number
    progress: number
  }
  tasks: any[]
  clientsvTwo: number
  discoveryQueue: number
  clientBreakdown: Array<{ name: string; value: number }>
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Error al cargar datos del tablero')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando tablero...</div>
  }

  // Chart Data
  const funnelData = [
    { name: 'Prospectos', value: stats?.pipeline.total || 0, color: '#94a3b8' },
    { name: 'Contactados', value: stats?.pipeline.contacted || 0, color: '#3b82f6' },
    { name: 'Interesados', value: stats?.pipeline.interested || 0, color: '#eab308' },
    { name: 'Cerrados', value: stats?.pipeline.converted || 0, color: '#22c55e' },
  ]

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tablero Principal</h2>
          <p className="text-muted-foreground">
            Visión general del rendimiento y tareas pendientes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Prospecto
          </Button>
        </div>
      </div>

      {/* Financial Cards (The "Why") */}
      {/* Mission Control - Financial Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <FinancialAnalyticsWidget />
      </div>

      {/* Discovery Queue Card & Others */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-l-4 border-l-orange-500 bg-orange-500/5 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cola de Prospección</CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-2xl font-bold">{stats?.discoveryQueue}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Listos para llamar hoy
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-100" asChild>
                <a href="/trainer">Ir a Trainer <ArrowRight className="ml-1 h-3 w-3" /></a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Pipeline Funnel (Left 4 cols) */}
        <Card className="col-span-1 lg:col-span-4 glass-card">
          <CardHeader>
            <CardTitle>Embudo de Ventas</CardTitle>
            <CardDescription>Conversión de prospectos a clientes cerrados este mes.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" opacity={0.2} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action Center (Right 3 cols) */}
        <Card className="col-span-1 lg:col-span-3 glass-card">
          <CardHeader>
            <CardTitle>Centro de Acción</CardTitle>
            <CardDescription>Eventos y tareas que requieren atención inmediata.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>¡Todo al día! No hay tareas urgentes.</p>
                </div>
              ) : (
                stats?.tasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{task.title}</p>
                        <p className="text-xs text-muted-foreground">Vence: {new Date(task.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full mt-4">
                Ver todas las tareas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Industry Segmentation Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" /> Segmentación por Industria
            </CardTitle>
            <CardDescription>Distribución de tu cartera de clientes por giro de negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.clientBreakdown} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                    cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                  />
                  <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40}>
                    {stats?.clientBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Tips / Promotions (AI placeholder) */}
        <Card className="glass-card bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" /> Recomendaciones Estratégicas
            </CardTitle>
            <CardDescription>Opciones de promociones según tu cartera actual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(stats?.clientBreakdown || []).slice(0, 3).map((segment, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/60 rounded-xl border shadow-xs">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {segment.value}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Campaña para {segment.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {segment.name === 'Restaurante'
                      ? 'Tu segmento más fuerte. Ideal para lanzar renovaciones de menú digital.'
                      : `Presenta soluciones personalizadas para este grupo de ${segment.value} clientes.`}
                  </p>
                </div>
              </div>
            ))}
            {(!stats?.clientBreakdown || stats.clientBreakdown.length === 0) && (
              <p className="text-sm text-center py-8 text-muted-foreground italic">
                Categoriza a tus clientes en el expediente para recibir sugerencias aquí.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

