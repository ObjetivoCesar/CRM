'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Contract {
    id: string;
    title: string;
    status: string;
    clientName: string;
    clientContact: string;
    createdAt: string;
    signedAt: string | null;
}

export default function ContractsPage() {
    const router = useRouter();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContracts();
    }, []);

    async function fetchContracts() {
        try {
            const res = await fetch('/api/contracts');
            const data = await res.json();
            setContracts(data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function deleteContract(id: string) {
        if (!confirm('¿Estás seguro de eliminar este contrato?')) return;

        try {
            await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
            fetchContracts();
        } catch (error) {
            console.error('Error deleting contract:', error);
        }
    }

    function getStatusBadge(status: string) {
        const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            draft: { label: 'Borrador', variant: 'secondary' },
            pending_signature: { label: 'Pendiente Firma', variant: 'outline' },
            signed: { label: 'Firmado', variant: 'default' },
            void: { label: 'Anulado', variant: 'destructive' },
        };

        const config = variants[status] || variants.draft;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    }

    if (loading) {
        return <div className="p-8">Cargando contratos...</div>;
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Contratos</h1>
                    <p className="text-muted-foreground">Gestiona los contratos de tus clientes</p>
                </div>
                <Button onClick={() => router.push('/contratos/nuevo')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Contrato
                </Button>
            </div>

            {/* Contracts List */}
            {contracts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No hay contratos registrados</p>
                        <Button onClick={() => router.push('/contratos/nuevo')}>
                            Crear Primer Contrato
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {contracts.map((contract) => (
                        <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{contract.title}</CardTitle>
                                        <CardDescription>{contract.clientName}</CardDescription>
                                    </div>
                                    {getStatusBadge(contract.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium">Contacto:</span> {contract.clientContact}</p>
                                    <p><span className="font-medium">Creado:</span> {format(new Date(contract.createdAt), 'dd MMM yyyy', { locale: es })}</p>
                                    {contract.signedAt && (
                                        <p><span className="font-medium">Firmado:</span> {format(new Date(contract.signedAt), 'dd MMM yyyy', { locale: es })}</p>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => router.push(`/contratos/${contract.id}`)}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteContract(contract.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
