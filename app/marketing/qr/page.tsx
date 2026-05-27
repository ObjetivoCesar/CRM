"use client"

import React, { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Smartphone, Download, Copy, CheckCircle2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_PHONE = '593963410409'
const DEFAULT_MESSAGE = 'Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20sus%20productos%20digitales'

export default function QRPage() {
  const [phone, setPhone] = useState(DEFAULT_PHONE)
  const [message, setMessage] = useState('Hola, quiero información sobre sus productos digitales')
  const [copied, setCopied] = useState(false)

  const waLink = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(waLink)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(waLink)
    setCopied(true)
    toast.success('Link copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    // Open QR in new tab to download
    window.open(qrUrl, '_blank')
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">📱 Generar QR para WhatsApp</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crea un código QR que al escanearlo abra WhatsApp con un mensaje predefinido para tu bot.
          </p>
        </div>

        {/* QR Code */}
        <Card className="clean-card">
          <CardContent className="p-8 flex flex-col items-center">
            <div className="relative bg-white p-4 rounded-2xl shadow-md mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code WhatsApp"
                width={300}
                height={300}
                className="rounded-xl"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">Escanea para chatear con el bot</p>
              <p className="text-xs text-muted-foreground">
                {phone} · Mensaje predefinido incluido
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Config */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Configuración</CardTitle>
            <CardDescription>Personaliza el número y mensaje del QR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número de WhatsApp</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 font-mono text-sm"
                  placeholder="593999999999"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Código de país + número (ej: 593963410409)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje predeterminado</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Hola, quiero información..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copiado' : 'Copiar Link'}
              </Button>
              <Button onClick={handleDownload} className="flex-1 bg-[#1a2236] hover:bg-[#2a3246]">
                <Download className="h-4 w-4 mr-2" />
                Descargar QR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Link */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Vista previa del link</CardTitle>
            <CardDescription>Este es el enlace que se generará en el QR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs font-mono break-all">
              <MessageSquare className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-muted-foreground">{waLink}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
