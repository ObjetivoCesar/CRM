import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testKeys() {
    console.log('Testing Groq Key...');
    if (process.env.GROQ_API_KEY) {
        try {
            const groq = new OpenAI({
                apiKey: process.env.GROQ_API_KEY,
                baseURL: 'https://api.groq.com/openai/v1',
            });
            const completion = await groq.chat.completions.create({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: 'Di hola en una palabra.' }],
            });
            console.log('✅ Groq works:', completion.choices[0].message.content);
        } catch (e: any) {
            console.error('❌ Groq failed:', e.message);
        }
    } else {
        console.log('⚠️ No Groq key found.');
    }

    console.log('Testing OpenAI Key...');
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Di hola en una palabra.' }],
            });
            console.log('✅ OpenAI works:', completion.choices[0].message.content);
        } catch (e: any) {
            console.error('❌ OpenAI failed:', e.message);
        }
    } else {
        console.log('⚠️ No OpenAI key found.');
    }
}

testKeys();
