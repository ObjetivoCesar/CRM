"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw new Error(authError.message)
      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: '#050D1A',
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0, 100, 180, 0.30) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 30%, rgba(0, 194, 224, 0.15) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 80%, rgba(0, 60, 130, 0.25) 0%, transparent 60%)
        `,
      }}
    >
      {/* Decorative floating orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 rounded-full pointer-events-none" style={{background: 'radial-gradient(ellipse, rgba(0,194,224,0.15) 0%, transparent 70%)'}} />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full pointer-events-none" style={{background: 'radial-gradient(ellipse, rgba(0,80,160,0.20) 0%, transparent 70%)'}} />

      <div className="w-full max-w-md relative z-10">
        {/* Glass Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            boxShadow: '0 8px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: 'rgba(0, 194, 224, 0.10)',
                  border: '1px solid rgba(0, 194, 224, 0.25)',
                  boxShadow: '0 0 24px rgba(0,194,224,0.15)',
                }}
              >
                <Image src="/logo.jpg" alt="CRM OBJETIVO Logo" width={60} height={60} className="object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">CRM OBJETIVO</h1>
              <p className="text-sm text-[#6B90B0] mt-1">Sistema de gestión inteligente</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#A8C8E8]">Correo electrónico</Label>
              <Input
                id="email"
                type="text"
                placeholder="objetivo.cesar@gmail.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-white placeholder:text-[#4A6B88] rounded-xl border-0 focus-visible:ring-1 focus-visible:ring-[#00C2E0]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#A8C8E8]">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-white placeholder:text-[#4A6B88] rounded-xl border-0 focus-visible:ring-1 focus-visible:ring-[#00C2E0]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              />
            </div>

            {error && (
              <div
                className="p-3 rounded-xl text-sm font-medium"
                style={{background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.25)', color: '#FF6B6B'}}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold text-white border-0 mt-2"
              style={{
                background: isLoading
                  ? 'rgba(0,194,224,0.4)'
                  : 'linear-gradient(135deg, #00C2E0 0%, #0090A8 100%)',
                boxShadow: '0 0 20px rgba(0,194,224,0.30)',
                transition: 'all 200ms ease',
              }}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión →"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <button
              className="text-sm text-[#6B90B0] hover:text-[#67E8F9] transition-colors"
              onClick={() => router.push("/auth/forgot-password")}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#4A6B88] mt-6">
          Ecosistema Objetivo · Grupo Empresarial Reyes
        </p>
      </div>
    </div>
  )
}
