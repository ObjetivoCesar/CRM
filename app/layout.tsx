import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import dynamic from "next/dynamic"

// Lazy load heavy components
const AIChatDrawer = dynamic(() => import("@/components/ai/ai-chat-drawer").then(mod => mod.AIChatDrawer), {
  ssr: false,
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "CRM OBJETIVO",
  description: "Sistema de gestión inteligente de eventos y tareas",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${poppins.variable} antialiased dark`} suppressHydrationWarning>
      <body className="font-poppins bg-gray-900 text-white" suppressHydrationWarning>
        {children}
        <AIChatDrawer />
        <Toaster />
      </body>
    </html>
  )
}
