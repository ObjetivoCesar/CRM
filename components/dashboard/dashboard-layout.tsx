"use client"

import React from "react"
import type { ReactNode } from "react"
import {
  Bell,
  Calendar,
  CheckSquare,
  FileText,
  Home,
  LineChart,
  LogOut,
  Menu,
  Package,
  Package2,
  ShoppingCart,
  Users,
  UserPlus,
  MapPin,
  BarChart3,
  Settings,
  UserCheck,
  MessageSquare,
  Database,
  Search,
  Mic,
  Sparkles,
  FileSignature,
  TrendingUp,
  Target,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar"

import { NotificationsPopover } from "@/components/dashboard/notifications-popover"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [newLeadsCount, setNewLeadsCount] = React.useState(0)

  // Restore sidebar badge logic
  React.useEffect(() => {
    const checkNewLeads = async () => {
      try {
        const response = await fetch("/api/leads/count-new")
        if (response.ok) {
          const { count } = await response.json()
          setNewLeadsCount(count)
        }
      } catch (error) {
        console.error("Error checking new leads:", error)
      }
    }

    checkNewLeads()
    const interval = setInterval(checkNewLeads, 30000)
    return () => clearInterval(interval)
  }, [])

  const navigation = [
    { name: "Dashboard", icon: BarChart3, href: "/dashboard" },
    { name: "Comunicaciones", icon: MessageSquare, href: "/comunicaciones" },
    { name: "Recorridos", icon: MapPin, href: "/recorridos" },
    // { name: "Base de Datos", icon: Database, href: "/prospects" }, // Temporarily removed per user request
    { name: "Leads", icon: UserPlus, href: "/leads", badge: newLeadsCount > 0 ? newLeadsCount : undefined },
    { name: "Clientes", icon: UserCheck, href: "/clients" },
    { name: "Tareas", icon: CheckSquare, href: "/tasks" },
    { name: "Eventos", icon: Calendar, href: "/events" },
    { name: "Finanzas", icon: MessageSquare, href: "/finance" }, // Usando MessageSquare temporalmente, cambiar a Banknote si disponible
    { name: "Cotizaciones", icon: FileText, href: "/cotizaciones" },
    { name: "Contratos", icon: FileSignature, href: "/contratos" },
    { name: "Marketing", icon: Users, href: "/marketing/scheduler" },
    { name: "Campañas", icon: TrendingUp, href: "/marketing/launch" },
    { name: "Discovery", icon: Search, href: "/discovery" },
    { name: "Adquisición", icon: Target, href: "/adquisicion", badge: "GEO" },
    { name: "Entrenador", icon: Mic, href: "/trainer" },
    { name: "Donna", icon: Sparkles, href: "/donna", badge: "AI" },
  ]

  const settingsNavigation = { name: "Configuración", icon: Settings, href: "/settings" }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-muted/20 overflow-hidden">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.jpg"
                alt="CRM OBJETIVO"
                width={40}
                height={40}
                className="object-contain rounded-lg"
              />
              <div>
                <span className="text-xl font-display tracking-[0.12em] text-sidebar-foreground">OBJETIVO</span>
                <p className="text-xs text-sidebar-foreground/60 tracking-wider">CRM Inteligente</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      onClick={() => router.push(item.href)}
                      isActive={isActive}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <Badge className="ml-auto">{item.badge}</Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push(settingsNavigation.href)}
                  isActive={pathname.startsWith(settingsNavigation.href)}
                >
                  <settingsNavigation.icon className="h-5 w-5" />
                  <span>{settingsNavigation.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push("/auth/login")}>
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar Sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6 sm:h-auto sm:border-0 sm:bg-transparent sm:px-8">
            <SidebarTrigger className="sm:hidden" aria-label="Alternar menú lateral" />
            <h1 className="text-2xl font-bold text-foreground">
              {navigation.find((item) => pathname.startsWith(item.href))?.name || "Dashboard"}
            </h1>
            <div className="relative ml-auto flex-1 md:grow-0">
              <div className="ml-auto w-fit">
                <NotificationsPopover />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 w-full max-w-full">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}