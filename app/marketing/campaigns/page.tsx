"use client"

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import { TrendingUp, Users, DollarSign, Target, MessageSquare, RefreshCw, BarChart3, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface CampaignStats {
  period: { days: number; since: string }
  funnel: {
    total: number
    sinContacto: number
    primerContacto: number
    segundoContacto: number
    tercerContacto: number
    convertido: number
  }
  conversationsStarted: number
  enrichedLeads: number
  convertedToClient: number
  costs: {
    totalBudget: number
    dailyBudget: number
    costPerLead: string
    costPerConversation: string
  }
  conversionRate: string
  stageBreakdown: Array<{ status: string; count: number }>
}

const FUNNEL_COLORS = ['#94a3b8', '#64748b', '#c8a84e', '#f59e0b', '#1a2236']

export default function CampaignsPage() {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketing/campaigns/stats?days=${days}`)
      const data = await res.json()
      if (data.success) setStats(data)
    } catch (e) {
      console.error('Error fetching campaign stats:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [days])

  const funnelChartData = stats ? [
    { name: 'Sin Contacto', value: stats.funnel.sinContacto },
    { name: 'Propuesta', value: stats.funnel.primerContacto },
    { name: 'Interesados', value: stats.funnel.segundoContacto },
    { name: 'Seguimiento', value: stats.funnel.tercerContacto },
    { name: 'Convertidos', value: stats.funnel.convertido },
  ].filter(d => d.value > 0) : []

  const totalLeads = stats?.funnel.total || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Campaña Facebook Ads</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoreo en tiempo real de tu inversión publicitaria.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    days === d ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="h-8">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="clean-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Inversión</p>
                  <p className="text-2xl font-bold mt-1">${stats?.costs.totalBudget || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500 opacity-80" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">${stats?.costs.dailyBudget || 5}/día</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Leads Generados</p>
                  <p className="text-2xl font-bold mt-1">{totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Costo/Lead: <strong className="text-foreground">${stats?.costs.costPerLead}</strong>
              </p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Conversaciones</p>
                  <p className="text-2xl font-bold mt-1">{stats?.conversationsStarted || 0}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-[#c8a84e] opacity-80" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Costo/Conv: <strong className="text-foreground">${stats?.costs.costPerConversation}</strong>
              </p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tasa Conversión</p>
                  <p className="text-2xl font-bold mt-1">{stats?.conversionRate || '0.0'}%</p>
                </div>
                <Target className="h-8 w-8 text-rose-500 opacity-80" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {stats?.convertedToClient || 0} clientes de {totalLeads} leads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="clean-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Embudo de Conversión</CardTitle>
              <CardDescription>Progresión de leads a clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChartData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                      {funnelChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card className="clean-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Distribución por Etapa</CardTitle>
              <CardDescription>Estado actual de todos los leads de la campaña</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelChartData.map((item, i) => {
                  const pct = totalLeads > 0 ? ((item.value / totalLeads) * 100).toFixed(0) : '0'
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[i] }} />
                          {item.name}
                        </span>
                        <span className="font-semibold">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: FUNNEL_COLORS[i] }}
                        />
                      </div>
                    </div>
                  )
                })}
                {funnelChartData.length === 0 && (
                  <p className="text-sm text-center py-8 text-muted-foreground italic">
                    Aún no hay leads de la campaña. Los datos aparecerán cuando lleguen los primeros mensajes.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Link href="/comunicaciones" className="block">
            <Card className="clean-card hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Ver Conversaciones</p>
                  <p className="text-xs text-muted-foreground">Gestiona los leads entrantes en tiempo real</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/leads" className="block">
            <Card className="clean-card hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Ver Leads</p>
                  <p className="text-xs text-muted-foreground">Kanban de prospección y seguimiento</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/marketing/scheduler" className="block">
            <Card className="clean-card hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Social Scheduler</p>
                  <p className="text-xs text-muted-foreground">Programa contenido para acompañar la campaña</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
