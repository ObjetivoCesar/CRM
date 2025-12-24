'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, X, AlertTriangle } from 'lucide-react'

interface ProfileChange {
    field: string
    currentValue: string | null
    proposedValue: string
    fieldLabel: string
}

interface ProfileUpdateConfirmationProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    changes: ProfileChange[]
    onConfirm: () => void
    onReject: () => void
    isLoading?: boolean
}

export function ProfileUpdateConfirmation({
    open,
    onOpenChange,
    changes,
    onConfirm,
    onReject,
    isLoading = false
}: ProfileUpdateConfirmationProps) {
    if (changes.length === 0) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <DialogTitle>🤖 Cambios Detectados por IA</DialogTitle>
                            <DialogDescription>
                                La IA detectó {changes.length} cambio{changes.length > 1 ? 's' : ''} en el perfil del contacto
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="p-3 text-left text-sm font-semibold">Campo</th>
                                    <th className="p-3 text-left text-sm font-semibold">Valor Actual</th>
                                    <th className="p-3 text-left text-sm font-semibold">Valor Propuesto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {changes.map((change, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                        <td className="p-3 font-medium">{change.fieldLabel}</td>
                                        <td className="p-3">
                                            {change.currentValue ? (
                                                <span className="text-muted-foreground">{change.currentValue}</span>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">vacío</Badge>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className="font-semibold text-green-600">{change.proposedValue}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900 dark:text-blue-100">
                            <strong>Nota:</strong> Estos cambios fueron detectados automáticamente.
                            Revisa que la información sea correcta antes de aplicarlos.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onReject}
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4 mr-2" />
                        Ignorar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isLoading ? 'Aplicando...' : 'Aplicar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
