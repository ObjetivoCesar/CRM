"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, Zap, User, DollarSign, Calendar as CalIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"

const formSchema = z.object({
    clientId: z.string().min(1, "Debe seleccionar un cliente"),
    totalAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Monto inválido"),
    downPayment: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Anticipo inválido"),
    downPaymentStatus: z.enum(["PAID", "PENDING"]),
    paymentMethod: z.string().min(1, "Método requerido"),
    balanceDueDate: z.date().optional(),
    description: z.string().min(1, "Descripción requerida"),
})

interface VentaProDialogProps {
    onSuccess: () => void
}

export function VentaProDialog({ onSuccess }: VentaProDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<{ id: string, businessName: string }[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId: "",
            totalAmount: "",
            downPayment: "",
            downPaymentStatus: "PAID",
            paymentMethod: "Transferencia",
            description: "",
        },
    })

    useEffect(() => {
        const fetchClients = async () => {
            const res = await fetch('/api/clients')
            if (res.ok) {
                const data = await res.json()
                setClients(data)
            }
        }
        if (open) fetchClients()
    }, [open])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const response = await fetch("/api/finance/sales-pro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...values,
                    totalAmount: Number(values.totalAmount),
                    downPayment: Number(values.downPayment),
                    balanceDueDate: values.balanceDueDate?.toISOString(),
                }),
            })

            if (!response.ok) throw new Error("Error en el servidor")

            toast.success("Venta procesada y dividida correctamente")
            setOpen(false)
            form.reset()
            onSuccess()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar venta pro")
        } finally {
            setLoading(false)
        }
    }

    const total = Number(form.watch("totalAmount") || 0)
    const down = Number(form.watch("downPayment") || 0)
    const balance = Math.max(total - down, 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 gap-2">
                    <Zap className="h-4 w-4" /> Venta Pro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-indigo-100">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Zap className="h-5 w-5 text-indigo-600" />
                        </div>
                        <DialogTitle>Asistente de Venta Pro</DialogTitle>
                    </div>
                    <DialogDescription>
                        Crea automáticamente el Anticipo (Pagado) y el Saldo (Pendiente).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                        <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2"><User className="h-3 w-3" /> Cliente</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cliente..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.businessName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Producto/Servicio</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Rediseño Web Corporativa" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="totalAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> Valor Total</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="downPayment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Anticipo (Hoy)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0.00" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {balance > 0 && (
                            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-indigo-700 font-medium">Saldo Pendiente:</span>
                                    <span className="text-lg font-bold text-indigo-900">${balance.toFixed(2)}</span>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="balanceDueDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-xs">Fecha de cobro del saldo</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal h-8 text-xs", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(field.value, "PPP") : <span>Elegir fecha...</span>}
                                                            <CalIcon className="ml-auto h-3 w-3 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Método</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Transferencia">Transferencia</SelectItem>
                                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                                <SelectItem value="CANJE">Canje (Barter)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="downPaymentStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado Anticipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PAID">Pagado (Hoy)</SelectItem>
                                                <SelectItem value="PENDING">Pendiente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Procesar Venta Pro
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
