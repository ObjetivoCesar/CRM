import { NextRequest, NextResponse } from 'next/server';
import { cortexRouter } from '@/lib/donna/services/CortexRouterService';

export const dynamic = 'force-dynamic';

/**
 * TEST ENDPOINT - Prueba directa del Cortex Router
 * Accede a: http://localhost:3000/api/test-cortex?text=El+compadre+Claudio+me+pidió+cambiar+el+logo
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const text = searchParams.get('text');

        if (!text) {
            return NextResponse.json({
                error: 'Falta el parámetro "text"',
                example: '/api/test-cortex?text=El+compadre+Claudio+me+pidió+cambiar+el+logo'
            });
        }

        console.log('🧪 Testing Cortex Router with:', text);

        const result = await cortexRouter.processInput({
            text,
            source: 'cesar',
        });

        return NextResponse.json({
            success: true,
            input: text,
            result
        });
    } catch (error: any) {
        console.error('❌ Test Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
