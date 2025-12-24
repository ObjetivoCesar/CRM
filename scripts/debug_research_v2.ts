
import { db } from '@/lib/db';
import * as dotenv from 'dotenv';
import postgres from 'postgres';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log("=== STARTING DIAGNOSTIC ===");

    // 1. Check Env Vars
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("❌ DATABASE_URL is missing!");
        return;
    }
    console.log(`✅ DATABASE_URL found (Starts with: ${dbUrl.substring(0, 15)}...)`);

    // 2. Test Drizzle Connection
    console.log("\n2. Testing Drizzle ORM Connection...");
    try {
        const start = Date.now();
        const lead = await db.query.discoveryLeads.findFirst();
        console.log(`✅ Drizzle Connected! (Time: ${Date.now() - start}ms)`);
    } catch (error: any) {
        console.error("❌ Drizzle Connection FAILED:");
        console.error("   Message:", error.message);
        console.error("   Code:", error.code);
        if (error.cause) console.error("   Cause:", error.cause);
    }

    // 3. Test Direct Postgres Connection (Bypass Drizzle)
    console.log("\n3. Testing Direct Postgres Connection...");
    try {
        const sql = postgres(dbUrl, { max: 1, connect_timeout: 5 });
        const start = Date.now();
        const result = await sql`SELECT 1 as passed`;
        console.log(`✅ Direct Postgres Connected! (Time: ${Date.now() - start}ms)`);
        await sql.end();
    } catch (error: any) {
        console.error("❌ Direct Postgres FAILED:");
        console.error("   Message:", error.message);
        console.error("   Full Error:", JSON.stringify(error, null, 2));
    }

    console.log("=== DIAGNOSTIC COMPLETE ===");
}

verify().catch(console.error);
