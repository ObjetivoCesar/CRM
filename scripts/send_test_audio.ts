import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function sendAudioTest() {
    const accessToken = process.env.META_WA_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const phone = '593963410409'; // César's phone

    const audioFilePath = `C:\\Users\\Cesar\\Documents\\GRUPO EMPRESARIAL REYES\\PROYECTOS\\CRM OBJETIVO\\CRM V2\\ElevenLabs_2026-06-15T22_26_30_Maxi - Confident, Clear Youtuber_pvc_sp104_s54_sb90_se39_b_m2.mp3`;

    console.log('🎙️ Iniciando envío de audio de prueba...');
    console.log(`📱 Destinatario: ${phone}`);
    console.log(`📁 Audio: ${audioFilePath}`);

    if (!accessToken || !phoneNumberId) {
        console.error('❌ Error: Falta configuración META_WA_ACCESS_TOKEN o META_WA_PHONE_NUMBER_ID en .env.local');
        process.exit(1);
    }

    if (!fs.existsSync(audioFilePath)) {
        console.error('❌ Error: El archivo de audio no existe en la ruta especificada.');
        process.exit(1);
    }

    try {
        // 1. Cargar archivo en Meta
        console.log('📤 Subiendo archivo de audio a Meta...');
        const fileBuffer = fs.readFileSync(audioFilePath);
        
        // Crear FormData para la API de Meta
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
        formData.append('file', blob, 'ElevenLabs_audio.mp3');
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'audio');

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
            console.error('❌ Error al subir audio:', uploadData);
            process.exit(1);
        }

        const mediaId = uploadData.id;
        console.log(`✅ Audio subido con éxito. Media ID: ${mediaId}`);

        // 2. Enviar el mensaje con el media ID
        console.log('🚀 Enviando mensaje de audio por WhatsApp...');
        const messageUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
        
        const messageRes = await axios.post(messageUrl, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "audio",
            audio: {
                id: mediaId
            }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ ¡Mensaje de audio enviado con éxito!');
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

sendAudioTest();
