'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Event {
    id: string
    title: string
    description?: string
    startTime: string
    endTime: string
    location?: string
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        location: ''
    })

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events')
            if (!response.ok) throw new Error('Failed to fetch events')
            const data = await response.json()
            setEvents(data || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al cargar eventos')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateEvent = async () => {
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            })

            if (!response.ok) throw new Error('Failed to create event')

            toast.success('Evento creado exitosamente')
            setIsAddOpen(false)
            setNewEvent({
                title: '',
                description: '',
                startTime: '',
                endTime: '',
                location: ''
            })
            fetchEvents()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al crear evento')
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className='flex items-center justify-center h-64'>
                    <div className='text-lg text-muted-foreground'>Cargando eventos...</div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h2 className='text-3xl font-bold text-foreground'>Eventos</h2>
                        <p className='text-muted-foreground'>Calendario de reuniones y actividades</p>
                    </div>
                    <div className='flex gap-4 items-center'>
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Evento
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agendar Nuevo Evento</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="title" className="text-right">Título</Label>
                                        <Input
                                            id="title"
                                            value={newEvent.title}
                                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="start" className="text-right">Inicio</Label>
                                        <Input
                                            id="start"
                                            type="datetime-local"
                                            value={newEvent.startTime}
                                            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="end" className="text-right">Fin</Label>
                                        <Input
                                            id="end"
                                            type="datetime-local"
                                            value={newEvent.endTime}
                                            onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="location" className="text-right">Ubicación</Label>
                                        <Input
                                            id="location"
                                            value={newEvent.location}
                                            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateEvent}>Guardar Evento</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <Card key={event.id} className="glass-card border-primary/20">
                            <CardHeader>
                                <CardTitle className="text-lg">{event.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    {format(new Date(event.startTime), 'PPP p', { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>Duración: {Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60))} min</span>
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    )
}
