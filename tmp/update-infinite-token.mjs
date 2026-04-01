import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// We need to provide the raw URL. Assuming it's defined in the .env or passed natively
// For this script, we'll try to pick it up from process.env, ensure it works.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function main() {
  const NEW_TOKEN = "EAASfXJZBBSPkBRAZC04LqBPUdyyIM3TiZBLE6vU1c7AfJPaA6U3t0ssmN66V7Fw2IujUP0MGOSZAF9yWfQYZCstkmjdtBAZACX8HZCes2e49dsawZAFBisepZBDpEK02v3ClGyYqI3ZB5l73QxBxSTSwmhpaqRCmfZB3fe8sKOqz1IfEF28CZCzgItlJTACBMSVFdfUGVAZDZD";

  try {
    // We update system_settings using raw query to avoid complex schema imports right now
    await client`
      INSERT INTO system_settings (key, value)
      VALUES 
        ('INSTAGRAM_ACCESS_TOKEN', ${NEW_TOKEN}),
        ('FACEBOOK_ACCESS_TOKEN', ${NEW_TOKEN})
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value;
    `;
    console.log("Tokens updated successfully in system_settings!");
  } catch (error) {
    console.error("Error updating tokens:", error);
  } finally {
    process.exit(0);
  }
}

main();
