import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testFeriaVotar() {
    console.log('🧪 Iniciando prueba de POST /api/feria/votar');
    try {
        const body = {
            negocio_id: 3,
            telefono_votante: '593987654321',
            nombre_votante: 'Bot Prueba',
            mensaje_recibido: '🗳️ Voto Feria 197 por: Don Ernesto [ID: 3] ⭐'
        };

        const feriaBaseUrl = process.env.ACTIVAQR_API_URL || 'https://activaqr.com';
        console.log(`Enviando POST a ${feriaBaseUrl}/api/feria/votar...`);

        const res = await fetch(`${feriaBaseUrl}/api/feria/votar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const status = res.status;
        console.log(`Status: ${status}`);

        const data = await res.text();
        console.log(`Response body:\n${data}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

testFeriaVotar();
