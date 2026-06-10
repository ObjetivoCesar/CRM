"use client"

import { FinancialAnalyticsWidget } from "@/components/dashboard/financial-analytics-widget"
import { DonnaImpactWidget } from "@/components/donna/DonnaImpactWidget"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ArrowRight, ClipboardList, Users, CheckCheck, TrendingUp, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

  const funnelData = [
    { name: 'Prospectos',  value: stats?.pipeline.total || 0,     color: 'var(--brand-grey-border)' },
    { name: 'Contactados', value: stats?.pipeline.contacted || 0,  color: 'var(--brand-carbon-muted)' },
    { name: 'Interesados', value: stats?.pipeline.interested || 0, color: 'var(--brand-blue)' },
    { name: 'Cerrados',    value: stats?.pipeline.converted || 0,  color: 'var(--brand-carbon)' },
  ]

  // KPI cards
  const kpis = [
    { label: 'Total Prospectos', value: stats?.pipeline.total || 0, icon: Users, accent: 'bg-slate-100 text-slate-700' },
    { label: 'Interesados', value: stats?.pipeline.interested || 0, icon: TrendingUp, accent: 'bg-amber-100 text-amber-700' },
    { label: 'Cerrados', value: stats?.pipeline.converted || 0, icon: CheckCheck, accent: 'bg-emerald-100 text-emerald-700' },
    { label: 'Cola Prospección', value: stats?.discoveryQueue || 0, icon: ClipboardList, accent: 'bg-rose-100 text-rose-700' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Tablero</h2>
          <p className="text-sm text-muted-foreground mt-1">Visión general de tu operación comercial.</p>
        </div>
        <div className="flex gap-2">
          <NotificationBell />
          <Button className="bg-[#c8a84e] hover:bg-[#b8943e] text-[#1a2236] font-medium">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Prospecto
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="clean-card hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.accent}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Donna */}
      <DonnaImpactWidget />

      {/* Finance */}
      <FinancialAnalyticsWidget />

      {/* Pipeline + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <Card className="clean-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Embudo de Ventas</CardTitle>
            <CardDescription>Conversión de prospectos a clientes este mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 13, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action Center */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Tareas Pendientes</CardTitle>
            <CardDescription>Lo que necesita tu atención.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(!stats?.tasks || stats.tasks.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCheck className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Todo al día.</p>
                </div>
              ) : (
                stats.tasks.slice(0, 5).map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString('es-EC')}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full mt-2">
                Ver todas las tareas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Segmentation + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Industry Segmentation */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Segmentación por Industria</CardTitle>
            <CardDescription>Distribución de tu cartera por giro de negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.clientBreakdown || []} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: 'rgba(200,168,78,0.08)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {(stats?.clientBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--brand-carbon)' : 'var(--brand-blue)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Tips */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#c8a84e]" /> Recomendaciones
            </CardTitle>
            <CardDescription>Sugerencias según tu cartera actual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.clientBreakdown || []).slice(0, 3).map((segment, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/60">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-carbon)] flex items-center justify-center text-[var(--brand-white)] font-bold text-sm flex-shrink-0">
                  {segment.value}
                </div>
                <div>
                  <p className="text-sm font-semibold">{segment.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {segment.value} clientes en este segmento. Ideal para campañas dirigidas.
                  </p>
                </div>
              </div>
            ))}
            {(!stats?.clientBreakdown || stats.clientBreakdown.length === 0) && (
              <p className="text-sm text-center py-8 text-muted-foreground italic">
                Categoriza a tus clientes para recibir sugerencias aquí.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


