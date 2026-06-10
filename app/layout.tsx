import type React from "react"
import type { Metadata } from "next"
import { Montserrat, Poiret_One } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { GlobalWidgetsWrapper } from "@/components/layout/global-widgets-wrapper"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
})

const poiretOne = Poiret_One({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-poiret",
})

export const metadata: Metadata = {
  title: "CRM OBJETIVO",
  description: "Sistema de gestión inteligente de eventos y tareas",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM OBJETIVO",
  },
}

export const viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${poiretOne.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground" suppressHydrationWarning>
        {children}
        <GlobalWidgetsWrapper />
        <Toaster />
      </body>
    </html>
  )
}
