import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
    const accessToken = process.env.META_WA_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const phone = '593963410409'; // César's phone

    const mp3Path = `C:\\Users\\Cesar\\Documents\\GRUPO EMPRESARIAL REYES\\PROYECTOS\\CRM OBJETIVO\\CRM V2\\ElevenLabs_2026-06-15T22_26_30_Maxi - Confident, Clear Youtuber_pvc_sp104_s54_sb90_se39_b_m2.mp3`;
    const oggPath = path.resolve(process.cwd(), 'voice_note_test.ogg');
    const stickerPath = `C:\\Users\\Cesar\\Documents\\GRUPO EMPRESARIAL REYES\\PROYECTOS\\CRM OBJETIVO\\CRM V2\\stiker_perro.webp`;

    console.log('🧐 Inspecting files...');
    if (fs.existsSync(stickerPath)) {
        const stats = fs.statSync(stickerPath);
        console.log(`Sticker file exists! Size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
        console.log('Sticker file not found at path:', stickerPath);
    }

    if (!fs.existsSync(mp3Path)) {
        console.error('❌ Error: MP3 audio not found.');
        process.exit(1);
    }

    if (!accessToken || !phoneNumberId) {
        console.error('❌ Error: Missing credentials in env.');
        process.exit(1);
    }

    // 1. Transcoding MP3 to OGG Opus
    console.log('🎵 Transcoding MP3 to OGG (Opus) using ffmpeg...');
    try {
        if (fs.existsSync(oggPath)) {
            fs.unlinkSync(oggPath);
        }
        // Command to encode to OGG Opus.
        // We use libopus codec, mapping to audio channel mono/stereo, bit rate 64k.
        execSync(`ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 64k -ac 1 "${oggPath}"`, { stdio: 'inherit' });
        console.log(`✅ Transcoding complete. File saved to: ${oggPath}`);
    } catch (e: any) {
        console.error('❌ Transcoding failed:', e.message);
        process.exit(1);
    }

    // 2. Upload to Meta
    console.log('📤 Uploading OGG voice note to Meta CDN...');
    try {
        const oggBuffer = fs.readFileSync(oggPath);
        const formData = new FormData();
        const blob = new Blob([oggBuffer], { type: 'audio/ogg; codecs=opus' });
        formData.append('file', blob, 'voice_note.ogg');
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
            console.error('❌ Error uploading OGG:', uploadData);
            process.exit(1);
        }

        const mediaId = uploadData.id;
        console.log(`✅ OGG uploaded. Media ID: ${mediaId}`);

        // 3. Send Message
        console.log('🚀 Sending native voice note (audio message)...');
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

        console.log('✅ Send complete! Response:');
        console.log(JSON.stringify(messageRes.data, null, 2));

    } catch (err: any) {
        console.error('❌ Error sending voice note:', err.response?.data || err.message);
    } finally {
        // Cleanup temp file
        if (fs.existsSync(oggPath)) {
            fs.unlinkSync(oggPath);
        }
    }
}

runTest();
