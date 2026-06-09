import OpenAI from "openai";

type AIIntent = 'REASONING' | 'STANDARD' | 'AUDIO' | 'FAST';

interface AIClientConfig {
    apiKey: string;
    baseURL?: string;
    defaultModel: string;
}

function createCascadeProxy(clients: { client: OpenAI; model: string }[]): OpenAI {
    if (clients.length === 0) throw new Error("No AI clients provided for cascade");
    
    const primary = clients[0].client;
    
    const handler: ProxyHandler<any> = {
        get(target, prop, receiver) {
            if (prop === 'chat') {
                return new Proxy(target.chat, {
                    get(chatTarget, chatProp) {
                        if (chatProp === 'completions') {
                            return new Proxy(chatTarget.completions, {
                                get(compTarget, compProp) {
                                    if (compProp === 'create') {
                                        return async (params: any, options: any) => {
                                            let lastError = null;
                                            // The caller might provide their own model, but we override it if the client has a specific model we need to fallback to
                                            for (let i = 0; i < clients.length; i++) {
                                                const { client, model } = clients[i];
                                                try {
                                                    // If the caller explicitly passed a model, we use it for the primary client only, 
                                                    // otherwise we use the fallback model
                                                    const useModel = (i === 0 && params.model) ? params.model : model;
                                                    const p = { ...params, model: useModel };
                                                    return await client.chat.completions.create(p, options);
                                                } catch (e: any) {
                                                    lastError = e;
                                                    console.warn(`⚠️ [AIClient Cascade] Error with client ${i} (${model}):`, e.message);
                                                    const status = e.status || (e.response && e.response.status);
                                                    if (status === 402 || status === 429 || status === 500 || status === 502 || status === 503 || status === 401 || status === 413) {
                                                        console.warn(`🔄 Falling back to next AI provider...`);
                                                        continue; // Fallback
                                                    }
                                                    throw e; // Non-retryable error
                                                }
                                            }
                                            console.error(`❌ [AIClient Cascade] All providers failed. Last error:`, lastError?.message);
                                            throw lastError;
                                        };
                                    }
                                    return Reflect.get(compTarget, compProp);
                                }
                            });
                        }
                        return Reflect.get(chatTarget, chatProp);
                    }
                });
            }
            return Reflect.get(target, prop, receiver);
        }
    };
    
    return new Proxy(primary, handler);
}

export class AIClient {
    private static instance: AIClient;

    private reasoningClient: OpenAI;
    private standardClient: OpenAI;
    private audioClient: OpenAI;

    private constructor() {
        const groqKey = process.env.GROQ_API_KEY;
        const openAIKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
        const deepSeekKey = process.env.DEEPSEEK_API_KEY;

        const groqClient = groqKey ? new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" }) : null;
        const openAIClientObj = openAIKey ? new OpenAI({ apiKey: openAIKey }) : null;
        const geminiClient = geminiKey ? new OpenAI({ apiKey: geminiKey, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }) : null;
        const deepSeekClient = deepSeekKey ? new OpenAI({ apiKey: deepSeekKey, baseURL: "https://api.deepseek.com" }) : null;

        // Cascade for Reasoning: DeepSeek -> Groq -> OpenAI -> Gemini
        const reasoningCascade = [];
        if (deepSeekClient) reasoningCascade.push({ client: deepSeekClient, model: "deepseek-reasoner" });
        if (groqClient) reasoningCascade.push({ client: groqClient, model: "llama-3.3-70b-versatile" });
        if (openAIClientObj) reasoningCascade.push({ client: openAIClientObj, model: "gpt-4o" });
        if (geminiClient) reasoningCascade.push({ client: geminiClient, model: "gemini-2.5-pro" });

        // Cascade for Fast/Standard: DeepSeek -> Groq -> OpenAI -> Gemini
        const standardCascade = [];
        if (deepSeekClient) standardCascade.push({ client: deepSeekClient, model: "deepseek-chat" });
        if (groqClient) standardCascade.push({ client: groqClient, model: "llama-3.1-8b-instant" });
        if (openAIClientObj) standardCascade.push({ client: openAIClientObj, model: "gpt-4o-mini" });
        if (geminiClient) standardCascade.push({ client: geminiClient, model: "gemini-2.5-flash" });

        this.reasoningClient = reasoningCascade.length > 0 ? createCascadeProxy(reasoningCascade) : new OpenAI({ apiKey: "dummy" });
        this.standardClient = standardCascade.length > 0 ? createCascadeProxy(standardCascade) : new OpenAI({ apiKey: "dummy" });

        this.audioClient = openAIClientObj || new OpenAI({ apiKey: "dummy" });
    }

    public static getInstance(): AIClient {
        if (!AIClient.instance) {
            AIClient.instance = new AIClient();
        }
        return AIClient.instance;
    }

    public getClient(intent: AIIntent): OpenAI {
        switch (intent) {
            case 'REASONING':
                return this.reasoningClient;
            case 'STANDARD':
            case 'FAST':
                return this.standardClient;
            case 'AUDIO':
                return this.audioClient;
            default:
                return this.standardClient;
        }
    }

    public getModel(intent: AIIntent): string {
        // We now rely on the cascade to inject the right model string internally,
        // but if code needs it, we can return the first available model.
        const groqKey = process.env.GROQ_API_KEY;
        const openAIKey = process.env.OPENAI_API_KEY;
        const deepSeekKey = process.env.DEEPSEEK_API_KEY;

        switch (intent) {
            case 'REASONING':
                return deepSeekKey ? "deepseek-reasoner" : (groqKey ? "llama-3.3-70b-versatile" : "gpt-4o");
            case 'STANDARD':
            case 'FAST':
                return deepSeekKey ? "deepseek-chat" : (groqKey ? "llama-3.1-8b-instant" : "gpt-4o-mini");
            case 'AUDIO':
                return "whisper-1";
            default:
                return "gpt-4o-mini";
        }
    }
}

// Helper shorthand
export function getAIClient(intent: AIIntent = 'STANDARD') {
    return AIClient.getInstance().getClient(intent);
}

export function getModelId(intent: AIIntent = 'STANDARD') {
    return AIClient.getInstance().getModel(intent);
}

// Transcribe helper kept for backward compatibility ease
export async function transcribeAudio(audioFile: File): Promise<string> {
    const client = getAIClient('AUDIO');
    try {
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "es",
            prompt: "Transcribe este audio de una conversación comercial. Identifica nombres, fechas y montos.",
        });
        return transcription.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("Error al transcribir el audio");
    }
}
