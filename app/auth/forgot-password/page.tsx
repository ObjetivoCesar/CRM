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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            })

            if (authError) {
                throw new Error(authError.message)
            }

            setMessage("Se ha enviado un correo de recuperación. Revisa tu bandeja de entrada.")
        } catch (error: any) {
            setError(error.message || "Error al solicitar la recuperación")
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
                        <CardTitle className="text-2xl font-bold text-primary">Recuperar Contraseña</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Ingresa tu correo para recibir un enlace de recuperación
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {message ? (
                            <div className="space-y-4 text-center">
                                <p className="text-green-600 bg-green-50 p-3 rounded border border-green-200">{message}</p>
                                <Button onClick={() => router.push("/auth/login")} variant="outline" className="w-full">
                                    Volver al Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleResetRequest} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="glass"
                                    />
                                </div>
                                {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                                    {isLoading ? "Enviando..." : "Enviar Enlace"}
                                </Button>
                                <div className="text-center">
                                    <Button
                                        variant="link"
                                        className="text-sm text-muted-foreground"
                                        onClick={() => router.push("/auth/login")}
                                    >
                                        Volver al inicio de sesión
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
