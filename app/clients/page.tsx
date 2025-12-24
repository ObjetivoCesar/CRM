'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, User, Phone, Mail, MapPin, Calendar, FileText, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Client {
    id: string
    businessName: string
    contactName: string
    phone?: string
    email?: string
    city?: string
    businessType?: string
    contractValue?: number
    contractStartDate?: string
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [newClient, setNewClient] = useState({
        businessName: '',
        contactName: '',
        phone: '',
        email: '',
        city: '',
        businessType: '',
        contractValue: 0
    })

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        try {
            const response = await fetch('/api/clients')
            if (!response.ok) throw new Error('Failed to fetch clients')
            const data = await response.json()
            setClients(data || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al cargar clientes')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateClient = async () => {
        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClient)
            })

            if (!response.ok) throw new Error('Failed to create client')

            toast.success('Cliente creado exitosamente')
            setIsAddOpen(false)
            setNewClient({
                businessName: '',
                contactName: '',
                phone: '',
                email: '',
                city: '',
                businessType: '',
                contractValue: 0
            })
            fetchClients()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al crear cliente')
        }
    }

    const handleDeleteClient = async (id: string) => {
        setIsDeleting(id)
        try {
            const response = await fetch(`/api/clients/${id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete client')
            }

            toast.success('Cliente eliminado exitosamente')
            fetchClients()
        } catch (error: any) {
            console.error('Error deleting client:', error)
            toast.error(`Error al eliminar: ${error.message}`)
        } finally {
            setIsDeleting(null)
        }
    }

    const filteredClients = clients.filter((c) =>
        c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <DashboardLayout>
                <div className='flex items-center justify-center h-64'>
                    <div className='text-lg text-muted-foreground'>Cargando clientes...</div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h2 className='text-3xl font-bold text-foreground'>Clientes</h2>
                        <p className='text-muted-foreground'>Gestión de clientes y su historia clínica</p>
                    </div>
                    <div className='flex gap-4 items-center'>
                        <Badge variant='secondary' className='text-lg px-4 py-2'>
                            {filteredClients.length} Clientes
                        </Badge>
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                                    <DialogDescription>
                                        Registra un nuevo cliente manualmente.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Negocio</Label>
                                        <Input
                                            id="name"
                                            value={newClient.businessName}
                                            onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="contact" className="text-right">Contacto</Label>
                                        <Input
                                            id="contact"
                                            value={newClient.contactName}
                                            onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="phone" className="text-right">Teléfono</Label>
                                        <Input
                                            id="phone"
                                            value={newClient.phone}
                                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Email</Label>
                                        <Input
                                            id="email"
                                            value={newClient.email}
                                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="value" className="text-right">Valor Contrato</Label>
                                        <Input
                                            id="value"
                                            type="number"
                                            value={newClient.contractValue}
                                            onChange={(e) => setNewClient({ ...newClient, contractValue: Number(e.target.value) })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateClient}>Guardar Cliente</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className='flex gap-4'>
                    <div className='relative flex-1'>
                        <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder='Buscar por nombre o contacto...'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='pl-10'
                        />
                    </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {filteredClients.map((client) => (
                        <Card key={client.id} className='glass-card hover:shadow-lg transition-all duration-200 border-primary/20'>
                            <CardHeader className='pb-3'>
                                <div className='flex items-center justify-between'>
                                    <CardTitle className='text-lg font-semibold text-foreground leading-tight'>{client.businessName}</CardTitle>
                                    <Badge variant="outline" className='shrink-0'>{client.businessType || 'Cliente'}</Badge>
                                </div>
                                <CardDescription className='flex items-center space-x-2'>
                                    <User className='h-4 w-4' />
                                    <span>{client.contactName}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                                <div className='space-y-2 text-sm'>
                                    <div className='flex items-center space-x-2 text-muted-foreground'>
                                        <Phone className='h-4 w-4' />
                                        <span>{client.phone || 'Sin teléfono'}</span>
                                    </div>
                                    <div className='flex items-center space-x-2 text-muted-foreground'>
                                        <Mail className='h-4 w-4' />
                                        <span className='truncate'>{client.email || 'Sin email'}</span>
                                    </div>
                                    {client.contractValue && (
                                        <div className='flex items-center space-x-2 text-green-600 font-medium'>
                                            <span className='text-lg'>${client.contractValue}</span>
                                        </div>
                                    )}
                                </div>

                                <div className='flex gap-2 pt-2'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='flex-1'
                                        onClick={() => window.location.href = `/clients/${client.id}`}
                                    >
                                        <FileText className='h-4 w-4 mr-1' />
                                        Ficha
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-red-500 hover:text-red-700 hover:bg-red-50 px-2'
                                                disabled={isDeleting === client.id}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Se eliminarán los datos del contacto de la tabla unificada.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-red-500 hover:bg-red-700"
                                                    onClick={() => handleDeleteClient(client.id)}
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    )
}
