"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, DollarSign, Calendar } from "lucide-react"

interface ConvertLeadDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: FinancialDetails) => void
    leadName: string
    isConverting: boolean
}

export interface FinancialDetails {
    contractValue: number
    initialPayment: number
    balanceDueDate?: Date
}

export function ConvertLeadDialog({ isOpen, onClose, onConfirm, leadName, isConverting }: ConvertLeadDialogProps) {
    const [contractValue, setContractValue] = useState<string>("")
    const [initialPayment, setInitialPayment] = useState<string>("")
    const [balanceDueDate, setBalanceDueDate] = useState<Date | undefined>(new Date())

    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm({
            contractValue: parseFloat(contractValue) || 0,
            initialPayment: parseFloat(initialPayment) || 0,
            balanceDueDate
        })
    }

    const balance = (parseFloat(contractValue) || 0) - (parseFloat(initialPayment) || 0)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        🎉 Convertir a Cliente: {leadName}
                    </DialogTitle>
                    <DialogDescription>
                        Configura el acuerdo financiero inicial para el Mando de Control.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="total">Valor Total del Contrato</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="total"
                                className="pl-9 font-bold"
                                placeholder="0.00"
                                value={contractValue}
                                onChange={(e) => setContractValue(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="initial">Anticipo / Primer Pago</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="initial"
                                className="pl-9 text-green-600 font-bold"
                                placeholder="0.00"
                                value={initialPayment}
                                onChange={(e) => setInitialPayment(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Este valor se registrará como ingreso HOY.</p>
                    </div>

                    {balance > 0 && (
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                            <div className="flex justify-between items-center text-orange-800">
                                <span className="text-xs font-bold uppercase">Saldo Pendiente</span>
                                <span className="text-lg font-black">${balance.toLocaleString()}</span>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-orange-900">¿Cuándo vencerá este saldo?</Label>
                                <div className="flex bg-white rounded-md border border-orange-200 overflow-hidden">
                                    <Input
                                        type="date"
                                        className="border-none focus-visible:ring-0"
                                        value={balanceDueDate ? format(balanceDueDate, 'yyyy-MM-dd') : ''}
                                        onChange={(e) => setBalanceDueDate(new Date(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isConverting}>
                        Cancelar
                    </Button>
                    <Button
                        className="bg-black text-white hover:bg-zinc-800"
                        onClick={handleConfirm}
                        disabled={isConverting || !contractValue}
                    >
                        {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar y Convertir"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function format(date: Date, formatStr: string) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
