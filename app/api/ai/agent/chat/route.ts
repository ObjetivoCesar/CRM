import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai/client';
import { getClientContext, formatContextForAI } from '@/lib/ai/context-fetcher';
import { CORTEX_MASTER_PROMPT } from '@/lib/ai/prompts';

export async function POST(req: Request) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
        }

        const { clientId, message, history = [], customInstructions = "" } = await req.json();

        if (!clientId) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
        }

        // 1. Fetch Fresh Context (Stateless Brain)
        const context = await getClientContext(supabase, clientId);
        const formattedContext = formatContextForAI(context);

        // 2. Build Prompt
        const systemPrompt = CORTEX_MASTER_PROMPT
            .replace('{{CLIENT_CONTEXT}}', formattedContext)
            .replace('{{USER_CUSTOM_INSTRUCTIONS}}', customInstructions || "Sin instrucciones adicionales.");

        const openai = getOpenAIClient();

        // 3. Chat Completion
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ],
            temperature: 0.7,
            stream: true,
        });

        // Convert the response into a friendly text-stream
        // Note: For Next.js App Router streaming, we use a ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        controller.enqueue(new TextEncoder().encode(content));
                    }
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('Error in AI Agent Chat:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate AI response' }, { status: 500 });
    }
}
