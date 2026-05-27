
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import {
    User,
    MapPin,
    Mail,
    Building2,
    Target,
    AlertCircle,
    TrendingUp,
    Save,
    Loader2,
    ClipboardList,
    Calendar as CalendarIcon,
    Plus,
    FileText,
    Bot,
    MessageSquareOff
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ContactDetailsPanelProps {
    contactId: string;
    contactName: string;
}

export function ContactDetailsPanel({ contactId, contactName }: ContactDetailsPanelProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [editedFields, setEditedFields] = useState<any>({});

    // Quick Actions States
    const [newTask, setNewTask] = useState({ title: '', dueDate: '', reminderAt: '' });
    const [newEvent, setNewEvent] = useState({ title: '', startTime: '' });
    const [taskLoading, setTaskLoading] = useState(false);

    const handleCreateTask = async () => {
        if (!newTask.title) return;

        if (!newTask.reminderAt) {
            if (!confirm("⚠️ No has configurado un Recordatorio por Telegram para esta tarea. ¿Deseas crearla sin aviso?")) {
                return;
            }
        }

        setTaskLoading(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newTask,
                    contactId: contactId,
                    priority: 'medium'
                })
            });
            if (res.ok) {
                toast({ title: "Tarea creada", description: "Se ha agendado el recordatorio." });
                setNewTask({ title: '', dueDate: '', reminderAt: '' });
            }
        } catch (error) {
            console.error("Task creation error:", error);
        } finally {
            setTaskLoading(false);
        }
    };

    useEffect(() => {
        if (!contactId) return;
        fetchDetails();
    }, [contactId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // First try discovery lead, then contact
            let res = await fetch(`/api/whatsapp/chats/${contactId}/details?type=contact`);
            let data = await res.json();

            if (!data.success) {
                res = await fetch(`/api/whatsapp/chats/${contactId}/details?type=discovery`);
                data = await res.json();
            }

            if (data.success) {
                setDetails(data.data);
                setEditedFields({});
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (Object.keys(editedFields).length === 0) return;
        setSaving(true);
        try {
            const isDiscovery = !details.phone && !!details.telefonoPrincipal;
            const res = await fetch(`/api/whatsapp/chats/${contactId}/details`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: isDiscovery ? 'discovery' : 'contact',
                    ...editedFields
                })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: "Cambios guardados", description: "La ficha se ha actualizado correctamente." });
                setDetails(data.data);
                setEditedFields({});
            }
        } catch (error) {
            console.error("Save error:", error);
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <Loader2 className="animate-spin" />
            <span className="text-xs">Cargando Ficha 360...</span>
        </div>
    );

    if (!details) return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
            Selecciona un contacto para ver su ficha técnica
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-muted/10 border-l">
            <div className="p-4 border-b bg-background flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <User size={16} className="text-blue-500" />
                    Ficha Técnica 360&deg;
                </h3>
                {Object.keys(editedFields).length > 0 && (
                    <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-[10px] gap-1 px-2">
                        {saving ? <Loader2 className="animate-spin h-3 w-3" /> : <Save size={12} />}
                        Guardar
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    <Accordion type="multiple" defaultValue={['basic']} className="space-y-4">
                        <AccordionItem value="basic" className="border rounded-lg bg-background px-3 border-b-0">
                            <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-muted-foreground" />
                                    Información Básica
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-1">
                                <DetailField
                                    label="Empresa"
                                    value={editedFields.businessName ?? (details.businessName || details.nombreComercial)}
                                    onChange={(v: string) => setEditedFields({ ...editedFields, businessName: v })}
                                />
                                <DetailField
                                    label="Representante"
                                    value={editedFields.contactName ?? (details.contactName || details.razonSocialPropietario)}
                                    onChange={(v: string) => setEditedFields({ ...editedFields, contactName: v })}
                                />
                                <DetailField
                                    label="Ciudad"
                                    value={editedFields.city ?? (details.city || details.canton)}
                                    onChange={(v: string) => setEditedFields({ ...editedFields, city: v })}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="strategic" className="border rounded-lg bg-background px-3 border-b-0">
                            <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                                <div className="flex items-center gap-2">
                                    <Target size={14} className="text-muted-foreground" />
                                    Perfil Estratégico
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-1">
                                <DetailField
                                    label="Dolores / Pains"
                                    value={editedFields.pains ?? details.pains}
                                    area
                                    onChange={(v: string) => setEditedFields({ ...editedFields, pains: v })}
                                />
                                <DetailField
                                    label="Metas"
                                    value={editedFields.goals ?? details.goals}
                                    area
                                    onChange={(v: string) => setEditedFields({ ...editedFields, goals: v })}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="swot" className="border rounded-lg bg-background px-3 border-b-0">
                            <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={14} className="text-muted-foreground" />
                                    Análisis FODA
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-1">
                                <DetailField
                                    label="Fortalezas"
                                    value={editedFields.strengths ?? details.strengths}
                                    area
                                    onChange={(v: string) => setEditedFields({ ...editedFields, strengths: v })}
                                />
                                <DetailField
                                    label="Oportunidades"
                                    value={editedFields.opportunities ?? details.opportunities}
                                    area
                                    onChange={(v: string) => setEditedFields({ ...editedFields, opportunities: v })}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot size={16} className={details.botMode === 'active' ? "text-blue-500" : "text-muted-foreground"} />
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider">Donna AI</h4>
                                    <p className="text-[9px] text-muted-foreground">
                                        {details.botMode === 'active' ? 'Automatización Conectada' : 'IA en Pausa (Humano al mando)'}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={details.botMode === 'active'}
                                onCheckedChange={async (checked) => {
                                    const newMode = checked ? 'active' : 'paused';
                                    setDetails({ ...details, botMode: newMode });
                                    try {
                                        const isDiscovery = !details.phone && !!details.telefonoPrincipal;
                                        await fetch(`/api/whatsapp/chats/${contactId}/details`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                type: isDiscovery ? 'discovery' : 'contact',
                                                botMode: newMode
                                            })
                                        });
                                        toast({
                                            title: checked ? "Donna Activada" : "Donna Desactivada",
                                            description: checked ? "La IA responderá automáticamente tras 20s." : "Modo manual activado."
                                        });
                                    } catch (e) {
                                        console.error("Error toggling Donna:", e);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* 🔥 HITO 3 — Pre-llenado: Botón para abrir el formulario de Recorridos con datos ya cargados */}
                    <a
                        href={`/recorridos?leadId=${contactId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                    >
                        <Button
                            variant="outline"
                            className="w-full border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 text-xs h-8 font-bold"
                        >
                            <ClipboardList size={12} className="mr-2" />
                            Completar Perfil en Recorridos
                        </Button>
                    </a>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <h4 className="text-[10px] font-bold text-amber-500 uppercase mb-3 text-center tracking-wider">Estatus Comercial</h4>
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center bg-background/50 p-2 rounded-lg border">
                                <span className="text-xs text-muted-foreground">Deuda Pendiente:</span>
                                <Badge className="bg-amber-500 text-black font-extrabold h-6">
                                    ${details.debts || 0}
                                </Badge>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full border-blue-500/30 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10 text-xs h-8 font-bold"
                            >
                                <FileText size={12} className="mr-2" />
                                Generar Estrategia IA
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-[#c8a84e]/30 bg-[#c8a84e]/5 text-[#c8a84e] hover:bg-[#c8a84e]/10 text-xs h-8 font-bold"
                                onClick={async () => {
                                    try {
                                        toast({ title: "Generando cotización..." });
                                        const res = await fetch('/api/marketing/generate-quotation', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ contactId })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            toast({ title: "Cotización generada", description: `${data.quotation.title} — $${data.quotation.totalAmount}` });
                                            fetchDetails(); // Refresh
                                        } else {
                                            toast({ title: "Error", description: data.error, variant: "destructive" });
                                        }
                                    } catch (e) {
                                        toast({ title: "Error de conexión", variant: "destructive" });
                                    }
                                }}
                            >
                                <FileText size={12} className="mr-2" />
                                Generar Cotización IA
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <ClipboardList size={12} className="text-blue-500" /> Tarea Rápida
                        </h4>
                        <div className="space-y-2">
                            <Input
                                placeholder="¿Qué hay que hacer?"
                                className="h-8 text-xs bg-muted/20 border-muted"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1 flex flex-col gap-1">
                                    <Label className="text-[8px] text-blue-500 uppercase ml-1 font-bold">🔔 ¿Aviso por Telegram?</Label>
                                    <Input
                                        type="datetime-local"
                                        className="h-8 text-[10px] bg-blue-500/5 border-blue-500/30 text-blue-500 focus:border-blue-500"
                                        value={newTask.reminderAt}
                                        onChange={e => setNewTask({ ...newTask, reminderAt: e.target.value })}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    className="h-10 w-10 mt-4 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20"
                                    onClick={handleCreateTask}
                                    disabled={taskLoading || !newTask.title}
                                >
                                    {taskLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

function DetailField({ label, value, onChange, area = false }: any) {
    return (
        <div className="space-y-1">
            <Label className="text-[9px] text-muted-foreground uppercase ml-1 tracking-tight">{label}</Label>
            {area ? (
                <Textarea
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="bg-muted/30 border-muted text-xs min-h-[60px] resize-none focus-visible:ring-blue-500/30"
                />
            ) : (
                <Input
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="bg-muted/30 border-muted text-xs h-8 focus-visible:ring-blue-500/30"
                />
            )}
        </div>
    );
}
