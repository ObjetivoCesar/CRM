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
  const NEW_TOKEN = "EAASfXJZBBSPkBRLML1AA1CowW5ac9ZCayvRAfZAtd4ZCOdAoqav7CAqKY6hyLdYDPYR5twpNFI9Ihlh1GYyZBR50VuxoXk4MZC4enW6bvY79QOkhfWZB13a4EA718xH5r7EPpeLzOPLe7ZAXdz3AZA2bHjAP3t5weZAR6PLAhh1TNrlI2Hbyh6AOVwtOXUds4kr3VBEQZCl5ZBnsO7zdKkFNaQmsHdQOsmhbeVRrmmXfA0wupuZBHTmzPnwDZBzK85N0RawCNfz6FhZBHOlzZBktryHijQyBD9MLPVrgP1GoRP1pCWwZD";

  try {
    // We update system_settings using raw query to avoid complex schema imports right now
    await client`
      INSERT INTO system_settings (key, value)
      VALUES 
        ('INSTAGRAM_ACCESS_TOKEN', ${JSON.stringify(NEW_TOKEN)}),
        ('FACEBOOK_ACCESS_TOKEN', ${JSON.stringify(NEW_TOKEN)})
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
