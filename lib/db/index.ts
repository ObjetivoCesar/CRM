import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection
const connectionString = process.env.DATABASE_URL!;

// For direct connection (port 5432) or PGBouncer (6543)
// Nota: prepare:false + pooler causa ECONNRESET localmente.
// En producción (Vercel/Render) funciona sin prepare:false porque el driver
// maneja prepared statements contra Supabase sin problemas.
const client = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

export * as schema from './schema';
export const db = drizzle(client, { schema });
