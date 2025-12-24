
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config({ path: ".env.local" });

async function verifyModel() {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log("API Key present:", !!apiKey);

    if (!apiKey) return;

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash"];

    for (const m of models) {
        console.log(`\n--- Testing ${m} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Di 'Hola, soy el modelo ' + su nombre de modelo");
            console.log("Response:", result.response.text());
        } catch (e: any) {
            console.error(`Error with ${m}:`, e.message);
        }
    }
}

verifyModel().catch(console.error);
