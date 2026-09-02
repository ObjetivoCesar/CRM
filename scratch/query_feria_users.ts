import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno locales
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function queryFeriaUsers() {
    const { feriaVotingService } = await import('../lib/feria/FeriaVotingService');
    
    // Extraer el pool (usaremos any para hackear la propiedad private pool)
    const pool = (feriaVotingService as any).pool;

    try {
        console.log('Consultando usuarios (votos) en la Feria...');
        const [rows] = await pool.query(
            `SELECT telefono_votante, nombre_votante, COUNT(*) as cantidad_votos, MAX(created_at) as ultimo_voto
             FROM feria_votos
             GROUP BY telefono_votante, nombre_votante
             ORDER BY ultimo_voto DESC
             LIMIT 10`
        );
        
        console.log('=== Votantes registrados ===');
        console.table(rows);

        const [negociosRows] = await pool.query(
            `SELECT nombre_negocio, total_votos FROM feria_negocios ORDER BY total_votos DESC LIMIT 5`
        );
        console.log('\n=== Top 5 Negocios ===');
        console.table(negociosRows);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

queryFeriaUsers();
