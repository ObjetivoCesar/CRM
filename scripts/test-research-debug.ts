
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import { db } from "../lib/db";
import { discoveryLeads } from "../lib/db/schema";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

async function testResearch() {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log("API Key present:", !!apiKey);

    if (!apiKey) return;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Exactly as in the agent

    try {
        console.log("Testing Gemini content generation...");
        const result = await model.generateContent("Hola, esto es una prueba de conexión.");
        console.log("Gemini Response:", result.response.text());

        console.log("\nTesting Database connection...");
        const lead = await db.query.discoveryLeads.findFirst();
        console.log("First lead found:", lead?.nombreComercial);

    } catch (error: any) {
        console.error("TEST FAILED:", error);
    }
}

testResearch().catch(console.error);
