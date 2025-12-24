
import { db } from '@/lib/db';
import { discoveryLeads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log("=== STARTING DIAGNOSTIC ===");

    // 1. Check API Key
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log("1. Checking GOOGLE_API_KEY...");
    if (!apiKey) {
        console.error("❌ GOOGLE_API_KEY is missing in process.env");
    } else {
        console.log(`✅ GOOGLE_API_KEY found (Length: ${apiKey.length}, Starts with: ${apiKey.substring(0, 4)}...)`);
    }

    // 2. Check DB Connection
    console.log("\n2. Checking Database Connection...");
    try {
        const lead = await db.query.discoveryLeads.findFirst();
        console.log("✅ Database connected successfully.");
        if (lead) {
            console.log(`   Found a lead: ${lead.nombreComercial} (ID: ${lead.id})`);
            // Try to use this ID for the next step?
        } else {
            console.log("   ⚠️ Table discovery_leads is empty.");
        }
    } catch (error: any) {
        console.error("❌ Database connection failed (FULL DATA):", error);
        if (error.cause) console.error("   Cause:", error.cause);
        return; // Stop if DB fails
    }

    // 3. Test Gemini API
    if (apiKey) {
        console.log("\n3. Testing Gemini API...");
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Say 'Hello Debug' if you can hear me.");
            const response = result.response.text();
            console.log("✅ Gemini API responded:", response.trim());
        } catch (error: any) {
            console.error("❌ Gemini API failed:", error.message);
        }
    }

    console.log("=== DIAGNOSTIC COMPLETE ===");
}

verify().catch(console.error);
