import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function sendOptimizedSticker() {
    const accessToken = process.env.META_WA_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const phone = '593963410409'; // César's phone

    const originalSticker = `C:\\Users\\Cesar\\Documents\\GRUPO EMPRESARIAL REYES\\PROYECTOS\\CRM OBJETIVO\\CRM V2\\stiker_perro.webp`;
    const optimizedSticker = path.resolve(process.cwd(), 'stiker_perro_optimized.webp');

    console.log('🐶 Iniciando optimización de sticker...');
    if (!fs.existsSync(originalSticker)) {
        console.error('❌ Error: El sticker original no existe.');
        process.exit(1);
    }

    try {
        if (fs.existsSync(optimizedSticker)) {
            fs.unlinkSync(optimizedSticker);
        }

        // Compress and scale to exactly 512x512 with webp quality 50
        console.log('⚙️ Comprimiendo y redimensionando a 512x512 con ffmpeg...');
        execSync(`ffmpeg -y -i "${originalSticker}" -vf "scale=512:512" -q:v 50 "${optimizedSticker}"`, { stdio: 'inherit' });

        const stats = fs.statSync(optimizedSticker);
        console.log(`✅ Sticker optimizado creado. Tamaño: ${(stats.size / 1024).toFixed(2)} KB (Debe ser < 100KB)`);

        if (stats.size > 100 * 1024) {
            console.log('⚠️ Sigue pesando más de 100 KB, intentando compresión más alta...');
            execSync(`ffmpeg -y -i "${originalSticker}" -vf "scale=512:512" -q:v 20 "${optimizedSticker}"`, { stdio: 'inherit' });
            const newStats = fs.statSync(optimizedSticker);
            console.log(`✅ Nuevo tamaño: ${(newStats.size / 1024).toFixed(2)} KB`);
        }

        // 2. Cargar sticker optimizado
        console.log('📤 Subiendo sticker optimizado a Meta...');
        const fileBuffer = fs.readFileSync(optimizedSticker);
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'image/webp' });
        formData.append('file', blob, 'stiker_perro.webp');
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'sticker');

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
        console.log(`✅ Sticker subido. Media ID: ${mediaId}`);

        // 3. Enviar sticker
        console.log('🚀 Enviando sticker optimizado...');
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

        console.log('✅ ¡Sticker enviado!');
        console.log(JSON.stringify(messageRes.data, null, 2));

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        if (fs.existsSync(optimizedSticker)) {
            fs.unlinkSync(optimizedSticker);
        }
    }
}

sendOptimizedSticker();
