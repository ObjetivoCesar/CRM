'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Download, Upload, Plus, MessageSquare, MoreHorizontal, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { generateWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Prospect {
    id: string
    businessName: string
    contactName: string
    phone?: string
    email?: string
    city?: string
    businessType?: string
    outreachStatus: string
    whatsappStatus: string
    notes?: string
    createdAt: string
}

export default function ProspectsPage() {
    const [prospects, setProspects] = useState<Prospect[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)

    // Pagination & Sorting State
    const [pagination, setPagination] = useState({
        pageIndex: 0, // TanStack table is 0-indexed
        pageSize: 50,
    })
    const [searchTerm, setSearchTerm] = useState('')

    const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newProspect, setNewProspect] = useState({
        businessName: '',
        contactName: '',
        phone: '',
        email: '',
        city: '',
        businessType: 'HOTEL'
    })
    const [isImporting, setIsImporting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProspects()
        }, 300) // Debounce search
        return () => clearTimeout(timeoutId)
    }, [pagination.pageIndex, pagination.pageSize, searchTerm])

    const fetchProspects = async () => {
        setLoading(true)
        try {
            // API expects 1-indexed page
            const page = pagination.pageIndex + 1
            const limit = pagination.pageSize
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: searchTerm
            })

            const response = await fetch(`/api/prospects?${query}`)
            if (!response.ok) throw new Error('Failed to fetch prospects')

            const result = await response.json()
            setProspects(result.data || [])
            setTotalCount(result.metadata?.totalCount || 0)
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al cargar prospectos')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateProspect = async () => {
        try {
            const response = await fetch('/api/prospects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProspect)
            })

            if (!response.ok) throw new Error('Failed to create prospect')

            toast.success('Prospecto creado exitosamente')
            setIsAddOpen(false)
            setNewProspect({
                businessName: '',
                contactName: '',
                phone: '',
                email: '',
                city: '',
                businessType: 'HOTEL'
            })
            fetchProspects()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al crear prospecto')
        }
    }

    const handleExportToWhatsApp = async () => {
        try {
            setIsExporting(true)
            const response = await fetch('/api/prospects/export-whatsapp')
            if (!response.ok) throw new Error('Failed to export')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `turismo_crm_export_${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success('Archivo exportado exitosamente')
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al exportar')
        } finally {
            setIsExporting(false)
        }
    }

    const handleImportFromWhatsApp = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setIsImporting(true)
            const text = await file.text()
            const data = JSON.parse(text)

            const response = await fetch('/api/prospects/import-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!response.ok) throw new Error('Failed to import')

            const result = await response.json()
            toast.success(`Importado: ${result.updated} actualizados, ${result.notFound} no encontrados`)
            fetchProspects()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al importar archivo')
        } finally {
            setIsImporting(false)
            // Reset file input
            event.target.value = ''
        }
    }

    const handleWhatsAppClick = (prospect: Prospect) => {
        if (!prospect.phone) {
            toast.error('Este prospecto no tiene teléfono')
            return
        }
        const message = generateWhatsAppMessage(prospect.contactName, prospect.businessName)
        const url = generateWhatsAppUrl(prospect.phone, message)
        window.open(url, '_blank')
        toast.success('WhatsApp abierto con mensaje personalizado')
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-gray-500'
            case 'contacted': return 'bg-blue-500'
            case 'responded': return 'bg-green-500'
            case 'interested': return 'bg-yellow-500'
            default: return 'bg-gray-400'
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            new: 'Sin Contactar',
            contacted: 'Contactado',
            responded: 'Respondió',
            interested: 'Interesado',
            not_interested: 'No Interesado',
        }
        return labels[status] || status
    }

    // --- Column Definitions ---
    const columns: ColumnDef<Prospect>[] = [
        {
            accessorKey: "businessName",
            header: "Negocio / Contacto",
            cell: ({ row }) => {
                const prospect = row.original
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{prospect.businessName}</span>
                        <span className="text-xs text-muted-foreground">{prospect.contactName}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: "businessType",
            header: "Tipo",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{row.getValue("businessType")}</Badge>
                </div>
            )
        },
        {
            accessorKey: "details",
            header: "Contacto",
            cell: ({ row }) => {
                const prospect = row.original
                return (
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" /> <span>{prospect.phone || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" /> <span className="truncate max-w-[150px]">{prospect.email || '-'}</span>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "city",
            header: "Ciudad",
        },
        {
            accessorKey: "outreachStatus",
            header: "Estado",
            cell: ({ row }) => {
                const status = row.getValue("outreachStatus") as string
                return (
                    <Badge className={`${getStatusColor(status)} text-white text-xs whitespace-nowrap`}>
                        {getStatusLabel(status)}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const prospect = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(prospect.phone || '')}>
                                Copiar Teléfono
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedProspect(prospect)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleWhatsAppClick(prospect)} disabled={!prospect.phone}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Enviar WhatsApp
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        },
    ]

    return (
        <DashboardLayout>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h2 className='text-3xl font-bold text-foreground'>Base de Prospectos</h2>
                        <p className='text-muted-foreground'>Gestión masiva de contactos ({totalCount} registros)</p>
                    </div>
                    <div className='flex gap-2 items-center'>
                        {/* Action Buttons */}
                        <Button
                            onClick={handleExportToWhatsApp}
                            disabled={isExporting}
                            variant='outline'
                            className='hidden md:flex bg-green-600/10 hover:bg-green-600/20 border-green-600'
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {isExporting ? 'Exportando...' : 'Exportar WPP'}
                        </Button>
                        <label htmlFor='import-file'>
                            <Button
                                disabled={isImporting}
                                variant='outline'
                                className='hidden md:flex bg-blue-600/10 hover:bg-blue-600/20 border-blue-600'
                                onClick={() => document.getElementById('import-file')?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {isImporting ? 'Importando...' : 'Importar WPP'}
                            </Button>
                        </label>
                        <input
                            id='import-file'
                            type='file'
                            accept='.json'
                            onChange={handleImportFromWhatsApp}
                            className='hidden'
                        />
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Agregar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agregar Nuevo Prospecto</DialogTitle>
                                    <DialogDescription>
                                        Ingresa los datos del nuevo hotel o hostal.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Negocio</Label>
                                        <Input
                                            id="name"
                                            value={newProspect.businessName}
                                            onChange={(e) => setNewProspect({ ...newProspect, businessName: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="contact" className="text-right">Contacto</Label>
                                        <Input
                                            id="contact"
                                            value={newProspect.contactName}
                                            onChange={(e) => setNewProspect({ ...newProspect, contactName: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="phone" className="text-right">Teléfono</Label>
                                        <Input
                                            id="phone"
                                            value={newProspect.phone}
                                            onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Email</Label>
                                        <Input
                                            id="email"
                                            value={newProspect.email}
                                            onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="city" className="text-right">Ciudad</Label>
                                        <Input
                                            id="city"
                                            value={newProspect.city}
                                            onChange={(e) => setNewProspect({ ...newProspect, city: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="type" className="text-right">Tipo</Label>
                                        <Select
                                            value={newProspect.businessType}
                                            onValueChange={(val) => setNewProspect({ ...newProspect, businessType: val })}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Selecciona tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HOTEL">Hotel</SelectItem>
                                                <SelectItem value="HOSTAL">Hostal</SelectItem>
                                                <SelectItem value="HOSTERIA">Hostería</SelectItem>
                                                <SelectItem value="OTRO">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateProspect}>Guardar Prospecto</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Buscar prospectos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>

                <div className="bg-background rounded-lg border">
                    <DataTable
                        columns={columns}
                        data={prospects}
                        pageCount={Math.ceil(totalCount / pagination.pageSize)}
                        rowCount={totalCount}
                        pagination={pagination}
                        onPaginationChange={(pageIndex, pageSize) => setPagination({ pageIndex, pageSize })}
                        isLoading={loading}
                    />
                </div>

                {/* Prospect Detail Modal */}
                {selectedProspect && (
                    <div className='fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 bg-black/30'>
                        <Card className='glass-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
                            <CardHeader className='border-b border-primary/20'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <CardTitle className='text-xl text-foreground'>{selectedProspect.businessName}</CardTitle>
                                        <CardDescription>{selectedProspect.contactName}</CardDescription>
                                    </div>
                                    <Button variant='ghost' onClick={() => setSelectedProspect(null)}>
                                        ×
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className='space-y-4 pt-6'>
                                <div className='grid md:grid-cols-2 gap-4'>
                                    <div>
                                        <h4 className='font-semibold mb-2'>Información de Contacto</h4>
                                        <div className='space-y-2 text-sm'>
                                            <p><span className='font-medium'>Teléfono:</span> {selectedProspect.phone}</p>
                                            <p><span className='font-medium'>Email:</span> {selectedProspect.email}</p>
                                            <p><span className='font-medium'>Ciudad:</span> {selectedProspect.city}</p>
                                            <p><span className='font-medium'>Tipo:</span> {selectedProspect.businessType}</p>
                                        </div>
                                    </div>
                                    {selectedProspect.notes && (
                                        <div>
                                            <h4 className='font-semibold mb-2'>Datos Completos (CSV)</h4>
                                            <pre className='text-xs bg-muted p-2 rounded overflow-auto max-h-60'>
                                                {selectedProspect.notes}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

