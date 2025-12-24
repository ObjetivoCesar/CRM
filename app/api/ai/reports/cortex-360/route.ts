import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
    request: Request
) {
    const supabase = createServerClient()
    const cookieStore = cookies()

    try {
        const { clientId } = await request.json();

        // 1. Auth check
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
        }

        // 2. Fetch full client data
        const { data: client, error: clientError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', clientId)
            .eq('entity_type', 'client')
            .single();

        if (clientError || !client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const { data: interactions } = await supabase
            .from('interactions')
            .select('*')
            .eq('contact_id', clientId)
            .order('performed_at', { ascending: false })
            .limit(10);

        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('contact_id', clientId)
            .limit(10);

        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('client_id', clientId)
            .order('date', { ascending: false })
            .limit(10);

        const { data: contracts } = await supabase
            .from('contracts')
            .select('*')
            .eq('client_id', clientId)
            .limit(5);

        // 3. Load prompt template
        const promptPath = path.join(process.cwd(), 'lib', 'openai', 'prompts', 'prompt_cortex_360.md');
        let promptTemplate = fs.readFileSync(promptPath, 'utf8');

        // 4. Fill placeholders
        const clientDataStr = JSON.stringify(client, null, 2);
        const interactionsStr = JSON.stringify(interactions, null, 2);
        const tasksStr = JSON.stringify(tasks, null, 2);
        const transactionsStr = JSON.stringify(transactions, null, 2);
        const contractsStr = JSON.stringify(contracts, null, 2);

        promptTemplate = promptTemplate
            .replace('{{clientData}}', clientDataStr)
            .replace('{{interactions}}', interactionsStr)
            .replace('{{tasks}}', tasksStr)
            .replace('{{transactions}}', transactionsStr)
            .replace('{{contracts}}', contractsStr);

        // 5. Stream from OpenAI
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'Eres un consultor estratégico senior experto en CRM y crecimiento de negocios.' },
                { role: 'user', content: promptTemplate }
            ],
            stream: true,
            temperature: 0.7,
        });

        // Convert the response into a friendly text-stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        controller.enqueue(encoder.encode(content));
                    }
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Error generating Cortex 360 report:', error);
        return NextResponse.json({ error: 'Failed to generate report', details: error.message }, { status: 500 });
    }
}
