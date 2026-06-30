const evoUrl = 'http://129.153.116.213:8080';
const evoKey = '42a447c1-3d74-4b52-9571-042c174f7621';

async function listInstances() {
    console.log('🔍 Listando instancias en Evolution API...');
    try {
        const res = await fetch(`${evoUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'apikey': evoKey
            }
        });
        
        console.log(`Status HTTP: ${res.status}`);
        const data = await res.json();
        console.log('Instancias:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

listInstances();
