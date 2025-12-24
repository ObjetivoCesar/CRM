'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
    Phone,
    Mail,
    MapPin,
    Calendar,
    MessageSquare,
    Plus,
    ArrowLeft,
    FileText,
    Sparkles,
    CheckCircle,
    Star,
    User
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientEditForm } from '@/components/clients/client-edit-form'
import { StrategicBoard } from '@/components/clients/strategic-board'
import { ProfileUpdateConfirmation } from '@/components/ai/ProfileUpdateConfirmation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Client, Interaction, Task } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AlertTriangle } from 'lucide-react'

export default function ClientDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [data, setData] = useState<{ client: Client; interactions: Interaction[]; tasks: Task[]; events: any[] } | null>(null)
    const [loading, setLoading] = useState(true)

    // Interaction Modal State
    const [isInteractionOpen, setIsInteractionOpen] = useState(false)
    const [newInteraction, setNewInteraction] = useState<Partial<Interaction>>({
        type: 'call',
        direction: 'outbound',
        content: '',
        outcome: '',
        duration: 0
    })

    // AI Profile Update State
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
    const [pendingChanges, setPendingChanges] = useState<any[]>([])
    const [pendingUpdates, setPendingUpdates] = useState<any>({})

    // Alerts State
    const [alerts, setAlerts] = useState<any[]>([])

    const [isFullEditing, setIsFullEditing] = useState(false)
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
    const [isReportOpen, setIsReportOpen] = useState(false)
    const [reportContent, setReportContent] = useState('')
    const [isGeneratingReport, setIsGeneratingReport] = useState(false)
    const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium'
    })

    const fetchClientDetails = useCallback(async () => {
        try {
            const response = await fetch(`/api/clients/${params.id}`)
            if (!response.ok) throw new Error('Failed to fetch client')
            const result = await response.json()
            setData(result)
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al cargar detalles del cliente')
        } finally {
            setLoading(false)
        }
    }, [params.id])

    const fetchAlerts = useCallback(async () => {
        try {
            const response = await fetch(`/api/alerts?contactId=${params.id}&status=active`)
            if (response.ok) {
                const data = await response.json()
                setAlerts(data)
            }
        } catch (error) {
            console.error('Error fetching alerts:', error)
        }
    }, [params.id])

    const handleConfirmProfileUpdate = async () => {
        try {
            const updateRes = await fetch(`/api/clients/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingUpdates)
            });

            if (updateRes.ok) {
                toast.success("✨ Perfil actualizado correctamente");
                setIsConfirmationOpen(false);
                setPendingChanges([]);
                setPendingUpdates({});
                fetchClientDetails();
            } else {
                toast.error("Error al actualizar perfil");
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error("Error al actualizar perfil");
        }
    }

    const handleRejectProfileUpdate = () => {
        setIsConfirmationOpen(false);
        setPendingChanges([]);
        setPendingUpdates({});
        toast.info("Cambios ignorados");
    }

    const resolveAlert = async (alertId: string) => {
        try {
            const response = await fetch(`/api/alerts/${alertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'resolved' })
            });

            if (response.ok) {
                toast.success("Alerta resuelta");
                fetchAlerts();
            }
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
    }

    // Memoized sorted history - must be at top level before any conditional returns
    const history = useMemo(() => {
        if (!data?.interactions) return []
        return [...data.interactions].sort((a: any, b: any) =>
            new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
        )
    }, [data?.interactions])

    useEffect(() => {
        if (params.id) {
            fetchClientDetails()
            fetchAlerts()
        }
    }, [params.id, fetchClientDetails, fetchAlerts])

    const startEditingFull = () => {
        setIsFullEditing(true)
    }

    const handleAddTask = async () => {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newTaskData,
                    contactId: params.id
                })
            })

            if (!response.ok) throw new Error('Failed to create task')

            toast.success('Tarea creada correctamente')
            setIsTaskDialogOpen(false)
            setNewTaskData({ title: '', description: '', status: 'todo', priority: 'medium' })
            fetchClientDetails()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al crear tarea')
        }
    }

    const generateReport = async () => {
        setIsReportOpen(true)
        setIsGeneratingReport(true)
        setReportContent('')

        try {
            const response = await fetch('/api/ai/reports/cortex-360', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: params.id })
            })

            if (!response.ok) throw new Error('Failed to start report generation')

            const reader = response.body?.getReader()
            const decoder = new TextEncoder().encode('').constructor === TextEncoder ? new TextDecoder() : null; // Safe decoder

            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = new TextDecoder().decode(value)
                setReportContent(prev => prev + chunk)
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al generar informe')
        } finally {
            setIsGeneratingReport(false)
        }
    }

    const handleLogInteraction = async () => {
        try {
            const interactionRes = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newInteraction,
                    contactId: params.id,
                    discoveryLeadId: client.discoveryLeadId || client.discovery_lead_id,
                    performedAt: new Date().toISOString()
                })
            })

            if (!interactionRes.ok) throw new Error('Failed to log interaction')

            const savedInteraction = await interactionRes.json()
            toast.success('Interacción registrada')
            setIsInteractionOpen(false)

            // --- AI INTELLIGENT SYSTEM ---
            const interactionContent = newInteraction.content;
            if (interactionContent && interactionContent.length > 15) {

                // 1. DETECT ALERTS (Risks, Opportunities, Blockers)
                fetch('/api/coach/detect-alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notes: interactionContent,
                        contactId: params.id,
                        interactionId: savedInteraction.id
                    })
                })
                    .then(res => res.json())
                    .then(async (data) => {
                        const detectedAlerts = data.alerts || [];

                        if (detectedAlerts.length > 0) {
                            // Save alerts to database
                            for (const alert of detectedAlerts) {
                                await fetch('/api/alerts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contactId: params.id,
                                        interactionId: savedInteraction.id,
                                        alertType: alert.type,
                                        severity: alert.severity,
                                        title: alert.title,
                                        message: alert.message,
                                        rawNote: interactionContent,
                                        confidenceScore: alert.confidence,
                                        extractedEntities: alert.entities
                                    })
                                });
                            }

                            const highSeverity = detectedAlerts.filter((a: any) => a.severity === 'high');
                            if (highSeverity.length > 0) {
                                toast.error(`⚠️ ${highSeverity.length} alerta${highSeverity.length > 1 ? 's' : ''} crítica${highSeverity.length > 1 ? 's' : ''} detectada${highSeverity.length > 1 ? 's' : ''}`);
                            } else {
                                toast.info(`📊 ${detectedAlerts.length} señal${detectedAlerts.length > 1 ? 'es' : ''} detectada${detectedAlerts.length > 1 ? 's' : ''}`);
                            }

                            // Refresh alerts
                            fetchAlerts();
                        }
                    })
                    .catch(err => console.error("Alert Detection Error:", err));

                // 2. EXTRACT PROFILE UPDATES (with Confirmation Modal + Context)
                fetch('/api/coach/extract-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notes: interactionContent,
                        clientContext: {
                            currentPhone: client.phone,
                            currentEmail: client.email,
                            businessName: client.businessName,
                            contactName: client.contactName,
                            recentInteractions: history.slice(0, 3).map((i: any) => ({
                                date: i.performedAt,
                                content: i.content,
                                outcome: i.outcome
                            }))
                        }
                    })
                })
                    .then(res => res.json())
                    .then((extracted) => {
                        console.log("AI Extracted for Client:", extracted);

                        // Build changes array for confirmation modal
                        const changes: any[] = [];
                        const updates: any = {};

                        if (extracted.phone && extracted.phone !== client.phone) {
                            changes.push({
                                field: 'phone',
                                fieldLabel: 'Teléfono',
                                currentValue: client.phone || null,
                                proposedValue: extracted.phone
                            });
                            updates.phone = extracted.phone;
                        }

                        if (extracted.email && extracted.email !== client.email) {
                            changes.push({
                                field: 'email',
                                fieldLabel: 'Email',
                                currentValue: client.email || null,
                                proposedValue: extracted.email
                            });
                            updates.email = extracted.email;
                        }

                        if (changes.length > 0) {
                            setPendingChanges(changes);
                            setPendingUpdates(updates);
                            setIsConfirmationOpen(true);
                        }
                    })
                    .catch(err => console.error("Profile Extraction Error:", err));
            }
            // -----------------------------

            setNewInteraction({
                type: 'call',
                direction: 'outbound',
                content: '',
                outcome: '',
                duration: 0
            })
            fetchClientDetails()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al registrar interacción')
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className='flex items-center justify-center h-64'>
                    <div className='text-lg text-muted-foreground animate-pulse'>Cargando historia clínica...</div>
                </div>
            </DashboardLayout>
        )
    }

    if (!data || !data.client) {
        return (
            <DashboardLayout>
                <div className='flex flex-col items-center justify-center h-64 gap-4'>
                    <div className='text-lg text-muted-foreground'>Cliente no encontrado</div>
                    <Button onClick={() => router.push('/clients')}>Volver a Clientes</Button>
                </div>
            </DashboardLayout>
        )
    }

    const { client, interactions, tasks, events } = data

    if (isFullEditing) {
        return (
            <DashboardLayout>
                <div className="bg-background rounded-xl shadow-sm border">
                    <ClientEditForm
                        clientData={client}
                        onSave={() => {
                            setIsFullEditing(false)
                            fetchClientDetails()
                        }}
                        onCancel={() => setIsFullEditing(false)}
                    />
                </div>
            </DashboardLayout>
        )
    }



    return (
        <DashboardLayout>
            <div className='space-y-6'>
                {/* Header */}
                <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                    <div className='flex items-center gap-4'>
                        <Button variant="ghost" size="icon" onClick={() => router.push('/clients')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className='text-3xl font-bold text-foreground'>{client.businessName}</h2>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="font-medium">{client.contactName}</span>
                                <span>•</span>
                                <Badge variant="outline">{client.businessType || 'Cliente'}</Badge>
                            </div>
                        </div>
                    </div>
                    <div className='flex gap-2'>
                        <Button variant="outline" onClick={startEditingFull} className="rounded-xl">
                            <FileText className="mr-2 h-4 w-4" /> Gestionar Expediente
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={generateReport}
                            disabled={isGeneratingReport}
                            className="rounded-xl"
                        >
                            <Sparkles className={cn("mr-2 h-4 w-4", isGeneratingReport && "animate-spin")} />
                            {isGeneratingReport ? 'Analizando...' : ' Informe IA'}
                        </Button>
                        <Dialog open={isInteractionOpen} onOpenChange={setIsInteractionOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl">
                                    <MessageSquare className="mr-2 h-4 w-4" /> Interactuar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Registrar Interacción</DialogTitle>
                                    <DialogDescription>Completa los detalles de la comunicación con el cliente.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Tipo</Label>
                                        <Select
                                            value={newInteraction.type}
                                            onValueChange={(val) => setNewInteraction({ ...newInteraction, type: val })}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="call">Llamada</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="meeting">Reunión</SelectItem>
                                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                <SelectItem value="note">Nota</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Resumen</Label>
                                        <Textarea
                                            value={newInteraction.content}
                                            onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Resultado</Label>
                                        <Input
                                            value={newInteraction.outcome}
                                            onChange={(e) => setNewInteraction({ ...newInteraction, outcome: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleLogInteraction}>Guardar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Alert Banner */}
                {alerts.length > 0 && (
                    <Alert variant="destructive" className="border-2">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle className="font-bold">Alertas Activas ({alerts.length})</AlertTitle>
                        <AlertDescription className="space-y-2 mt-2">
                            {alerts.slice(0, 3).map((alert: any) => (
                                <div key={alert.id} className="flex items-start justify-between gap-4 p-3 bg-background/50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">
                                            {alert.alert_type === 'risk' && '🔴'}
                                            {alert.alert_type === 'blocker' && '🟡'}
                                            {alert.alert_type === 'opportunity' && '🟢'}
                                            {alert.alert_type === 'info' && 'ℹ️'}
                                            {' '}{alert.title}
                                        </p>
                                        <p className="text-xs mt-1 text-muted-foreground">{alert.message}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => resolveAlert(alert.id)}
                                        className="flex-shrink-0"
                                    >
                                        Resolver
                                    </Button>
                                </div>
                            ))}
                            {alerts.length > 3 && (
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    + {alerts.length - 3} alerta{alerts.length - 3 > 1 ? 's' : ''} más
                                </p>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                    <div className='lg:col-span-3'>
                        <Tabs defaultValue="estrategia" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/50 p-1 rounded-xl max-w-2xl">
                                <TabsTrigger value="historial" className="rounded-lg font-semibold">Historial</TabsTrigger>
                                <TabsTrigger value="estrategia" className="rounded-lg font-semibold">Estrategia</TabsTrigger>
                                <TabsTrigger value="tareas" className="rounded-lg font-semibold">Seguimiento</TabsTrigger>
                            </TabsList>

                            <TabsContent value="historial" className="space-y-8 outline-none">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className='lg:col-span-1 space-y-6'>
                                        <Card className='border-none shadow-sm bg-muted/20'>
                                            <CardHeader className='pb-2'>
                                                <CardTitle className='text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground'>
                                                    <User className='h-4 w-4' /> Perfil Rápido
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex items-center gap-3 text-sm font-medium">
                                                    <Phone className="h-4 w-4 text-primary" />
                                                    <span>{client.phone || 'No registrado'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-medium">
                                                    <Mail className="h-4 w-4 text-primary" />
                                                    <span>{client.email || 'No registrado'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-medium">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                    <span>{client.city || 'No registrado'}</span>
                                                </div>
                                                {client.notes && (
                                                    <div className="pt-4 border-t">
                                                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Notas</p>
                                                        <p className="text-sm italic text-muted-foreground line-clamp-3 leading-relaxed">"{client.notes}"</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className='lg:col-span-2 space-y-4'>
                                        <h3 className='text-lg font-bold flex items-center gap-2 px-2'>
                                            <MessageSquare className='h-4 w-4 text-primary' /> Últimos Contactos
                                        </h3>
                                        <div className='space-y-3'>
                                            {history.length > 0 ? history.slice(0, 10).map((interaction: any) => (
                                                <div key={interaction.id} className='p-4 bg-card rounded-2xl border flex gap-4 transition-all hover:shadow-md'>
                                                    <div className='p-2 bg-muted rounded-xl h-fit border shadow-sm'>
                                                        {interaction.type === 'call' && <Phone className='h-4 w-4 text-blue-500' />}
                                                        {interaction.type === 'email' && <Mail className='h-4 w-4 text-yellow-500' />}
                                                        {interaction.type === 'meeting' && <MapPin className='h-4 w-4 text-emerald-500' />}
                                                        {interaction.type === 'whatsapp' && <MessageSquare className='h-4 w-4 text-green-500' />}
                                                        {interaction.type === 'note' && <FileText className='h-4 w-4 text-muted-foreground' />}
                                                    </div>
                                                    <div className='flex-1 space-y-1'>
                                                        <div className='flex justify-between items-start'>
                                                            <p className='text-[10px] font-bold uppercase text-muted-foreground'>
                                                                {interaction.type} • {new Date(interaction.performedAt).toLocaleDateString()}
                                                            </p>
                                                            {interaction.direction === 'outgoing' && <Badge variant="outline" className="text-[9px] h-4">SALIENTE</Badge>}
                                                        </div>
                                                        <p className='text-sm font-medium'>{interaction.content}</p>
                                                        {interaction.outcome && <p className='text-xs italic text-muted-foreground'>Resultado: {interaction.outcome}</p>}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className='text-center py-12 bg-muted/10 rounded-2xl border border-dashed'>
                                                    <p className='text-sm text-muted-foreground'>No hay interacciones registradas.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="estrategia" className="outline-none space-y-6">
                                <StrategicBoard client={client} />
                            </TabsContent>

                            <TabsContent value="tareas" className="outline-none">
                                <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
                                    <div className='space-y-6'>
                                        <div className='flex items-center justify-between'>
                                            <h3 className='text-xl font-bold flex items-center gap-2 px-1'>
                                                <Calendar className='h-5 w-5 text-primary' /> Tareas por Hacer
                                            </h3>
                                            <Button variant="ghost" size="sm" onClick={() => setIsTaskDialogOpen(true)} className="text-primary hover:bg-primary/5 rounded-lg">
                                                <Plus className="h-4 w-4 mr-1" /> Nueva
                                            </Button>
                                        </div>
                                        <div className='space-y-4'>
                                            {tasks.filter((t: any) => t.status !== 'completed').length > 0 ? (
                                                tasks.filter((t: any) => t.status !== 'completed').map((task: any) => (
                                                    <div key={task.id} className='p-5 bg-card border-2 rounded-2xl flex items-start gap-4 transition-all hover:border-primary/20 shadow-sm'>
                                                        <div className='p-2 bg-muted rounded-xl'>
                                                            <Calendar className='h-5 w-5 text-muted-foreground' />
                                                        </div>
                                                        <div className='flex-1'>
                                                            <p className='font-bold'>{task.title}</p>
                                                            <p className='text-sm text-muted-foreground line-clamp-2 mt-1'>{task.description}</p>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-green-50 hover:text-green-600">
                                                            <CheckCircle className="h-6 w-6" />
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-16 bg-muted/5 rounded-2xl border-2 border-dashed">
                                                    <p className="text-muted-foreground">Todo al día por aquí.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className='space-y-6'>
                                        <h3 className='text-xl font-bold flex items-center gap-2 px-1'>
                                            <Star className='h-5 w-5 text-primary' /> Eventos Críticos
                                        </h3>
                                        <div className='space-y-4'>
                                            {events.length > 0 ? events.map((event: any) => (
                                                <div key={event.id} className='p-4 bg-muted/20 rounded-2xl border border-muted/50 flex items-center gap-4'>
                                                    <div className='text-center px-4 py-2 bg-background rounded-xl border-2 shadow-sm'>
                                                        <p className='text-[10px] font-black text-primary uppercase leading-tight'>{new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}</p>
                                                        <p className='text-xl font-black leading-none'>{new Date(event.date).getDate()}</p>
                                                    </div>
                                                    <div>
                                                        <p className='font-bold'>{event.title}</p>
                                                        <p className='text-xs text-muted-foreground'>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-16">
                                                    <p className='text-sm text-muted-foreground'>Sin eventos programados próximamente.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Global Modals for Tasks (keep outside tabs) */}
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Tarea</DialogTitle>
                        <DialogDescription>Asigna una nueva tarea o compromiso relacionado con este cliente.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Título</Label>
                            <Input
                                placeholder="Ej: Llamar para seguimiento"
                                value={newTaskData.title}
                                onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Descripción</Label>
                            <Textarea
                                placeholder="Detalles..."
                                value={newTaskData.description}
                                onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddTask}>Crear Tarea</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Report Dialog */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl text-white">Cortex 360: Inteligencia Estratégica</DialogTitle>
                                <DialogDescription className="text-white/70 text-sm">Análisis integral de {client.businessName}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 bg-background">
                        <div className="prose prose-slate max-w-none prose-headings:text-primary prose-strong:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
                            {reportContent ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {reportContent}
                                </ReactMarkdown>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-lg font-medium text-muted-foreground animate-pulse">Cortex está analizando el expediente...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-muted/30 border-t flex justify-between items-center">
                        <p className="text-[10px] text-muted-foreground opacity-70 italic max-w-xs">
                            Este informe fue generado por IA basándose en el expediente actual. Verifica siempre las acciones antes de proceder.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => {
                                const blob = new Blob([reportContent], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Informe_360_${client.businessName}.md`;
                                a.click();
                            }} disabled={!reportContent || isGeneratingReport}>
                                <FileText className="w-4 h-4 mr-2" /> Descargar (.md)
                            </Button>
                            <Button onClick={() => setIsReportOpen(false)}>Cerrar</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile Update Confirmation Modal */}
            <ProfileUpdateConfirmation
                open={isConfirmationOpen}
                onOpenChange={setIsConfirmationOpen}
                changes={pendingChanges}
                onConfirm={handleConfirmProfileUpdate}
                onReject={handleRejectProfileUpdate}
            />
        </DashboardLayout>
    )
}
