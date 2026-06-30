import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function sendStickerTest() {
    const accessToken = process.env.META_WA_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const phone = '593963410409'; // César's phone

    const stickerFilePath = `C:\\Users\\Cesar\\Documents\\GRUPO EMPRESARIAL REYES\\PROYECTOS\\CRM OBJETIVO\\CRM V2\\stiker_perro.webp`;

    console.log('🐶 Iniciando envío de sticker de prueba...');
    console.log(`📱 Destinatario: ${phone}`);
    console.log(`📁 Sticker: ${stickerFilePath}`);

    if (!accessToken || !phoneNumberId) {
        console.error('❌ Error: Falta configuración META_WA_ACCESS_TOKEN o META_WA_PHONE_NUMBER_ID en .env.local');
        process.exit(1);
    }

    if (!fs.existsSync(stickerFilePath)) {
        console.error('❌ Error: El archivo de sticker no existe en la ruta especificada.');
        process.exit(1);
    }

    try {
        // 1. Cargar sticker en Meta
        console.log('📤 Subiendo archivo de sticker a Meta...');
        const fileBuffer = fs.readFileSync(stickerFilePath);
        
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'image/webp' });
        formData.append('file', blob, 'stiker_perro.webp');
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'sticker'); // El tipo debe ser 'sticker' para stickers

        const uploadUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/media`;
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData
        });

        const uploadData = await uploadRes.json() as any;

        if (!uploadRes.ok) {
            console.error('❌ Error al subir sticker:', uploadData);
            process.exit(1);
        }

        const mediaId = uploadData.id;
        console.log(`✅ Sticker subido con éxito. Media ID: ${mediaId}`);

        // 2. Enviar el sticker con el media ID
        console.log('🚀 Enviando sticker por WhatsApp...');
        const messageUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
        
        const messageRes = await axios.post(messageUrl, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "sticker",
            sticker: {
                id: mediaId
            }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ ¡Sticker enviado con éxito!');
        console.log(JSON.stringify(messageRes.data, null, 2));

    } catch (error: any) {
        console.error('❌ Ocurrió un error durante el proceso:');
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

sendStickerTest();
