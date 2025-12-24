
import { db } from "../lib/db";
import { discoveryLeads } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

async function checkLead(id: string) {
    const lead = await db.query.discoveryLeads.findFirst({
        where: eq(discoveryLeads.id, id),
    });
    console.log(JSON.stringify(lead, null, 2));
}

checkLead("8a2844d4-5ebe-4c09-a9fe-eeac49148659").catch(console.error);
