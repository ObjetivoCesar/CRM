
import { db } from "../lib/db";
import { discoveryLeads } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { ResearchAgent } from "../lib/discovery/research-agent";

config({ path: ".env.local" });

async function debugLeadResearch(id: string) {
    try {
        console.log(`🔍 Debugging Lead: ${id}`);
        const lead = await db.query.discoveryLeads.findFirst({
            where: eq(discoveryLeads.id, id),
        });

        if (!lead) {
            console.error("❌ Lead not found in DB");
            return;
        }

        console.log("Lead Data:", JSON.stringify(lead, null, 2));

        const agent = new ResearchAgent();
        console.log("🚀 Starting research simulation...");
        const report = await agent.researchBusiness({
            businessName: lead.nombreComercial,
            businessType: lead.actividadModalidad || lead.clasificacion,
            representative: lead.representanteLegal || lead.personaContacto,
            city: lead.canton,
            province: lead.provincia
        });

        console.log("✅ Research Success!");
        console.log("Report Preview:", report.substring(0, 200) + "...");
    } catch (error: any) {
        console.error("❌ RESEARCH FAILED for this lead:");
        console.error("Message:", error.message);
        if (error.stack) console.error("Stack:", error.stack);
    }
}

const targetId = "8a2844d4-5ebe-4c09-a9fe-eeac49148659";
debugLeadResearch(targetId).catch(console.error);
