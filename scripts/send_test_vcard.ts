import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function sendVCardTest() {
    const accessToken = process.env.META_WA_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const phone = '593967491847'; // New test phone

    console.log('📇 Iniciando envío de mensaje promocional y vCard interactiva...');
    console.log(`📱 Destinatario: ${phone}`);

    if (!accessToken || !phoneNumberId) {
        console.error('❌ Error: Falta configuración META_WA_ACCESS_TOKEN o META_WA_PHONE_NUMBER_ID en .env.local');
        process.exit(1);
    }

    const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

    try {
        // 1. Enviar el mensaje explicativo
        console.log('✉️ Enviando mensaje explicativo...');
        const introText = `¡Hola César! 🎁 Para agradecer tu interés, queremos invitarte a nuestros sorteos mensuales de licencias y productos de **ActivaQR** que realizamos exclusivamente por nuestros Estados de WhatsApp.\n\nPara participar, solo guarda nuestro contacto presionando el botón de aquí abajo 👇 y dinos **'Listo'**.`;
        
        const textRes = await axios.post(apiUrl, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "text",
            text: {
                preview_url: true,
                body: introText
            }
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Mensaje explicativo enviado con éxito. ID:', textRes.data.messages[0].id);

        // Esperar 1 segundo para asegurar orden de entrega
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Enviar la vCard Nativa
        console.log('📇 Enviando tarjeta de contacto nativa...');
        const contactPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "contacts",
            contacts: [
                {
                    addresses: [
                        {
                            street: "Juan José Peña 1181 y Mercadillo",
                            city: "Loja",
                            country: "Ecuador",
                            type: "WORK"
                        }
                    ],
                    emails: [
                        {
                            email: "negocios@cesarreyesjaramillo.com",
                            type: "WORK"
                        }
                    ],
                    name: {
                        formatted_name: "César Reyes Jaramillo",
                        first_name: "César",
                        last_name: "Reyes Jaramillo"
                    },
                    org: {
                        company: "César Reyes Jaramillo",
                        title: "Ingeniero comercial"
                    },
                    phones: [
                        {
                            phone: "+593963410409",
                            type: "CELL",
                            wa_id: "593963410409"
                        }
                    ],
                    urls: [
                        {
                            url: "https://cesarreyesjaramillo.com",
                            type: "WORK"
                        }
                    ]
                }
            ]
        };

        const contactRes = await axios.post(apiUrl, contactPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Tarjeta de contacto enviada con éxito!');
        console.log(JSON.stringify(contactRes.data, null, 2));

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

sendVCardTest();
