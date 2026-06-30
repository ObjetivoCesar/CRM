const evoUrl = 'http://129.153.116.213:8080';
const evoKey = '42a447c1-3d74-4b52-9571-042c174f7621';
const evoInstance = 'Automatizotunegocio';
const targetNumber = '593963410409'; // César's number

async function testSendMedia() {
    console.log('Sending VCF media via Evolution API...');
    const payload = {
        number: targetNumber,
        mediatype: 'document',
        media: 'https://crm-nbul.onrender.com/cesar-reyes-jaramillo.vcf',
        fileName: 'Cesar_Reyes.vcf',
        mimetype: 'text/vcard'
    };

    try {
        const res = await fetch(`${evoUrl}/message/sendMedia/${evoInstance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evoKey
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`Status HTTP: ${res.status}`);
        const data = await res.json();
        console.log('Respuesta:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

testSendMedia();
