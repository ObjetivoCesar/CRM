const evoUrl = 'http://129.153.116.213:8080';
const evoKey = '42a447c1-3d74-4b52-9571-042c174f7621';
const evoInstance = 'Automatizotunegocio';

async function testConnection() {
    console.log('🔍 Probando conexión con Evolution API...');
    try {
        const res = await fetch(`${evoUrl}/instance/connectionStatus/${evoInstance}`, {
            method: 'GET',
            headers: {
                'apikey': evoKey
            }
        });
        
        console.log(`Status HTTP: ${res.status}`);
        const data = await res.json();
        console.log('Respuesta:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Error de conexión:', err.message);
    }
}

testConnection();
