
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables manually since we are not in Next.js environment
dotenv.config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_API_KEY is missing in .env.local");
        process.exit(1);
    }

    console.log("Using API Key:", apiKey.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const candidates = [
            "gemini-2.0-flash-exp",
            "gemini-flash-latest",
            "gemini-2.0-flash-lite-preview-02-05",
            "gemini-2.5-flash",
            "models/gemini-1.5-flash-8b"
        ];

        console.log("Testing generation on candidates...");

        for (const modelName of candidates) {
            process.stdout.write(`Testing generation with ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                await result.response; // Make sure we can get the response
                console.log("✅ SUCCESS");
            } catch (error: any) {
                console.log("❌ FAILED");
                // Only log the valid error message part to be concise
                const msg = error.message?.split('[')[1]?.split(']')[0] || error.message;
                console.log(`   -> ${msg}`);
            }
        }

    } catch (error) {
        console.error("Fatal error:", error);
    }
}

listModels();
