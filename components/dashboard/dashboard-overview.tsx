"use client"

import { FinancialAnalyticsWidget } from "@/components/dashboard/financial-analytics-widget"
import { DonnaImpactWidget } from "@/components/donna/DonnaImpactWidget"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, ArrowRight, ClipboardList, Users, CheckCheck, TrendingUp, QrCode, Scissors, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface DashboardStats {
  pipeline: { total: number; contacted: number; interested: number; converted: number }
  finance: { income: number; expenses: number; goal: number; progress: number }
  tasks: any[]
  clientsvTwo: number
  discoveryQueue: number
  clientBreakdown: Array<{ name: string; value: number }>
}

// Reutilizable: tarjeta de vidrio glass
function GlassCard({ children, className = "", hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${hover ? 'hover:border-[rgba(0,194,224,0.25)]' : ''} ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </div>
  )
}

export function DashboardOverview() {
  const router = useRouter()
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

  if (loading) {
    return (
      <div className="p-12 text-center text-[#6B90B0] font-medium animate-pulse">
        Cargando tablero inteligente...
      </div>
    )
  }

  const funnelData = [
    { name: 'Prospectos',  value: stats?.pipeline.total || 0,     color: 'rgba(255,255,255,0.15)' },
    { name: 'Contactados', value: stats?.pipeline.contacted || 0,  color: 'rgba(0,194,224,0.30)' },
    { name: 'Interesados', value: stats?.pipeline.interested || 0, color: 'rgba(0,194,224,0.60)' },
    { name: 'Cerrados',    value: stats?.pipeline.converted || 0,  color: '#00C2E0' },
  ]

  const kpis = [
    { label: 'Total Prospectos', value: stats?.pipeline.total || 0, icon: Users,       accent: 'rgba(0,194,224,0.12)',   textColor: '#67E8F9', borderColor: 'rgba(0,194,224,0.25)' },
    { label: 'Interesados',      value: stats?.pipeline.interested || 0, icon: TrendingUp, accent: 'rgba(255,184,48,0.12)',  textColor: '#FFB830', borderColor: 'rgba(255,184,48,0.25)' },
    { label: 'Cerrados',         value: stats?.pipeline.converted || 0,  icon: CheckCheck, accent: 'rgba(0,229,160,0.12)',   textColor: '#00E5A0', borderColor: 'rgba(0,229,160,0.25)' },
    { label: 'Cola Prospección', value: stats?.discoveryQueue || 0, icon: ClipboardList, accent: 'rgba(103,232,249,0.10)', textColor: '#67E8F9', borderColor: 'rgba(103,232,249,0.20)' },
  ]

  return (
    <div className="space-y-8 pb-16">
      {/* ─── Banner de Control Ejecutivo ────────────────────────────────── */}
      <GlassCard className="p-6 relative">
        {/* Orbe de luz decorativo */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(ellipse, rgba(0,194,224,0.12) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase" style={{
                background: 'rgba(0,194,224,0.12)',
                color: '#67E8F9',
                border: '1px solid rgba(0,194,224,0.25)',
              }}>
                Control Ejecutivo
              </span>
              <span className="text-xs text-[#6B90B0]">César Reyes Personal Brand</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Tablero Multimarca</h2>
            <p className="text-sm text-[#A8C8E8] mt-0.5">Visión unificada de ActivaQR, Barberos SaaS y Finanzas Objetivo.</p>
          </div>

          <Button
            onClick={() => router.push('/discovery')}
            className="font-semibold px-5 py-2.5 rounded-xl border-0 text-white"
            style={{
              background: 'linear-gradient(135deg, #00C2E0 0%, #0090A8 100%)',
              boxShadow: '0 0 20px rgba(0,194,224,0.35), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo Prospecto
          </Button>
        </div>
      </GlassCard>

      {/* ─── Métricas por Ecosistema ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B90B0] px-1">Métricas por Ecosistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ActivaQR */}
          <GlassCard className="p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{color: '#67E8F9'}}>
                <QrCode className="h-4 w-4" /> ActivaQR SaaS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background: 'rgba(0,194,224,0.08)', color: '#67E8F9', border: '1px solid rgba(0,194,224,0.18)'}}>
                Multi-tenant
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">
              {stats?.clientBreakdown?.find(c => c.name?.toLowerCase().includes('qr'))?.value || 3}{' '}
              <span className="text-sm font-normal text-[#6B90B0]">Negocios Activos</span>
            </p>
            <p className="text-xs text-[#A8C8E8] mt-2">Escaneos este mes: <strong className="text-white">1,420 pings</strong></p>
            <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}>
              <div className="h-full rounded-full w-[65%]" style={{background: 'linear-gradient(90deg, #00C2E0, #67E8F9)'}} />
            </div>
            <div className="flex justify-between text-[11px] text-[#6B90B0] mt-2">
              <span>Retención: 94%</span>
              <button className="font-semibold hover:underline" style={{color: '#67E8F9'}} onClick={() => router.push('/clients')}>Ver clientes QR →</button>
            </div>
          </GlassCard>

          {/* Barberos SaaS */}
          <GlassCard className="p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                <Scissors className="h-4 w-4" /> Barberos SaaS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background: 'rgba(255,184,48,0.08)', color: '#FFB830', border: '1px solid rgba(255,184,48,0.18)'}}>
                Citas & Reservas
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">
              12 <span className="text-sm font-normal text-[#6B90B0]">Suscripciones</span>
            </p>
            <p className="text-xs text-[#A8C8E8] mt-2">Turnos agendados: <strong className="text-white">480 citas</strong></p>
            <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}>
              <div className="h-full rounded-full w-[45%]" style={{background: 'linear-gradient(90deg, #FFB830, #FFDC80)'}} />
            </div>
            <div className="flex justify-between text-[11px] text-[#6B90B0] mt-2">
              <span>Conversión: 88%</span>
              <button className="text-amber-400 font-semibold hover:underline" onClick={() => router.push('/clients')}>Ver barberías →</button>
            </div>
          </GlassCard>

          {/* Finanzas Objetivo */}
          <GlassCard className="p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{color: '#00E5A0'}}>
                <DollarSign className="h-4 w-4" /> Finanzas Objetivo
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background: 'rgba(0,229,160,0.08)', color: '#00E5A0', border: '1px solid rgba(0,229,160,0.18)'}}>
                Ingresos Mensuales
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">
              $4,850 <span className="text-sm font-normal text-[#6B90B0]">USD / mes</span>
            </p>
            <p className="text-xs text-[#A8C8E8] mt-2">Meta ventas: <strong style={{color: '#00E5A0'}}>78% completado</strong></p>
            <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{background: 'rgba(255,255,255,0.06)'}}>
              <div className="h-full rounded-full w-[78%]" style={{background: 'linear-gradient(90deg, #00E5A0, #67E8F9)', boxShadow: '0 0 8px rgba(0,229,160,0.6)'}} />
            </div>
            <div className="flex justify-between text-[11px] text-[#6B90B0] mt-2">
              <span>Cobranza al día: 92%</span>
              <button className="font-semibold hover:underline" style={{color: '#00E5A0'}} onClick={() => router.push('/finance')}>Abrir módulo →</button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ─── KPIs Rápidos Comercial ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <GlassCard key={i} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#6B90B0] uppercase tracking-wider">{kpi.label}</p>
                <p className="text-3xl font-extrabold text-white mt-1">{kpi.value}</p>
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: kpi.accent, border: `1px solid ${kpi.borderColor}` }}
              >
                <kpi.icon className="h-5 w-5" style={{ color: kpi.textColor }} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ─── Widget Donna AI ─────────────────────────────────────────────── */}
      <DonnaImpactWidget />

      {/* ─── Módulo Financiero Avanzado ──────────────────────────────────── */}
      <FinancialAnalyticsWidget />

      {/* ─── Embudo + Tareas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 lg:col-span-2" hover={false}>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Embudo Comercial</h3>
            <p className="text-sm text-[#6B90B0] mt-0.5">Prospección a cierres de contratos este mes.</p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 13, fill: '#A8C8E8' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0D1F35', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(10px)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Atención Requerida</h3>
            <p className="text-sm text-[#6B90B0] mt-0.5">Misiones y tareas pendientes.</p>
          </div>
          <div className="space-y-3">
            {(!stats?.tasks || stats.tasks.length === 0) ? (
              <div className="text-center py-8 text-[#6B90B0]">
                <CheckCheck className="h-10 w-10 mx-auto mb-2" style={{color: '#00C2E0'}} />
                <p className="text-sm font-medium">Todo al día, César.</p>
              </div>
            ) : (
              stats.tasks.slice(0, 5).map((task, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'}}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-[#FF6B6B]' : 'bg-[#FFB830]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    <p className="text-xs text-[#6B90B0]">{new Date(task.dueDate).toLocaleDateString('es-EC')}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#6B90B0] flex-shrink-0" />
                </div>
              ))
            )}
            <Button
              onClick={() => router.push('/tasks')}
              variant="outline"
              className="w-full mt-2 rounded-xl"
              style={{border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#A8C8E8'}}
            >
              Ver todas las misiones
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
