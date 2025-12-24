'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { restaurantContractSchema, type RestaurantContractData, normalizarDominio } from '@/lib/contracts/restaurant-schema';

interface Client {
    id: string;
    businessName: string;
    contactName: string;
    phone: string;
    email: string;
    city: string;
}

export default function NewContractPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(false);

    // Dynamic lists
    const [menuItems, setMenuItems] = useState<string[]>([]);
    const [menuInput, setMenuInput] = useState('');
    const [platosItems, setPlatosItems] = useState<string[]>([]);
    const [platosInput, setPlatosInput] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<RestaurantContractData>({
        resolver: zodResolver(restaurantContractSchema),
        defaultValues: {
            ciudad: 'Loja',
            periodoGarantia: '1 mes',
            tipoIdentificacion: 'Cédula',
        },
    });

    const precioTotal = watch('precioTotal');
    const anticipo = watch('anticipo');
    const tipoIdentificacion = watch('tipoIdentificacion');
    const fechaFirma = watch('fechaFirma');

    // Calculate pago contra entrega
    const pagoContraEntrega = precioTotal && anticipo ? precioTotal - anticipo : 0;

    // Suggest 25% anticipo
    const anticipoSugerido = precioTotal ? precioTotal * 0.25 : 0;

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            setValue('nombreContratante', selectedClient.contactName);
            setValue('nombreRestaurante', selectedClient.businessName);
            setValue('ciudad', selectedClient.city || 'Loja');
        }
    }, [selectedClient, setValue]);

    async function fetchClients() {
        try {
            const res = await fetch('/api/clients');
            const data = await res.json();
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    }

    function addMenuItem() {
        if (menuInput.trim() && menuInput.length >= 3) {
            setMenuItems([...menuItems, menuInput.trim()]);
            setValue('estructuraMenu', [...menuItems, menuInput.trim()]);
            setMenuInput('');
        }
    }

    function removeMenuItem(index: number) {
        const newItems = menuItems.filter((_, i) => i !== index);
        setMenuItems(newItems);
        setValue('estructuraMenu', newItems);
    }

    function addPlatoItem() {
        if (platosInput.trim() && platosInput.length >= 5) {
            setPlatosItems([...platosItems, platosInput.trim()]);
            setValue('platosDestacados', [...platosItems, platosInput.trim()]);
            setPlatosInput('');
        }
    }

    function removePlatoItem(index: number) {
        const newItems = platosItems.filter((_, i) => i !== index);
        setPlatosItems(newItems);
        setValue('platosDestacados', newItems);
    }

    async function onSubmit(data: RestaurantContractData) {
        setLoading(true);
        try {
            // Normalize domain
            const normalizedData = {
                ...data,
                dominioWeb: normalizarDominio(data.dominioWeb),
            };

            const response = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClient?.id,
                    title: `Contrato - ${data.nombreRestaurante}`,
                    status: 'draft',
                    contractData: normalizedData,
                }),
            });

            if (response.ok) {
                const contract = await response.json();
                router.push(`/contratos/${contract.id}`);
            } else {
                alert('Error al crear el contrato');
            }
        } catch (error) {
            console.error('Error creating contract:', error);
            alert('Error al crear el contrato');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Nuevo Contrato - Restaurante</h1>
                    <p className="text-muted-foreground">Completa los datos para generar el contrato</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Client Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>1. Seleccionar Cliente</CardTitle>
                        <CardDescription>Elige el cliente para este contrato</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select onValueChange={(value) => {
                            const client = clients.find(c => c.id === value);
                            setSelectedClient(client || null);
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.businessName} - {client.contactName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!selectedClient && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Debes seleccionar un cliente para continuar
                            </p>
                        )}
                    </CardContent>
                </Card>

                {selectedClient && (
                    <>
                        {/* Contractor Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>2. Información del Contratante</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="nombreContratante">Nombre Completo del Contratante *</Label>
                                    <Input
                                        id="nombreContratante"
                                        {...register('nombreContratante')}
                                        placeholder="Ej: Martha Isabel Moncayo Carrión"
                                    />
                                    {errors.nombreContratante && (
                                        <p className="text-sm text-destructive mt-1">{errors.nombreContratante.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Tipo de Identificación *</Label>
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                value="Cédula"
                                                {...register('tipoIdentificacion')}
                                            />
                                            Cédula
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                value="RUC"
                                                {...register('tipoIdentificacion')}
                                            />
                                            RUC
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="numeroIdentificacion">
                                        Número de {tipoIdentificacion} *
                                    </Label>
                                    <Input
                                        id="numeroIdentificacion"
                                        {...register('numeroIdentificacion')}
                                        placeholder={
                                            tipoIdentificacion === 'Cédula'
                                                ? 'Ej: 1103421531 (10 dígitos)'
                                                : 'Ej: 1103421531001 (13 dígitos)'
                                        }
                                        maxLength={tipoIdentificacion === 'Cédula' ? 10 : 13}
                                    />
                                    {errors.numeroIdentificacion && (
                                        <p className="text-sm text-destructive mt-1">{errors.numeroIdentificacion.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="nombreRestaurante">Nombre del Restaurante *</Label>
                                    <Input
                                        id="nombreRestaurante"
                                        {...register('nombreRestaurante')}
                                        placeholder="Ej: Restaurante 200 Millas"
                                    />
                                    {errors.nombreRestaurante && (
                                        <p className="text-sm text-destructive mt-1">{errors.nombreRestaurante.message}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>3. Información del Proyecto</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="dominioWeb">Dominio Web *</Label>
                                    <Input
                                        id="dominioWeb"
                                        {...register('dominioWeb')}
                                        placeholder="Ej: www.restaurante200millas.com"
                                    />
                                    {errors.dominioWeb && (
                                        <p className="text-sm text-destructive mt-1">{errors.dominioWeb.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Estructura del Menú * (mínimo 3 items)</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Input
                                            value={menuInput}
                                            onChange={(e) => setMenuInput(e.target.value)}
                                            placeholder="Ej: Ceviches, Sopas, Platos Fuertes..."
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMenuItem())}
                                        />
                                        <Button type="button" onClick={addMenuItem} size="icon">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {menuItems.map((item, index) => (
                                            <div key={index} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-md">
                                                <span className="text-sm">{item}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeMenuItem(index)}
                                                    className="text-destructive hover:text-destructive/80"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.estructuraMenu && (
                                        <p className="text-sm text-destructive mt-1">{errors.estructuraMenu.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Platos Destacados * (mínimo 3 items)</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Input
                                            value={platosInput}
                                            onChange={(e) => setPlatosInput(e.target.value)}
                                            placeholder="Ej: Parrillada 200 Millas, Ceviche Mixto..."
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPlatoItem())}
                                        />
                                        <Button type="button" onClick={addPlatoItem} size="icon">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {platosItems.map((item, index) => (
                                            <div key={index} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-md">
                                                <span className="text-sm">{item}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removePlatoItem(index)}
                                                    className="text-destructive hover:text-destructive/80"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.platosDestacados && (
                                        <p className="text-sm text-destructive mt-1">{errors.platosDestacados.message}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Commercial Conditions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>4. Condiciones Comerciales</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="precioTotal">Precio Total (USD) *</Label>
                                    <Input
                                        id="precioTotal"
                                        type="number"
                                        {...register('precioTotal', { valueAsNumber: true })}
                                        placeholder="Ej: 500"
                                        min={100}
                                        max={5000}
                                    />
                                    {errors.precioTotal && (
                                        <p className="text-sm text-destructive mt-1">{errors.precioTotal.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="anticipo">Anticipo (USD) *</Label>
                                    <Input
                                        id="anticipo"
                                        type="number"
                                        {...register('anticipo', { valueAsNumber: true })}
                                        placeholder="Ej: 125"
                                    />
                                    {anticipoSugerido > 0 && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Sugerido: ${anticipoSugerido.toFixed(2)} (25%)
                                        </p>
                                    )}
                                    {errors.anticipo && (
                                        <p className="text-sm text-destructive mt-1">{errors.anticipo.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Pago Contra Entrega (USD)</Label>
                                    <Input
                                        value={pagoContraEntrega > 0 ? `$${pagoContraEntrega.toFixed(2)}` : '$0.00'}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">Calculado automáticamente</p>
                                </div>

                                <div>
                                    <Label htmlFor="plazoDias">Plazo de Entrega (días hábiles) *</Label>
                                    <Input
                                        id="plazoDias"
                                        type="number"
                                        {...register('plazoDias', { valueAsNumber: true })}
                                        placeholder="Ej: 5"
                                        min={3}
                                        max={30}
                                    />
                                    {errors.plazoDias && (
                                        <p className="text-sm text-destructive mt-1">{errors.plazoDias.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="periodoGarantia">Período de Garantía *</Label>
                                    <Select onValueChange={(value) => setValue('periodoGarantia', value as any)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona período" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1 mes">1 mes</SelectItem>
                                            <SelectItem value="2 meses">2 meses</SelectItem>
                                            <SelectItem value="3 meses">3 meses</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Signature Data */}
                        <Card>
                            <CardHeader>
                                <CardTitle>5. Datos de Firma</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="ciudad">Ciudad de Firma *</Label>
                                    <Input
                                        id="ciudad"
                                        {...register('ciudad')}
                                        placeholder="Ej: Loja"
                                    />
                                    {errors.ciudad && (
                                        <p className="text-sm text-destructive mt-1">{errors.ciudad.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Fecha de Firma *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !fechaFirma && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {fechaFirma ? format(fechaFirma, 'PPP', { locale: es }) : 'Selecciona una fecha'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={fechaFirma}
                                                onSelect={(date) => setValue('fechaFirma', date as Date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.fechaFirma && (
                                        <p className="text-sm text-destructive mt-1">{errors.fechaFirma.message}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="flex-1">
                                {loading ? 'Creando...' : 'Crear Contrato'}
                            </Button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
