"use client"

import { useState, useEffect } from "react"
import { Bell, UserPlus, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function NotificationsPopover() {
    const router = useRouter()
    const [newLeadsCount, setNewLeadsCount] = useState(0)
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
    const [open, setOpen] = useState(false)

    const checkNotifications = async () => {
        try {
            const res = await fetch("/api/leads/count-new")
            if (res.ok) {
                const { count } = await res.json()
                setNewLeadsCount(count)
            }
        } catch (e) { console.error(e) }

        try {
            const res = await fetch("/api/whatsapp/unread")
            if (res.ok) {
                const { count } = await res.json()
                setUnreadMessagesCount(count)
            }
        } catch (e) { console.error(e) }
    }

    useEffect(() => {
        checkNotifications()
        const interval = setInterval(checkNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    const total = newLeadsCount + unreadMessagesCount

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="relative flex items-center justify-center p-2 rounded-lg text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-colors outline-none focus:ring-2 focus:ring-[#C82AEF]"
                    aria-label="Notificaciones"
                >
                    <Bell className="h-5 w-5" />
                    {total > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C82AEF] text-[9px] font-extrabold text-white ring-2 ring-[#0E0E0E] shadow-[0_0_8px_rgba(200,42,239,0.8)]">
                            {total > 9 ? '9+' : total}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-[#1A1A1A] border border-white/10 text-white shadow-2xl rounded-2xl overflow-hidden" align="end" sideOffset={8}>
                <div className="px-4 py-3 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-[#8B8B8B] bg-black/40 flex items-center justify-between">
                    <span>Notificaciones</span>
                    {total > 0 && <span className="px-2 py-0.5 rounded-full bg-[#C82AEF]/20 text-[#E870FF] text-[10px]">{total} Nuevas</span>}
                </div>
                <div className="p-1 space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-auto py-3 px-3 hover:bg-white/5 rounded-xl transition-colors"
                        onClick={() => { router.push('/leads'); setOpen(false); }}
                    >
                        <div className="relative p-2 bg-[#C82AEF]/15 rounded-xl text-[#E870FF] border border-[#C82AEF]/30">
                            <UserPlus className="h-4 w-4" />
                            {newLeadsCount > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-[#C82AEF] rounded-full ring-2 ring-[#1A1A1A]" />}
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-semibold text-white">Nuevos Leads</span>
                            <span className="text-xs text-[#8B8B8B]">
                                {newLeadsCount === 0 ? "No hay prospectos pendientes" : `${newLeadsCount} prospectos por revisar`}
                            </span>
                        </div>
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-auto py-3 px-3 hover:bg-white/5 rounded-xl transition-colors"
                        onClick={() => { router.push('/comunicaciones'); setOpen(false); }}
                    >
                        <div className="relative p-2 bg-emerald-500/15 rounded-xl text-emerald-400 border border-emerald-500/30">
                            <MessageSquare className="h-4 w-4" />
                            {unreadMessagesCount > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-emerald-500 rounded-full ring-2 ring-[#1A1A1A]" />}
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-semibold text-white">WhatsApp</span>
                            <span className="text-xs text-[#8B8B8B]">
                                {unreadMessagesCount === 0 ? "Bandeja al día" : `${unreadMessagesCount} mensajes no leídos`}
                            </span>
                        </div>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
