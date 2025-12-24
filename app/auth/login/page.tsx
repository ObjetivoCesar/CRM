"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="w-full max-w-md">
        <Card className="glass-strong shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Image src="/logo.jpg" alt="CRM OBJETIVO Logo" width={120} height={60} className="object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">CRM OBJETIVO</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sistema de gestión inteligente de eventos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Usuario</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="admin"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="123"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass"
                />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>

              <div className="text-center mt-4">
                <Button
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={() => router.push("/auth/forgot-password")}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
