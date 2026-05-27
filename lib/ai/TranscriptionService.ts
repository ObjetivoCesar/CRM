import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * TranscriptionService: Handles audio-to-text conversion.
 * Uses Gemini 2.0 Flash as primary, falls back to OpenAI Whisper.
 * 
 * Limits:
 * - Max audio duration: ~2 min (enforced via buffer size ≈ 500KB for opus voice)
 * - 429 (quota) → retry 1 vez con backoff de 5s, si falla → fallback a Whisper
 */
export class TranscriptionService {
    private apiKey: string;
    private prompt: string = '';
    // ~2 min de opus voice ≈ 500KB. Para otros formatos (wav, mp3) el tope es mayor (~5MB)
    private readonly MAX_BUFFER_SIZE = 5 * 1024 * 1024; // 5MB absolute max
    private readonly MAX_VOICE_SIZE_ESTIMATED = 500 * 1024; // ~2 min opus voice

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.loadPrompt();
    }

    private loadPrompt() {
        try {
            const promptPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', 'transcriber.md');
            if (fs.existsSync(promptPath)) {
                this.prompt = fs.readFileSync(promptPath, 'utf-8');
            }
        } catch (error) {
            console.error('❌ TranscriptionService: Error loading prompt:', error);
        }
    }

    /**
     * Returns a user-friendly message when audio is too long.
     */
    getTooLongMessage(): string {
        return "🎤 El audio es demasiado largo. Por favor escribe un mensaje de texto o envía un audio más corto (máximo 2 minutos). ¡Gracias! 😊";
    }

    /**
     * Returns a user-friendly message when transcription fails.
     */
    getTranscriptionFailedMessage(): string {
        return "🎤 No pude procesar tu audio. ¿Puedes escribirme lo que necesitas? Gracias 😊";
    }

    /**
     * Transcribes an audio buffer.
     * Returns null if the buffer exceeds limits (caller should send auto-response).
     * Returns "[Error en transcripción de audio]" if all backends fail.
     * 
     * Cascade: Gemini (6 keys) → Groq → Whisper
     */
    async transcribe(audioBuffer: Buffer, fileName: string = 'audio.ogg'): Promise<string | null> {
        // ─── LIMIT CHECK: Reject audios that are obviously too large ───
        if (audioBuffer.byteLength > this.MAX_BUFFER_SIZE) {
            console.warn(`⚠️ TranscriptionService: Audio too large (${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max: ${this.MAX_BUFFER_SIZE / 1024 / 1024}MB`);
            return null; // Caller will send getTooLongMessage()
        }

        // ─── 1st: Gemini cascade (6 keys) ───
        const geminiResult = await this.transcribeWithGemini(audioBuffer);
        if (geminiResult !== null) return geminiResult;

        // ─── 2nd: Groq Whisper-compatible ───
        console.log('🔄 TranscriptionService: Gemini cascade exhausted, trying Groq...');
        const groqResult = await this.transcribeWithGroq(audioBuffer, fileName);
        if (groqResult !== null) return groqResult;

        // ─── 3rd: OpenAI Whisper ───
        console.log('🔄 TranscriptionService: Groq failed, trying OpenAI Whisper fallback...');
        const whisperResult = await this.transcribeWithWhisper(audioBuffer, fileName);
        if (whisperResult !== null) return whisperResult;

        // All failed
        return "[Error en transcripción de audio]";
    }

    private async transcribeWithGemini(audioBuffer: Buffer): Promise<string | null> {
        // ─── CASCADE: intentar hasta 5 API keys de Gemini ───
        const geminiKeys = [
            process.env.GOOGLE_AI_API_KEY,
            process.env.GOOGLE_AI_API_KEY_2,
            process.env.GOOGLE_AI_API_KEY_3,
            process.env.GOOGLE_AI_API_KEY_4,
            process.env.GOOGLE_AI_API_KEY_5,
            process.env.GOOGLE_API_KEY, // fallback legacy
        ].filter(Boolean) as string[];

        if (geminiKeys.length === 0) {
            console.warn('⚠️ TranscriptionService: No Gemini API keys configured, skipping');
            return null;
        }

        for (let attempt = 0; attempt < geminiKeys.length; attempt++) {
            const apiKey = geminiKeys[attempt];
            try {
                console.log(`📡 Sending audio to Gemini (key #${attempt + 1}, ${audioBuffer.byteLength} bytes)...`);
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

                const base64Audio = audioBuffer.toString('base64');
                const transcriptionPrompt = this.prompt || "Transcribe este audio comercial en español. Solo devuelve el texto transcrito.";

                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: "audio/ogg",
                            data: base64Audio
                        }
                    },
                    transcriptionPrompt
                ]);

                const responseText = result.response.text();
                if (responseText) {
                    console.log(`✅ Gemini key #${attempt + 1} successful`);
                    return responseText.trim();
                }
                return '';
            } catch (error: any) {
                const isQuotaError = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
                const isRateLimit = error?.message?.includes('RATE_LIMIT') || error?.message?.includes('Too Many Requests');

                if (isQuotaError || isRateLimit) {
                    console.warn(`⚠️ Gemini key #${attempt + 1} quota exceeded. Trying next key...`);
                    continue; // Try next key in cascade
                }

                console.error(`❌ TranscriptionService Gemini key #${attempt + 1} Error:`, error?.message || error);
                continue; // Non-quota error, try next key anyway
            }
        }

        console.error('❌ All Gemini keys exhausted');
        return null; // Let caller try Groq/Whisper fallback
    }

    private async transcribeWithGroq(audioBuffer: Buffer, fileName: string): Promise<string | null> {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            console.warn('⚠️ TranscriptionService: GROQ_API_KEY not configured, skipping Groq');
            return null;
        }

        try {
            console.log(`📡 Sending audio to Groq (${audioBuffer.byteLength} bytes)...`);
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
            formData.append('file', blob, fileName);
            formData.append('model', 'whisper-large-v3-turbo');
            formData.append('language', 'es');
            formData.append('response_format', 'json');

            const response = await axios.post(
                'https://api.groq.com/openai/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${groqKey}`,
                    },
                    timeout: 30000,
                }
            );

            if (response.data?.text) {
                console.log('✅ Groq transcription successful');
                return response.data.text.trim();
            }
            return null;
        } catch (error: any) {
            console.error('❌ TranscriptionService Groq Error:', error?.response?.data || error?.message || error);
            return null;
        }
    }

    private async transcribeWithWhisper(audioBuffer: Buffer, fileName: string): Promise<string | null> {
        if (!this.apiKey) {
            console.warn('⚠️ TranscriptionService: OPENAI_API_KEY not configured, skipping Whisper fallback');
            return null;
        }

        try {
            console.log(`📡 Sending audio to OpenAI Whisper (${audioBuffer.byteLength} bytes)...`);
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
            formData.append('file', blob, fileName);
            formData.append('model', 'whisper-1');
            formData.append('language', 'es');

            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: 30000,
                }
            );

            if (response.data?.text) {
                console.log('✅ Whisper transcription successful');
                return response.data.text.trim();
            }
            return null;
        } catch (error: any) {
            console.error('❌ TranscriptionService Whisper Error:', error?.response?.data || error?.message || error);
            return null;
        }
    }
}

export const transcriptionService = new TranscriptionService();
