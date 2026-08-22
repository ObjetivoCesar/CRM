"use client"

import React from "react"
import type { ReactNode } from "react"
import {
  Calendar, CheckSquare, FileText, Users, UserPlus, MapPin, BarChart3,
  Settings, UserCheck, MessageSquare, Search, Mic, Sparkles,
  FileSignature, TrendingUp, Target, DollarSign, LogOut, Menu, X,
} from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { NotificationsPopover } from "@/components/dashboard/notifications-popover"

interface DashboardLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: "Tablero Principal", icon: BarChart3,     href: "/dashboard" },
  { name: "Comunicaciones",    icon: MessageSquare, href: "/comunicaciones" },
  { name: "Recorridos",        icon: MapPin,        href: "/recorridos" },
  { name: "Leads",             icon: UserPlus,      href: "/leads" },
  { name: "Clientes",          icon: UserCheck,     href: "/clients" },
  { name: "Tareas",            icon: CheckSquare,   href: "/tasks" },
  { name: "Eventos",           icon: Calendar,      href: "/events" },
  { name: "Finanzas",          icon: DollarSign,    href: "/finance" },
  { name: "Cotizaciones",      icon: FileText,      href: "/cotizaciones" },
  { name: "Contratos",         icon: FileSignature, href: "/contratos" },
  { name: "Marketing",         icon: Users,         href: "/marketing/scheduler" },
  { name: "Campañas",          icon: TrendingUp,    href: "/marketing/launch" },
  { name: "Discovery",         icon: Search,        href: "/discovery" },
  { name: "Adquisición",       icon: Target,        href: "/adquisicion", badge: "GEO" },
  { name: "Entrenador",        icon: Mic,           href: "/trainer" },
  { name: "Donna AI",          icon: Sparkles,      href: "/donna", badge: "AI" },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [newLeadsCount, setNewLeadsCount] = React.useState(0)

  // En desktop el sidebar siempre abierto; en mobile cerrado por defecto.
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setSidebarOpen(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Cerrar sidebar al cambiar de ruta en mobile
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }, [pathname])

  React.useEffect(() => {
    const checkNewLeads = async () => {
      try {
        const res = await fetch("/api/leads/count-new")
        if (res.ok) {
          const { count } = await res.json()
          setNewLeadsCount(count)
        }
      } catch {}
    }
    checkNewLeads()
    const iv = setInterval(checkNewLeads, 30000)
    return () => clearInterval(iv)
  }, [])

  const activeItem = navigation.find(
    item => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
  )

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════
          CAPA 0: Fondo FIXED — el gradient que todos los glass ven
      ═══════════════════════════════════════════════════════════ */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "#07101E",
          backgroundImage: `
            radial-gradient(ellipse 70% 55% at 15% 5%,  rgba(30,80,180,0.45) 0%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 85% 20%, rgba(0,160,220,0.20) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 50% 90%, rgba(20,50,130,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 40% 35% at 80% 80%, rgba(100,40,200,0.12) 0%, transparent 50%)
          `,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════
          CAPA 1: SIDEBAR — vidrio esmerilado lateral
      ═══════════════════════════════════════════════════════════ */}
      {/* Overlay oscuro en mobile cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "z-40 lg:relative lg:z-20 flex flex-col h-full transition-all duration-300 ease-in-out flex-shrink-0",
          // En mobile: sidebar fijo como overlay; en desktop: inline con ancho fijo
          "fixed inset-y-0 left-0 lg:translate-x-0",
          sidebarOpen
            ? "w-[260px] lg:w-[220px] translate-x-0"
            : "w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden"
        )}
      >
        {/* Panel glass del sidebar */}
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(8, 16, 36, 0.55)",
            backdropFilter: "blur(28px) saturate(160%)",
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.3)",
          }}
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                background: "rgba(0,194,224,0.10)",
                border: "1px solid rgba(0,194,224,0.22)",
                boxShadow: "0 0 14px rgba(0,194,224,0.18)",
              }}
            >
              <Image src="/logo.jpg" alt="CRM" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold tracking-widest text-white">OBJETIVO</span>
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#00C2E0", boxShadow: "0 0 6px #00C2E0" }}
                />
              </div>
              <p className="text-[9px] uppercase tracking-[0.18em] font-semibold" style={{ color: "#4A7A9B" }}>
                CRM Inteligente v2
              </p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
              const hasBadge = item.href === "/leads" ? newLeadsCount > 0 : !!item.badge
              const badgeLabel = item.href === "/leads" ? newLeadsCount : item.badge
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 text-left group"
                  style={
                    isActive
                      ? {
                          background: "rgba(0,194,224,0.13)",
                          border: "1px solid rgba(0,194,224,0.28)",
                          color: "#67E8F9",
                          boxShadow: "0 0 16px rgba(0,194,224,0.10), inset 0 1px 0 rgba(255,255,255,0.06)",
                          backdropFilter: "blur(8px)",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid transparent",
                          color: "#6A90B0",
                        }
                  }
                >
                  <item.icon
                    className="h-4 w-4 flex-shrink-0 transition-colors duration-200"
                    style={{ color: isActive ? "#00C2E0" : "#4A6A8A" }}
                  />
                  <span className={cn("flex-1 truncate", !isActive && "group-hover:text-white transition-colors")}>{item.name}</span>
                  {hasBadge && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={
                        item.badge === "AI"
                          ? { background: "#00C2E0", color: "#fff", boxShadow: "0 0 8px rgba(0,194,224,0.5)" }
                          : item.badge === "GEO"
                          ? { background: "rgba(255,184,48,0.15)", color: "#FFB830", border: "1px solid rgba(255,184,48,0.3)" }
                          : { background: "#EF4444", color: "#fff" }
                      }
                    >
                      {badgeLabel}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-2 py-3 border-t border-white/5 space-y-0.5">
            <button
              onClick={() => router.push("/settings")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 text-left"
              style={{ color: "#6A90B0" }}
            >
              <Settings className="h-4 w-4" style={{ color: "#4A6A8A" }} />
              <span>Configuración</span>
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 text-left"
              style={{ color: "rgba(248,113,113,0.75)" }}
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          CAPA 2: MAIN AREA — header glass + scrollable content
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ── Header glass ── */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between px-5 flex-shrink-0"
          style={{
            background: "rgba(7, 16, 30, 0.60)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger toggle */}
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#4A7A9B" }}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div>
              <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">
                {activeItem?.name || "Tablero"}
              </h1>
              <p className="text-[10px] mt-0.5 hidden sm:block" style={{ color: "#3D6080" }}>
                Ecosistema Objetivo · Grupo Empresarial Reyes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pill glass contenedor de notificaciones */}
            <div
              className="flex items-center rounded-xl px-2 py-1.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <NotificationsPopover />
            </div>
          </div>
        </header>

        {/* ── Contenido principal scrollable ── */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto p-5 md:p-8 space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}