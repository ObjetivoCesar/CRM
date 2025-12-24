'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Calendar, CheckCircle2, Circle, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Task {
    id: string
    title: string
    description?: string
    status: 'todo' | 'in_progress' | 'done' | 'cancelled'
    priority: 'low' | 'medium' | 'high'
    dueDate?: string
    assignedTo?: string
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        status: 'todo'
    })

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/tasks')
            if (!response.ok) throw new Error('Failed to fetch tasks')
            const data = await response.json()
            setTasks(data || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al cargar tareas')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTask = async () => {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            })

            if (!response.ok) throw new Error('Failed to create task')

            toast.success('Tarea creada exitosamente')
            setIsAddOpen(false)
            setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                dueDate: '',
                status: 'todo'
            })
            fetchTasks()
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al crear tarea')
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500'
            case 'medium': return 'bg-yellow-500'
            case 'low': return 'bg-blue-500'
            default: return 'bg-gray-500'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />
            default: return <Circle className="h-5 w-5 text-gray-400" />
        }
    }

    const filteredTasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <DashboardLayout>
                <div className='flex items-center justify-center h-64'>
                    <div className='text-lg text-muted-foreground'>Cargando tareas...</div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h2 className='text-3xl font-bold text-foreground'>Tareas</h2>
                        <p className='text-muted-foreground'>Gestión de pendientes y actividades</p>
                    </div>
                    <div className='flex gap-4 items-center'>
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" /> Nueva Tarea
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Crear Nueva Tarea</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="title" className="text-right">Título</Label>
                                        <Input
                                            id="title"
                                            value={newTask.title}
                                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="desc" className="text-right">Descripción</Label>
                                        <Input
                                            id="desc"
                                            value={newTask.description}
                                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="priority" className="text-right">Prioridad</Label>
                                        <Select
                                            value={newTask.priority}
                                            onValueChange={(val) => setNewTask({ ...newTask, priority: val })}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Selecciona prioridad" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Baja</SelectItem>
                                                <SelectItem value="medium">Media</SelectItem>
                                                <SelectItem value="high">Alta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="date" className="text-right">Fecha Límite</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={newTask.dueDate}
                                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCreateTask}>Guardar Tarea</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className='flex gap-4'>
                    <div className='relative flex-1'>
                        <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                        <Input
                            placeholder='Buscar tareas...'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='pl-10'
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredTasks.map((task) => (
                        <Card key={task.id} className="glass-card hover:bg-accent/5 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {getStatusIcon(task.status)}
                                    <div>
                                        <h4 className="font-semibold text-lg">{task.title}</h4>
                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {task.dueDate && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {format(new Date(task.dueDate), 'PPP', { locale: es })}
                                        </div>
                                    )}
                                    <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    )
}
