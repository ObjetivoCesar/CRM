'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    Phone,
    User,
    MapPin,
    ArrowRight,
    Loader2,
    FileSearch,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Filter,
    X,
    ClipboardList,
    ListChecks,
    Sparkles
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, Columns } from "lucide-react";

interface MultiSelectFilterProps {
    title: string;
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
    icon?: React.ReactNode;
}

function MultiSelectFilter({ title, options, selected, onChange, icon }: MultiSelectFilterProps) {
    return (
        <div className="space-y-2">
            <Label>{title} ({options.length})</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-10 border-input bg-background font-normal"
                    >
                        {icon && <span className="mr-2">{icon}</span>}
                        <span className="truncate">
                            {selected.length === 0
                                ? "Todos"
                                : selected.length === 1
                                    ? selected[0]
                                    : `${selected.length} seleccionados`}
                        </span>
                        {selected.length > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-auto font-normal lg:hidden"
                            >
                                {selected.length}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={`Buscar ${title.toLowerCase()}...`} />
                        <CommandList>
                            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                            <CommandGroup>
                                <CommandItem
                                    className="cursor-pointer"
                                    onSelect={() => {
                                        if (selected.length === options.length) {
                                            onChange([]);
                                        } else {
                                            onChange([...options]);
                                        }
                                    }}
                                >
                                    <div
                                        className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selected.length === options.length
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}
                                    >
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <span>(Seleccionar todo)</span>
                                </CommandItem>
                                <CommandSeparator />
                                {options.map((option) => {
                                    const isSelected = selected.includes(option);
                                    return (
                                        <CommandItem
                                            key={option}
                                            className="cursor-pointer"
                                            onSelect={() => {
                                                if (isSelected) {
                                                    onChange(selected.filter((item) => item !== option));
                                                } else {
                                                    onChange([...selected, option]);
                                                }
                                            }}
                                        >
                                            <div
                                                className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}
                                            >
                                                <Check className={cn("h-4 w-4")} />
                                            </div>
                                            <span>{option}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                        {selected.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => onChange([])}
                                        className="justify-center text-center cursor-pointer"
                                    >
                                        Limpiar filtros
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

interface DiscoveryLead {
    id: string;
    ruc: string | null;
    businessName: string;
    businessType: string | null;
    category: string | null;
    province: string | null;
    city: string | null;
    representative: string | null;
    phone1: string | null;
    phone2: string | null;
    email: string | null;
    address: string | null;
    researchData: string | null;
    status: 'pending' | 'investigated' | 'no_answer' | 'not_interested' | 'sent_info' | 'converted' | 'discarded';
    columna1: 'no_contactado' | 'no_contesto' | 'contesto_interesado' | 'contesto_no_interesado' | 'buzon_voz' | 'numero_invalido';
    columna2: 'pendiente' | 'en_cola' | 'convertir_a_lead' | 'descartar' | 'seguimiento_7_dias' | 'seguimiento_30_dias';
    clasificacion: string | null;
    createdAt: string;
}

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function DiscoveryPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<DiscoveryLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isResearching, setIsResearching] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 50, totalPages: 0 });
    const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);

    // ─── Bulk Selection State ───
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allVisibleSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id));
    const toggleSelectAllVisible = () => {
        setSelectedIds(prev => {
            if (leads.every(l => prev.has(l.id))) {
                // Deselect all visible
                const next = new Set(prev);
                leads.forEach(l => next.delete(l.id));
                return next;
            } else {
                // Select all visible
                const next = new Set(prev);
                leads.forEach(l => next.add(l.id));
                return next;
            }
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    // Dynamic Facets Options
    const [facetOptions, setFacetOptions] = useState({
        provinces: [] as string[],
        cantons: [] as string[],
        activities: [] as string[],
        categories: [] as string[],
        clasificaciones: [] as string[],
        columna1: [] as string[],
        columna2: [] as string[],
        status: [] as string[]
    });

    // Filters
    const [filters, setFilters] = useState({
        provincia: [] as string[],
        canton: [] as string[],
        actividad_modalidad: [] as string[],
        categoria: [] as string[],
        clasificacion: [] as string[],
        columna1: [] as string[],
        columna2: [] as string[],
        search: '',
        status: [] as string[]
    });

    const [newLead, setNewLead] = useState({
        businessName: '',
        businessType: '',
        representative: '',
        city: '',
        phone1: '',
        ruc: ''
    });

    // Initial load and filter changes: Fetch Leads & Facets
    useEffect(() => {
        fetchLeads();
        fetchFacets();
    }, [filters, pagination?.page, pagination?.limit]);

    async function fetchFacets() {
        try {
            const params = new URLSearchParams();
            if (filters.provincia && filters.provincia.length > 0) params.append('provincia', filters.provincia.join('|'));
            if (filters.canton && filters.canton.length > 0) params.append('canton', filters.canton.join('|'));
            if (filters.actividad_modalidad && filters.actividad_modalidad.length > 0) params.append('actividad_modalidad', filters.actividad_modalidad.join('|'));
            if (filters.categoria && filters.categoria.length > 0) params.append('categoria', filters.categoria.join('|'));
            if (filters.clasificacion && filters.clasificacion.length > 0) params.append('clasificacion', filters.clasificacion.join('|'));
            if (filters.status && filters.status.length > 0) params.append('status', filters.status.join('|'));
            if (filters.columna1 && filters.columna1.length > 0) params.append('columna1', filters.columna1.join('|'));
            if (filters.columna2 && filters.columna2.length > 0) params.append('columna2', filters.columna2.join('|'));

            const res = await fetch(`/api/discovery/facets?${params.toString()}`);
            const data = await res.json();

            if (res.ok) {
                setFacetOptions({
                    provinces: data.provinces || [],
                    cantons: data.cantons || [],
                    activities: data.activities || [],
                    categories: data.categories || [],
                    clasificaciones: data.clasificaciones || [],
                    columna1: data.columna1 || [],
                    columna2: data.columna2 || [],
                    status: data.status || []
                });
            }
        } catch (error) {
            console.error("Error loading facets", error);
        }
    }

    async function fetchLeads() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.provincia && filters.provincia.length > 0) params.append('provincia', filters.provincia.join('|'));
            if (filters.canton && filters.canton.length > 0) params.append('canton', filters.canton.join('|'));
            if (filters.actividad_modalidad && filters.actividad_modalidad.length > 0) params.append('actividad_modalidad', filters.actividad_modalidad.join('|'));
            if (filters.categoria && filters.categoria.length > 0) params.append('categoria', filters.categoria.join('|'));
            if (filters.clasificacion && filters.clasificacion.length > 0) params.append('clasificacion', filters.clasificacion.join('|'));
            if (filters.status && filters.status.length > 0) params.append('status', filters.status.join('|'));
            if (filters.columna1 && filters.columna1.length > 0) params.append('columna1', filters.columna1.join('|'));
            if (filters.columna2 && filters.columna2.length > 0) params.append('columna2', filters.columna2.join('|'));
            if (filters.search) params.append('search', filters.search);
            params.append('page', (pagination?.page || 1).toString());
            params.append('limit', (pagination?.limit || 50).toString());

            const res = await fetch(`/api/discovery?${params.toString()}`);
            const data = await res.json();

            if (res.ok) {
                setLeads(data.leads || []);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
            } else {
                console.error("Server error fetching leads:", data);
                toast.error(data.error || "Error al cargar prospectos");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Error de conexión al cargar prospectos");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddLead(e: React.FormEvent) {
        e.preventDefault();
        setIsAdding(true);
        try {
            const res = await fetch('/api/discovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLead),
            });
            if (!res.ok) throw new Error();
            toast.success("Prospecto añadido correctamente");
            setNewLead({ businessName: '', businessType: '', representative: '', city: '', phone1: '', ruc: '' });
            fetchLeads();
        } catch (error) {
            toast.error("Error al añadir prospecto");
        } finally {
            setIsAdding(false);
        }
    }

    async function handleResearch(leadId: string) {
        setIsResearching(leadId);
        try {
            const res = await fetch(`/api/discovery/${leadId}/research`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                toast.success("Investigación completada");
                fetchLeads();
                if (selectedLead && selectedLead.id === leadId) {
                    setSelectedLead({ ...selectedLead, researchData: data.report, status: 'investigated' });
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast.error("Error en la investigación: " + (error as Error).message);
        } finally {
            setIsResearching(null);
        }
    }

    async function handleCallResult(leadId: string, value: string) {
        try {
            const res = await fetch(`/api/discovery/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columna1: value }),
            });
            const data = await res.json();
            if (data.success) {
                // Optimistic update in local state
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, columna1: value as any } : l));
                toast.success('Resultado guardado');
            } else {
                throw new Error(data.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Error: ' + (error as Error).message);
        }
    }

    // Toggle queue status (📋 button - THE MOST IMPORTANT)
    async function toggleQueue(leadId: string, currentStatus: string) {
        try {
            const newStatus = currentStatus === 'en_cola' ? 'pendiente' : 'en_cola';

            const res = await fetch(`/api/discovery/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columna2: newStatus }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(newStatus === 'en_cola' ? '📋 Añadido a Mi Cola' : 'Removido de la cola');
                // ✅ OPTIMISTIC UPDATE — no más recarga de página
                setLeads(prev => prev.map(l =>
                    l.id === leadId ? { ...l, columna2: newStatus as DiscoveryLead['columna2'] } : l
                ));
            } else {
                throw new Error(data.error || 'Error al actualizar');
            }
        } catch (error) {
            toast.error("Error al actualizar cola: " + (error as Error).message);
        }
    }

    // ─── BULK: Añadir varios a la cola en paralelo ───
    async function bulkAddToQueue() {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        let ok = 0;
        let fail = 0;

        // PATCH en paralelo (no secuencial)
        await Promise.allSettled(ids.map(async (id) => {
            const res = await fetch(`/api/discovery/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columna2: 'en_cola' }),
            });
            if (res.ok) ok++;
            else fail++;
        }));

        // Optimistic update masivo
        setLeads(prev => prev.map(l =>
            selectedIds.has(l.id) ? { ...l, columna2: 'en_cola' } : l
        ));

        toast.success(`📋 ${ok} añadidos a Mi Cola${fail ? `, ${fail} fallaron` : ''}`);
        setBulkLoading(false);
    }

    // ─── BULK: Añadir a la cola Y saltar al Trainer ───
    async function bulkSendToTrainer() {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        const ids = Array.from(selectedIds);

        // Asegurar que todos estén en_cola antes de saltar
        await Promise.allSettled(ids.map(async (id) => {
            return fetch(`/api/discovery/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columna2: 'en_cola' }),
            });
        }));

        // Optimistic update masivo
        setLeads(prev => prev.map(l =>
            selectedIds.has(l.id) ? { ...l, columna2: 'en_cola' } : l
        ));

        toast.success(`🎯 ${ids.length} prospectos listos en el Trainer`);
        clearSelection();
        setBulkLoading(false);

        // Persistir selección para que Trainer la recoja (opcional, ver integración)
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('trainer_focus_ids', JSON.stringify(ids));
        }

        router.push('/trainer');
    }

    const clearFilters = () => {
        setFilters({
            provincia: [],
            canton: [],
            actividad_modalidad: [],
            categoria: [],
            clasificacion: [],
            columna1: [],
            columna2: [],
            search: '',
            status: []
        });
        setPagination({ ...pagination, page: 1 });
    };

    const getStatusBadge = (status: DiscoveryLead['status']) => {
        const config = {
            pending: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
            investigated: { label: 'Investigado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
            no_answer: { label: 'Sin Respuesta', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
            not_interested: { label: 'No Interesado', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
            sent_info: { label: 'Info Enviada', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
            converted: { label: 'Convertido', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
            discarded: { label: 'Descartado', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
        };
        const { label, color } = config[status] || config.pending;
        return <Badge className={`${color} border`}>{label}</Badge>;
    };

    const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== '';
    }).length;

    const statusOptions = ["Pendiente", "Investigado", "No contestó", "Contestó / Interesado", "Contestó / No interesa hoy", "Convertido", "Descartado"];
    const selectedStatusLabels = [
        ...(filters.status.includes('pending') ? ["Pendiente"] : []),
        ...(filters.status.includes('investigated') ? ["Investigado"] : []),
        ...(filters.status.includes('converted') ? ["Convertido"] : []),
        ...(filters.status.includes('discarded') ? ["Descartado"] : []),
        ...(filters.columna1.includes('no_contesto') ? ["No contestó"] : []),
        ...(filters.columna1.includes('contesto_interesado') ? ["Contestó / Interesado"] : []),
        ...(filters.columna1.includes('contesto_no_interesado') ? ["Contestó / No interesa hoy"] : []),
    ];

    return (
        <DashboardLayout>
            <div className="relative isolate">
                {/* Discovery Content */}

                <div className="p-4 sm:p-6 md:p-12 lg:p-16 w-full max-w-[95%] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-2">
                        <div className="space-y-1 w-full md:w-auto">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                                Discovery <span className="text-primary">&</span> Research
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground/60 font-medium tracking-wide uppercase">
                                Investigación táctica y gestión de prospección en frío.
                            </p>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="h-11 md:h-12 px-5 md:px-6 w-full md:w-auto font-black border-0 transition-all active:scale-95 group">
                                    <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" /> Nuevo Prospecto
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form onSubmit={handleAddLead}>
                                    <DialogHeader>
                                        <DialogTitle>Añadir Prospecto de Discovery</DialogTitle>
                                        <DialogDescription>
                                            Ingresa los datos básicos para iniciar la investigación con Gemini.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label htmlFor="name" className="sm:text-right">Negocio</Label>
                                            <Input id="name" value={newLead.businessName} onChange={e => setNewLead({ ...newLead, businessName: e.target.value })} className="sm:col-span-3" required />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label htmlFor="type" className="sm:text-right">Tipo</Label>
                                            <Input id="type" placeholder="Ej: Hotel, Restaurante" value={newLead.businessType} onChange={e => setNewLead({ ...newLead, businessType: e.target.value })} className="sm:col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label htmlFor="rep" className="sm:text-right">Representante</Label>
                                            <Input id="rep" value={newLead.representative} onChange={e => setNewLead({ ...newLead, representative: e.target.value })} className="sm:col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label htmlFor="city" className="sm:text-right">Ciudad</Label>
                                            <Input id="city" value={newLead.city} onChange={e => setNewLead({ ...newLead, city: e.target.value })} className="sm:col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label htmlFor="phone" className="sm:text-right">Teléfono</Label>
                                            <Input id="phone" value={newLead.phone1} onChange={e => setNewLead({ ...newLead, phone1: e.target.value })} className="sm:col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isAdding}>
                                            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Guardar y Cerrar
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Filters Section */}
                    <Card className="border-slate-700/60 bg-slate-950/55 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl border text-slate-100">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Filtros Dinámicos</CardTitle>
                                {activeFiltersCount > 0 && (
                                    <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={filters.columna1.includes('no_contactado') ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        if (filters.columna1.includes('no_contactado')) {
                                            // Clear the filter
                                            setFilters({ ...filters, columna1: [], columna2: [] });
                                        } else {
                                            // Set filter for "no_contactado" AND exclude "descartar" and "convertir_a_lead"
                                            setFilters({
                                                ...filters,
                                                columna1: ['no_contactado'],
                                                columna2: [] // Reset columna2 to show all except what we exclude in API
                                            });
                                        }
                                    }}
                                    className={cn(
                                        "h-8 text-[11px] font-bold uppercase",
                                        filters.columna1.includes('no_contactado') ? "bg-blue-600 hover:bg-blue-500" : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                    )}
                                >
                                    🎯 Pendientes de Contacto
                                </Button>
                                {activeFiltersCount > 0 && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        <X className="h-4 w-4 mr-2" /> Limpiar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4">
                                <div className="space-y-2">
                                    <Label>Búsqueda</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Nombre del negocio..."
                                            value={filters.search}
                                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <MultiSelectFilter
                                    title="Estado"
                                    options={statusOptions}
                                    selected={selectedStatusLabels}
                                    onChange={(vals) => {
                                        const newStatus: string[] = [];
                                        const newCol1: string[] = [];
                                        vals.forEach(val => {
                                            if (val === "Pendiente") newStatus.push("pending");
                                            if (val === "Investigado") newStatus.push("investigated");
                                            if (val === "Convertido") newStatus.push("converted");
                                            if (val === "Descartado") newStatus.push("discarded");
                                            if (val === "No contestó") newCol1.push("no_contesto");
                                            if (val === "Contestó / Interesado") newCol1.push("contesto_interesado");
                                            if (val === "Contestó / No interesa hoy") newCol1.push("contesto_no_interesado");
                                        });
                                        setFilters({ ...filters, status: newStatus, columna1: newCol1 });
                                    }}
                                />
                                <MultiSelectFilter
                                    title="Provincia"
                                    options={facetOptions.provinces}
                                    selected={filters.provincia}
                                    onChange={(vals) => setFilters({ ...filters, provincia: vals })}
                                />
                                <MultiSelectFilter
                                    title="Cantón"
                                    options={facetOptions.cantons}
                                    selected={filters.canton}
                                    onChange={(vals) => setFilters({ ...filters, canton: vals })}
                                />
                                <MultiSelectFilter
                                    title="Actividad"
                                    options={facetOptions.activities}
                                    selected={filters.actividad_modalidad}
                                    onChange={(vals) => setFilters({ ...filters, actividad_modalidad: vals })}
                                />
                                <MultiSelectFilter
                                    title="Categoría"
                                    options={facetOptions.categories}
                                    selected={filters.categoria}
                                    onChange={(vals) => setFilters({ ...filters, categoria: vals })}
                                />
                                <MultiSelectFilter
                                    title="Clasificación"
                                    options={facetOptions.clasificaciones}
                                    selected={filters.clasificacion}
                                    onChange={(vals) => setFilters({ ...filters, clasificacion: vals })}
                                />
                                <MultiSelectFilter
                                    title="Estado de Acción"
                                    options={['Pendiente', 'En Cola', 'Convertir a Lead', 'Descartar', 'Seguimiento 7d', 'Seguimiento 30d']}
                                    selected={(() => {
                                        const labels: string[] = [];
                                        if (filters.columna2.includes('pendiente')) labels.push('Pendiente');
                                        if (filters.columna2.includes('en_cola')) labels.push('En Cola');
                                        if (filters.columna2.includes('convertir_a_lead')) labels.push('Convertir a Lead');
                                        if (filters.columna2.includes('descartar')) labels.push('Descartar');
                                        if (filters.columna2.includes('seguimiento_7_dias')) labels.push('Seguimiento 7d');
                                        if (filters.columna2.includes('seguimiento_30_dias')) labels.push('Seguimiento 30d');
                                        return labels;
                                    })()}
                                    onChange={(vals) => {
                                        const newCol2: string[] = [];
                                        vals.forEach(val => {
                                            if (val === 'Pendiente') newCol2.push('pendiente');
                                            if (val === 'En Cola') newCol2.push('en_cola');
                                            if (val === 'Convertir a Lead') newCol2.push('convertir_a_lead');
                                            if (val === 'Descartar') newCol2.push('descartar');
                                            if (val === 'Seguimiento 7d') newCol2.push('seguimiento_7_dias');
                                            if (val === 'Seguimiento 30d') newCol2.push('seguimiento_30_dias');
                                        });
                                        setFilters({ ...filters, columna2: newCol2 });
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results Summary + Bulk Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {leads.length > 0 && (
                                <Checkbox
                                    checked={allVisibleSelected}
                                    onCheckedChange={toggleSelectAllVisible}
                                    aria-label="Seleccionar todos los visibles"
                                    className="h-5 w-5 rounded border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                            )}
                            <p>
                                Mostrando <span className="font-semibold text-foreground">{((pagination.page - 1) * pagination.limit) + 1}</span> - <span className="font-semibold text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de <span className="font-semibold text-foreground">{pagination.total.toLocaleString()}</span> resultados
                                {selectedIds.size > 0 && (
                                    <span className="ml-3 text-blue-400 font-bold">
                                        · {selectedIds.size} seleccionados
                                    </span>
                                )}
                            </p>
                        </div>
                        <Select value={pagination.limit.toString()} onValueChange={(value) => setPagination({ ...pagination, limit: parseInt(value), page: 1 })}>
                            <SelectTrigger className="w-full sm:w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25 por página</SelectItem>
                                <SelectItem value="50">50 por página</SelectItem>
                                <SelectItem value="100">100 por página</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ─── FLOATING BULK ACTION TOOLBAR ─── */}
                    {selectedIds.size > 0 && (
                        <div className="sticky top-2 sm:top-4 z-30 mx-auto max-w-3xl px-2 sm:px-0">
                            <div className="rounded-2xl border border-blue-500/40 bg-blue-950/90 backdrop-blur-xl shadow-2xl shadow-blue-500/20 p-3 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center gap-2 text-blue-200 min-w-0">
                                    <ListChecks className="h-5 w-5 shrink-0" />
                                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider truncate">
                                        {selectedIds.size} {selectedIds.size === 1 ? 'prospecto' : 'prospectos'}
                                    </span>
                                </div>

                                <div className="flex-1" />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSelection}
                                    className="text-blue-200/70 hover:text-white hover:bg-white/5 px-2 sm:px-3"
                                    disabled={bulkLoading}
                                >
                                    <X className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Cancelar</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={bulkAddToQueue}
                                    disabled={bulkLoading}
                                    className="border-orange-500/40 text-orange-300 hover:bg-orange-500/10 font-bold px-2 sm:px-3"
                                >
                                    {bulkLoading ? (
                                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                                    ) : (
                                        <ClipboardList className="h-4 w-4 sm:mr-2" />
                                    )}
                                    <span className="hidden sm:inline">Añadir a Mi Cola</span>
                                    <span className="sm:hidden">Cola</span>
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={bulkSendToTrainer}
                                    disabled={bulkLoading}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-blue-500/30 px-2 sm:px-3"
                                >
                                    {bulkLoading ? (
                                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 sm:mr-2" />
                                    )}
                                    <span className="hidden sm:inline">Llevar al Trainer</span>
                                    <span className="sm:hidden">Trainer</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-muted-foreground animate-pulse">Cargando base de datos de discovery...</p>
                            </div>
                        ) : leads.length === 0 ? (
                            <Card className="border-dashed py-20">
                                <CardContent className="flex flex-col items-center justify-center space-y-4">
                                    <FileSearch className="h-12 w-12 text-muted-foreground/50" />
                                    <div className="text-center">
                                        <h3 className="font-semibold text-lg">No hay prospectos que coincidan</h3>
                                        <p className="text-muted-foreground">Intenta ajustar los filtros o limpiarlos.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                {leads.map((lead) => {
                                    const isSelected = selectedIds.has(lead.id);
                                    return (
                                    <Card key={lead.id} className={cn(
                                        "group flex flex-col h-full overflow-hidden border-slate-700/60 hover:border-blue-400/50 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/20 bg-slate-950/55 backdrop-blur-xl rounded-2xl border text-slate-100",
                                        isSelected && "border-blue-400/80 ring-2 ring-blue-400/40 bg-blue-500/15"
                                    )}>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelected(lead.id)}
                                                    aria-label={`Seleccionar ${lead.businessName}`}
                                                    className="mt-1 h-5 w-5 shrink-0 rounded border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-blue-300 transition-colors line-clamp-1">{lead.businessName}</CardTitle>
                                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 line-clamp-2 sm:line-clamp-1">{lead.businessType || 'Giro no especificado'}</CardDescription>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    {getStatusBadge(lead.status)}
                                                    {lead.columna2 === 'en_cola' && (
                                                        <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/40 whitespace-nowrap">📋 EN COLA</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2 text-sm text-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-cyan-300" /> {lead.representative || 'Desconocido'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-cyan-300" /> {lead.city || 'Ubicación pendiente'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-cyan-300" /> {lead.phone1 || 'Sin teléfono'}
                                                </div>
                                                {lead.clasificacion && (
                                                    <div className="flex items-center gap-2">
                                                        <Columns className="h-4 w-4 text-cyan-300" /> {lead.clasificacion}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Call Result Selector */}
                                            <div className="pt-3 border-t border-slate-700/60">
                                                <Select
                                                    value={lead.columna1 || 'no_contactado'}
                                                    onValueChange={(val) => handleCallResult(lead.id, val)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-9 w-full text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all",
                                                        lead.columna1 === 'contesto_interesado' && "bg-green-500/15 text-green-300 border-green-400/40",
                                                        lead.columna1 === 'contesto_no_interesado' && "bg-red-500/15 text-red-300 border-red-400/40",
                                                        lead.columna1 === 'no_contesto' && "bg-slate-500/20 text-slate-200 border-slate-400/40",
                                                        lead.columna1 === 'buzon_voz' && "bg-yellow-500/15 text-yellow-300 border-yellow-400/40",
                                                        lead.columna1 === 'numero_invalido' && "bg-red-900/20 text-red-300 border-red-700/40",
                                                        (!lead.columna1 || lead.columna1 === 'no_contactado') && "bg-slate-900/60 text-slate-300 border-slate-600/50",
                                                    )}>
                                                        <SelectValue placeholder="📞 Resultado de llamada" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="no_contactado">📞 Sin contactar</SelectItem>
                                                        <SelectItem value="no_contesto">🔇 No contestó</SelectItem>
                                                        <SelectItem value="buzon_voz">📩 Buzón de voz</SelectItem>
                                                        <SelectItem value="numero_invalido">❌ Número inválido</SelectItem>
                                                        <SelectItem value="contesto_interesado">✅ Contestó — Interesado</SelectItem>
                                                        <SelectItem value="contesto_no_interesado">🚫 Contestó — No interesa hoy</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="pt-2 mt-auto flex gap-2">
                                                <Button
                                                    variant={lead.researchData ? "secondary" : "default"}
                                                    className={cn(
                                                        "flex-1 h-10 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all",
                                                        !lead.researchData && "bg-blue-600 hover:bg-blue-500 text-white border-0"
                                                    )}
                                                    onClick={() => handleResearch(lead.id)}
                                                    disabled={isResearching === lead.id}
                                                >
                                                    {isResearching === lead.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Search className="h-4 w-4 mr-2" />
                                                    )}
                                                    {lead.researchData ? "Re-investigar" : "Investigar IA"}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-10 w-10 border border-slate-700/60 transition-all rounded-xl text-slate-300",
                                                        lead.columna2 === 'en_cola' ? "bg-orange-500/20 text-orange-300 border-orange-400/40" : "hover:bg-white/10 hover:text-white"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleQueue(lead.id, lead.columna2);
                                                    }}
                                                    title={lead.columna2 === 'en_cola' ? "Quitar de la cola" : "Añadir a la cola de hoy"}
                                                    aria-label={lead.columna2 === 'en_cola' ? "Quitar de la cola" : "Añadir a la cola de hoy"}
                                                >
                                                    <ClipboardList className="h-4 w-4" />
                                                </Button>

                                            </div>
                                        </CardContent>
                                    </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-2 sm:px-3"
                            >
                                <span className="sm:hidden">←</span>
                                <span className="hidden sm:inline">Anterior</span>
                            </Button>
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pagination.page === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPagination({ ...pagination, page: pageNum })}
                                            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                {pagination.totalPages > 5 && <span className="px-2 text-muted-foreground">…</span>}
                                {pagination.totalPages > 5 && (
                                    <Button
                                        variant={pagination.page === pagination.totalPages ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setPagination({ ...pagination, page: pagination.totalPages })}
                                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                                    >
                                        {pagination.totalPages}
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-2 sm:px-3"
                            >
                                <span className="hidden sm:inline">Siguiente</span>
                                <span className="sm:hidden">→</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
