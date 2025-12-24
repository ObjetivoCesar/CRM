'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { RestaurantContractPDF } from '@/components/contracts/restaurant-contract-pdf';
import type { RestaurantContractData } from '@/lib/contracts/restaurant-schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Contract {
    id: string;
    title: string;
    status: string;
    contractData: string;
    createdAt: string;
    updatedAt: string;
}

export default function ContractViewPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [contract, setContract] = useState<Contract | null>(null);
    const [contractData, setContractData] = useState<RestaurantContractData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContract();
    }, []);

    async function fetchContract() {
        try {
            const res = await fetch(`/api/contracts/${params.id}`);
            const data = await res.json();
            setContract(data);

            // Parse contract data
            const parsed = JSON.parse(data.contractData);
            // Convert date string back to Date object
            parsed.fechaFirma = new Date(parsed.fechaFirma);
            setContractData(parsed);
        } catch (error) {
            console.error('Error fetching contract:', error);
        } finally {
            setLoading(false);
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
        return <div className="p-8">Cargando contrato...</div>;
    }

    if (!contract || !contractData) {
        return <div className="p-8">Contrato no encontrado</div>;
    }

    const pagoContraEntrega = contractData.precioTotal - contractData.anticipo;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{contract.title}</h1>
                        <p className="text-muted-foreground">
                            Creado el {format(new Date(contract.createdAt), 'dd MMM yyyy', { locale: es })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {getStatusBadge(contract.status)}
                    <PDFDownloadLink
                        document={<RestaurantContractPDF data={contractData} />}
                        fileName={`contrato-${contractData.nombreRestaurante.toLowerCase().replace(/\s+/g, '-')}.pdf`}
                    >
                        {({ loading }) => (
                            <Button disabled={loading}>
                                <Download className="mr-2 h-4 w-4" />
                                {loading ? 'Generando PDF...' : 'Descargar PDF'}
                            </Button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>

            {/* Contract Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Vista Previa del Contrato</CardTitle>
                    <CardDescription>Revisa los datos antes de generar el PDF final</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Contractor Info */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Información del Contratante</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Nombre:</span> {contractData.nombreContratante}
                            </div>
                            <div>
                                <span className="font-medium">{contractData.tipoIdentificacion}:</span> {contractData.numeroIdentificacion}
                            </div>
                            <div>
                                <span className="font-medium">Restaurante:</span> {contractData.nombreRestaurante}
                            </div>
                            <div>
                                <span className="font-medium">Ciudad:</span> {contractData.ciudad}
                            </div>
                        </div>
                    </div>

                    {/* Project Info */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Información del Proyecto</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="font-medium">Dominio Web:</span> {contractData.dominioWeb}
                            </div>
                            <div>
                                <span className="font-medium">Estructura del Menú:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {contractData.estructuraMenu.map((item, i) => (
                                        <Badge key={i} variant="outline">{item}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Platos Destacados:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {contractData.platosDestacados.map((item, i) => (
                                        <Badge key={i} variant="outline">{item}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Commercial Conditions */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Condiciones Comerciales</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Precio Total:</span> ${contractData.precioTotal} USD
                            </div>
                            <div>
                                <span className="font-medium">Anticipo:</span> ${contractData.anticipo} USD
                            </div>
                            <div>
                                <span className="font-medium">Pago Contra Entrega:</span> ${pagoContraEntrega} USD
                            </div>
                            <div>
                                <span className="font-medium">Plazo:</span> {contractData.plazoDias} días hábiles
                            </div>
                            <div>
                                <span className="font-medium">Garantía:</span> {contractData.periodoGarantia}
                            </div>
                            <div>
                                <span className="font-medium">Fecha de Firma:</span> {format(contractData.fechaFirma, 'dd MMM yyyy', { locale: es })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push('/contratos')} className="flex-1">
                    Volver al Listado
                </Button>
                <PDFDownloadLink
                    document={<RestaurantContractPDF data={contractData} />}
                    fileName={`contrato-${contractData.nombreRestaurante.toLowerCase().replace(/\s+/g, '-')}.pdf`}
                    className="flex-1"
                >
                    {({ loading }) => (
                        <Button disabled={loading} className="w-full">
                            <FileText className="mr-2 h-4 w-4" />
                            {loading ? 'Generando...' : 'Generar PDF Final'}
                        </Button>
                    )}
                </PDFDownloadLink>
            </div>
        </div>
    );
}
