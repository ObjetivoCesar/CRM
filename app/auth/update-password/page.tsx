"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import Image from "next/image"

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const { error: authError } = await supabase.auth.updateUser({
                password: password,
            })

            if (authError) {
                throw new Error(authError.message)
            }

            setMessage("Contraseña actualizada con éxito. Redirigiendo...")
            setTimeout(() => {
                router.push("/auth/login")
            }, 2000)
        } catch (error: any) {
            setError(error.message || "Error al actualizar la contraseña")
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
                        <CardTitle className="text-2xl font-bold text-primary">Nueva Contraseña</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Ingresa tu nueva contraseña para recuperar el acceso
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {message ? (
                            <div className="p-4 text-center text-green-600 bg-green-50 rounded border border-green-200">
                                {message}
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Nueva Contraseña</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="glass"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="glass"
                                    />
                                </div>
                                {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                                    {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
