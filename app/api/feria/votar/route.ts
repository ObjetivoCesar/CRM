import { NextResponse } from 'next/server';
import { feriaVotingService } from '@/lib/feria/FeriaVotingService';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const { 
            negocio_id,
            negocio_nombre, 
            telefono_votante, 
            nombre_votante, 
            mensaje_recibido 
        } = body;

        if ((!negocio_nombre && !negocio_id) || !telefono_votante) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields (negocio_id or negocio_nombre, and telefono_votante)' }, 
                { status: 400 }
            );
        }

        // Mock message ID and timestamp for REST API requests 
        // (these usually come from Meta Webhook)
        const messageId = `api_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const timestamp = new Date();

        const resultado = await feriaVotingService.registrarVoto({
            negocioId: negocio_id ? Number(negocio_id) : undefined,
            negocioNombre: negocio_nombre,
            telefono: telefono_votante,
            nombreVotante: nombre_votante || null,
            mensajeOriginal: mensaje_recibido || `Voto API por ${negocio_nombre || `ID ${negocio_id}`}`,
            messageId,
            timestamp
        });

        if (resultado.status === 'ok') {
            return NextResponse.json({
                success: true,
                negocio: {
                    id: resultado.negocio.id,
                    nombre_negocio: resultado.negocio.nombre_negocio,
                    google_reviews_url: resultado.negocio.google_reviews_url
                },
                has_reviews_url: !!resultado.negocio.google_reviews_url,
                votos_usados: resultado.votosUsados,
                message: `Voto registrado para ${resultado.negocio.nombre_negocio}`
            });
        }

        return NextResponse.json(
            { 
                success: false, 
                status: resultado.status,
                message: resultado.status === 'not_found' 
                    ? 'Negocio no encontrado' 
                    : resultado.status === 'limite' 
                        ? 'Límite de 3 votos alcanzado' 
                        : resultado.status === 'duplicado' 
                            ? 'Voto duplicado para este negocio'
                            : 'Error de base de datos'
            }, 
            { status: 400 }
        );

    } catch (error: any) {
        console.error('Feria API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message }, 
            { status: 500 }
        );
    }
}
