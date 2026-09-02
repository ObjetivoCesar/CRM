import mysql from 'mysql2/promise';

export interface FeriaNegocio {
    id: number;
    nombre_negocio: string;
    google_reviews_url: string | null;
}

export type VotoResult =
    | { status: 'ok'; negocio: FeriaNegocio; votosUsados: number }
    | { status: 'duplicado'; negocio: FeriaNegocio; votosUsados: number }
    | { status: 'limite'; votosUsados: number }
    | { status: 'not_found' }
    | { status: 'db_error'; error: string };

export interface VotoParams {
    negocioNombre?: string;
    negocioId?: number | null;
    telefono: string;
    nombreVotante: string | null;
    mensajeOriginal: string;
    messageId: string;
    timestamp: Date;
}

class FeriaVotingService {
    private pool: mysql.Pool;

    constructor() {
        this.pool = mysql.createPool({
            host: process.env.FERIA_MYSQL_HOST,
            port: Number(process.env.FERIA_MYSQL_PORT),
            user: process.env.FERIA_MYSQL_USER,
            password: process.env.FERIA_MYSQL_PASSWORD,
            database: process.env.FERIA_MYSQL_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async findNegocioById(id: number): Promise<FeriaNegocio | null> {
        try {
            const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
                `SELECT id, nombre_negocio, google_reviews_url 
                 FROM feria_negocios 
                 WHERE id = ? 
                   AND is_active = 1 
                 LIMIT 1`,
                [id]
            );
            
            if (rows.length > 0) {
                return rows[0] as FeriaNegocio;
            }
            return null;
        } catch (error: any) {
            console.error('Error finding negocio by id:', error);
            return null;
        }
    }

    async findNegocio(nombre: string): Promise<FeriaNegocio | null> {
        try {
            const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
                `SELECT id, nombre_negocio, google_reviews_url 
                 FROM feria_negocios 
                 WHERE nombre_negocio LIKE CONCAT('%', ?, '%') 
                   AND is_active = 1 
                 ORDER BY LENGTH(nombre_negocio) ASC 
                 LIMIT 1`,
                [nombre]
            );
            
            if (rows.length > 0) {
                return rows[0] as FeriaNegocio;
            }
            return null;
        } catch (error: any) {
            console.error('Error finding negocio:', error);
            return null;
        }
    }

    async getVotosDelTelefono(telefono: string): Promise<{ count: number; negocioIds: number[] }> {
        try {
            const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
                `SELECT COUNT(DISTINCT negocio_id) as count, GROUP_CONCAT(DISTINCT negocio_id) as ids 
                 FROM feria_votos 
                 WHERE telefono_votante = ?`,
                [telefono]
            );

            const count = rows[0]?.count || 0;
            const idsStr = rows[0]?.ids as string | null;
            const negocioIds = idsStr ? idsStr.split(',').map(Number) : [];

            return { count, negocioIds };
        } catch (error: any) {
            console.error('Error fetching votos por telefono:', error);
            return { count: 0, negocioIds: [] };
        }
    }

    async registrarVoto(params: VotoParams): Promise<VotoResult> {
        try {
            // 1. Encontrar el negocio: PRIORIDAD ID
            let negocio: FeriaNegocio | null = null;
            if (params.negocioId) {
                negocio = await this.findNegocioById(params.negocioId);
            }
            
            // Si no se encontró por ID o no vino ID, buscar por nombre
            if (!negocio && params.negocioNombre) {
                negocio = await this.findNegocio(params.negocioNombre);
            }

            if (!negocio) {
                return { status: 'not_found' };
            }

            // 2. Verificar límites de votación
            const votosData = await this.getVotosDelTelefono(params.telefono);
            
            // ¿Ya votó por ESTE negocio?
            if (votosData.negocioIds.includes(negocio.id)) {
                return { status: 'duplicado', negocio, votosUsados: votosData.count };
            }
            
            // ¿Ya usó sus 3 votos disponibles?
            if (votosData.count >= 3) {
                return { status: 'limite', votosUsados: votosData.count };
            }

            // 3. Registrar el voto y actualizar contador en una transacción (opcional)
            // Se hace en secuencia por si el motor no usa InnoDb por defecto en su DB simple, 
            // pero las queries son seguras.
            
            const connection = await this.pool.getConnection();
            try {
                await connection.beginTransaction();
                
                const metadataJson = JSON.stringify({
                    message_id: params.messageId,
                    timestamp: params.timestamp.toISOString(),
                    local_time_ecuador: new Date(params.timestamp.getTime() - (5 * 3600 * 1000)).toISOString()
                });

                await connection.query(
                    `INSERT INTO feria_votos (negocio_id, telefono_votante, nombre_votante, mensaje_recibido, created_at, metadata)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        negocio.id, 
                        params.telefono, 
                        params.nombreVotante || null, 
                        params.mensajeOriginal, 
                        params.timestamp,
                        metadataJson
                    ]
                );

                await connection.query(
                    `UPDATE feria_negocios 
                     SET total_votos = total_votos + 1 
                     WHERE id = ?`,
                    [negocio.id]
                );

                await connection.commit();
                
                return { 
                    status: 'ok', 
                    negocio, 
                    votosUsados: votosData.count + 1 
                };

            } catch (txError: any) {
                await connection.rollback();
                throw txError;
            } finally {
                connection.release();
            }

        } catch (error: any) {
            console.error('Error registrando voto en DB:', error);
            return { status: 'db_error', error: error.message || 'Error de base de datos' };
        }
    }
}

export const feriaVotingService = new FeriaVotingService();
