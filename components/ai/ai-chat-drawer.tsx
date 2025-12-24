'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Sparkles, Send, Trash2, Bot, User, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export function AIChatDrawer() {
    const params = useParams()
    const [isOpen, setIsOpen] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>('')
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

    // Pre-select client if on details page - Fetch specifically that client
    useEffect(() => {
        if (params?.id) {
            const fetchCurrentClient = async () => {
                try {
                    const res = await fetch(`/api/clients/${params.id}`)
                    const { client } = await res.json()
                    if (client) {
                        setClients([client])
                        setSelectedClientId(client.id)
                    }
                } catch (error) {
                    console.error('Error auto-selecting client:', error)
                }
            }
            fetchCurrentClient()
        }
    }, [params?.id])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 1) {
                performSearch(searchQuery)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const performSearch = async (q: string) => {
        setIsSearching(true)
        try {
            const res = await fetch(`/api/clients/search?q=${encodeURIComponent(q)}`)
            const data = await res.json()
            setClients(data)
        } catch (error) {
            console.error('Search error:', error)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSendMessage = async () => {
        if (!input.trim() || !selectedClientId || isLoading) return

        const userMessage: Message = { role: 'user', content: input }
        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')
        setIsLoading(true)

        try {
            const customInstructions = localStorage.getItem('crm_ai_personality') || ''

            const response = await fetch('/api/ai/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClientId,
                    message: input,
                    history: messages.slice(-5), // Send last 5 for context
                    customInstructions
                })
            })

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Sesión expirada. Por favor, recarga la página o inicia sesión de nuevo.');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al conectar con la IA');
            }

            const isStream = response.headers.get('Content-Type')?.includes('text/plain');
            if (!isStream) {
                throw new Error('Respuesta inesperada del servidor (No es un stream de texto)');
            }

            const reader = response.body?.getReader()
            if (!reader) throw new Error('No se pudo establecer el canal de comunicación');

            const assistantMessage: Message = { role: 'assistant', content: '' }
            setMessages(prev => [...prev, assistantMessage])

            let accumulatedContent = ''
            const decoder = new TextDecoder()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                accumulatedContent += chunk

                setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1].content = accumulatedContent
                    return updated
                })
            }

        } catch (error) {
            console.error('Chat error:', error)
            toast.error('Error al conversar con Cortex')
        } finally {
            setIsLoading(false)
        }
    }

    const clearHistory = () => {
        setMessages([])
        toast.info('Cerebro limpiado para este cliente')
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-700 hover:scale-110 transition-transform duration-200 z-50"
                    size="icon"
                >
                    <Sparkles className="h-6 w-6 text-white animate-pulse" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[500px] flex flex-col p-0 bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
                <SheetHeader className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Cortex AI
                            </SheetTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={clearHistory} title="Limpiar Cerebro">
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                        </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="relative">
                            <Input
                                placeholder="Buscar cliente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-2.5">
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                </div>
                            )}
                        </div>
                        <Select value={selectedClientId} onValueChange={(val) => {
                            setSelectedClientId(val)
                            setMessages([])
                        }}>
                            <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder={clients.length > 0 ? "Resultados de búsqueda..." : "Busca un cliente arriba"} />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.length > 0 ? (
                                    clients.map((client: any) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.businessName}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-center text-muted-foreground">
                                        Escribe 2+ letras para buscar
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4 pb-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 opacity-70">
                                <Bot className="h-12 w-12 text-slate-300" />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-500">
                                        {selectedClientId
                                            ? "¿En qué puedo ayudarte con este cliente?"
                                            : "Selecciona un cliente para comenzar el análisis estratégico."}
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center max-w-[300px]">
                                        {['Dime sus dolores', 'Análisis financiero', 'Estrategia de cierre'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setInput(s)}
                                                className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 transition-colors"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                                        }`}>
                                        {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-indigo-600" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none text-slate-900 dark:text-slate-100'
                                        }`}>
                                        <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 items-center text-slate-400 text-sm italic">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cortex está analizando...
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={selectedClientId ? "Escribe un mensaje..." : "Selecciona un cliente primero"}
                            disabled={!selectedClientId || isLoading}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                        <Button
                            type="submit"
                            disabled={!selectedClientId || !input.trim() || isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
