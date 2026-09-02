import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno locales ANTES de importar el servicio
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runTests() {
    // Ahora sí importamos dinámicamente
    const { feriaVotingService } = await import('../lib/feria/FeriaVotingService');

    console.log('🧪 Iniciando pruebas del servicio FeriaVotingService...');
    
    try {
        console.log('\n1. Probando busqueda de negocio...');
        // Buscar algún negocio (ajusta el nombre a uno real o falso que tengas en bd)
        // Solo para ver si conecta bien y no da error
        const negocio = await feriaVotingService.findNegocio('cafe');
        console.log('Resultado búsqueda:', negocio ? `Encontrado: ${negocio.nombre_negocio}` : 'No encontrado');

        console.log('\n2. Obteniendo votos de un número X...');
        const votos = await feriaVotingService.getVotosDelTelefono('593999999999');
        console.log('Votos:', votos);

        console.log('\n✅ Pruebas finalizadas.');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit(0);
    }
}

runTests();
