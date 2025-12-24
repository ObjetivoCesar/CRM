import { z } from 'zod';

// Restaurant Contract Schema
export const restaurantContractSchema = z.object({
    // Client info (auto-filled from client selection)
    nombreContratante: z.string().min(10, 'Mínimo 10 caracteres').max(100, 'Máximo 100 caracteres'),
    tipoIdentificacion: z.enum(['Cédula', 'RUC']),
    numeroIdentificacion: z.string().refine((val) => {
        // Dynamic validation based on type
        return val.length === 10 || val.length === 13;
    }, 'Debe tener 10 dígitos (Cédula) o 13 dígitos (RUC)'),
    nombreRestaurante: z.string().min(5, 'Mínimo 5 caracteres').max(100, 'Máximo 100 caracteres'),

    // Project info
    dominioWeb: z.string().regex(
        /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-z]{2,}$/,
        'Formato de URL inválido'
    ),
    estructuraMenu: z.array(z.string().min(3, 'Mínimo 3 caracteres')).min(3, 'Mínimo 3 items').max(15, 'Máximo 15 items'),
    platosDestacados: z.array(z.string().min(5, 'Mínimo 5 caracteres')).min(3, 'Mínimo 3 items').max(8, 'Máximo 8 items'),

    // Commercial conditions
    precioTotal: z.number().min(100, 'Mínimo $100').max(5000, 'Máximo $5000'),
    anticipo: z.number().positive('Debe ser positivo'),
    plazoDias: z.number().int().min(3, 'Mínimo 3 días').max(30, 'Máximo 30 días'),
    periodoGarantia: z.enum(['1 mes', '2 meses', '3 meses']),

    // Signature data
    ciudad: z.string().min(3, 'Requerido'),
    fechaFirma: z.date(),
}).refine((data) => data.anticipo < data.precioTotal, {
    message: 'El anticipo debe ser menor que el precio total',
    path: ['anticipo'],
});

export type RestaurantContractData = z.infer<typeof restaurantContractSchema>;

// Helper functions
export function formatearLista(items: string[]): string {
    if (items.length === 1) return items[0] + '.';
    if (items.length === 2) return items[0] + ' y ' + items[1] + '.';

    const todosmenosultimo = items.slice(0, -1).join(', ');
    const ultimo = items[items.length - 1];
    return todosmenosultimo + ' y ' + ultimo + '.';
}

export function formatearFechaContrato(fecha: Date): string {
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
    const anio = fecha.getFullYear();

    return `${dia} días del mes de ${mes} del año ${anio}`;
}

export function normalizarDominio(dominio: string): string {
    let normalized = dominio.trim().toLowerCase();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://') && !normalized.startsWith('www.')) {
        normalized = 'www.' + normalized;
    }
    return normalized;
}
