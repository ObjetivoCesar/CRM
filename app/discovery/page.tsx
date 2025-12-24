'use client';

import { useState, useEffect } from 'react';
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
    ClipboardList
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
    status: 'pending' | 'investigated' | 'no_answer' | 'not_interested' | 'sent_info' | 'converted';
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
    const [leads, setLeads] = useState<DiscoveryLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isResearching, setIsResearching] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 50, totalPages: 0 });
    const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);
    const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);

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
        web: '',
        email: '',
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
            if (filters.provincia && filters.provincia.length > 0) params.append('provincia', filters.provincia.join(','));
            if (filters.canton && filters.canton.length > 0) params.append('canton', filters.canton.join(','));
            if (filters.actividad_modalidad && filters.actividad_modalidad.length > 0) params.append('actividad_modalidad', filters.actividad_modalidad.join(','));
            if (filters.categoria && filters.categoria.length > 0) params.append('categoria', filters.categoria.join(','));
            if (filters.clasificacion && filters.clasificacion.length > 0) params.append('clasificacion', filters.clasificacion.join(','));
            if (filters.status && filters.status.length > 0) params.append('status', filters.status.join(','));
            if (filters.columna1 && filters.columna1.length > 0) params.append('columna1', filters.columna1.join(','));
            if (filters.columna2 && filters.columna2.length > 0) params.append('columna2', filters.columna2.join(','));

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
            if (filters.provincia && filters.provincia.length > 0) params.append('provincia', filters.provincia.join(','));
            if (filters.canton && filters.canton.length > 0) params.append('canton', filters.canton.join(','));
            if (filters.actividad_modalidad && filters.actividad_modalidad.length > 0) params.append('actividad_modalidad', filters.actividad_modalidad.join(','));
            if (filters.categoria && filters.categoria.length > 0) params.append('categoria', filters.categoria.join(','));
            if (filters.clasificacion && filters.clasificacion.length > 0) params.append('clasificacion', filters.clasificacion.join(','));
            if (filters.status && filters.status.length > 0) params.append('status', filters.status.join(','));
            if (filters.columna1 && filters.columna1.length > 0) params.append('columna1', filters.columna1.join(','));
            if (filters.columna2 && filters.columna2.length > 0) params.append('columna2', filters.columna2.join(','));
            if (filters.web) params.append('web', filters.web);
            if (filters.email) params.append('email', filters.email);
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
                fetchLeads();
            } else {
                throw new Error(data.error || 'Error al actualizar');
            }
        } catch (error) {
            toast.error("Error al actualizar cola: " + (error as Error).message);
        }
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
            web: '',
            email: '',
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
        };
        const { label, color } = config[status] || config.pending;
        return <Badge className={`${color} border`}>{label}</Badge>;
    };

    const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== '' && value !== 'all';
    }).length;

    return (
        <DashboardLayout>
            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Discovery & Research</h1>
                        <p className="text-muted-foreground mt-2">Investigación pre-llamada y gestión de prospección en frío.</p>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Prospecto
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
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Negocio</Label>
                                        <Input id="name" value={newLead.businessName} onChange={e => setNewLead({ ...newLead, businessName: e.target.value })} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="type" className="text-right">Tipo</Label>
                                        <Input id="type" placeholder="Ej: Hotel, Restaurante" value={newLead.businessType} onChange={e => setNewLead({ ...newLead, businessType: e.target.value })} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="rep" className="text-right">Representante</Label>
                                        <Input id="rep" value={newLead.representative} onChange={e => setNewLead({ ...newLead, representative: e.target.value })} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="city" className="text-right">Ciudad</Label>
                                        <Input id="city" value={newLead.city} onChange={e => setNewLead({ ...newLead, city: e.target.value })} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="phone" className="text-right">Teléfono</Label>
                                        <Input id="phone" value={newLead.phone1} onChange={e => setNewLead({ ...newLead, phone1: e.target.value })} className="col-span-3" />
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
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Filtros Dinámicos</CardTitle>
                                {activeFiltersCount > 0 && (
                                    <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</Badge>
                                )}
                            </div>
                            {activeFiltersCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    <X className="h-4 w-4 mr-2" /> Limpiar
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
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
                        <div className="space-y-2">
                            <Label>Web</Label>
                            <Input
                                placeholder="URL web..."
                                value={filters.web}
                                onChange={(e) => setFilters({ ...filters, web: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                placeholder="Correo..."
                                value={filters.email}
                                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                            />
                        </div>
                        <MultiSelectFilter
                            title="Estado"
                            options={facetOptions.status || ['pending', 'investigated', 'no_answer', 'not_interested', 'sent_info', 'converted']}
                            selected={filters.status}
                            onChange={(vals) => setFilters({ ...filters, status: vals })}
                        />
                        <MultiSelectFilter
                            title="Etiqueta Contacto"
                            options={facetOptions.columna1}
                            selected={filters.columna1}
                            onChange={(vals) => setFilters({ ...filters, columna1: vals })}
                        />
                        <MultiSelectFilter
                            title="Acción Seguimiento"
                            options={facetOptions.columna2}
                            selected={filters.columna2}
                            onChange={(vals) => setFilters({ ...filters, columna2: vals })}
                        />
                    </CardContent>
                </Card>

                {/* Results Summary */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>
                        Mostrando <span className="font-semibold text-foreground">{((pagination.page - 1) * pagination.limit) + 1}</span> - <span className="font-semibold text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de <span className="font-semibold text-foreground">{pagination.total.toLocaleString()}</span> resultados
                    </p>
                    <Select value={pagination.limit.toString()} onValueChange={(value) => setPagination({ ...pagination, limit: parseInt(value), page: 1 })}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25 por página</SelectItem>
                            <SelectItem value="50">50 por página</SelectItem>
                            <SelectItem value="100">100 por página</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {leads.map((lead) => (
                                <Card key={lead.id} className="group overflow-hidden border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur-sm">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{lead.businessName}</CardTitle>
                                                <CardDescription>{lead.businessType || 'Giro no especificado'}</CardDescription>
                                            </div>
                                            {getStatusBadge(lead.status)}
                                            {lead.columna2 === 'en_cola' && (
                                                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">📋 EN COLA</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-primary/70" /> {lead.representative || 'Desconocido'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-primary/70" /> {lead.city || 'Ubicación pendiente'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-primary/70" /> {lead.phone1 || 'Sin teléfono'}
                                            </div>
                                            {lead.clasificacion && (
                                                <div className="flex items-center gap-2">
                                                    <Columns className="h-4 w-4 text-primary/70" /> {lead.clasificacion}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 flex gap-2">
                                            <Button
                                                variant={lead.researchData ? "secondary" : "default"}
                                                className="flex-1 text-xs"
                                                onClick={() => handleResearch(lead.id)}
                                                disabled={isResearching === lead.id}
                                            >
                                                {isResearching === lead.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                ) : (
                                                    <Search className="h-3 w-3 mr-2" />
                                                )}
                                                {lead.researchData ? "Re-investigar" : "Investigar IA"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "border border-primary/10 transition-all",
                                                    lead.columna2 === 'en_cola' ? "bg-orange-500/20 text-orange-500 border-orange-500/30" : "hover:bg-primary/5"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleQueue(lead.id, lead.columna2);
                                                }}
                                                title={lead.columna2 === 'en_cola' ? "Quitar de la cola" : "Añadir a la cola de hoy"}
                                            >
                                                <ClipboardList className="h-4 w-4" />
                                            </Button>

                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            disabled={pagination.page === 1}
                        >
                            Anterior
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={pagination.page === pageNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setPagination({ ...pagination, page: pageNum })}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                            {pagination.totalPages > 5 && <span className="px-2">...</span>}
                            {pagination.totalPages > 5 && (
                                <Button
                                    variant={pagination.page === pagination.totalPages ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPagination({ ...pagination, page: pagination.totalPages })}
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
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
