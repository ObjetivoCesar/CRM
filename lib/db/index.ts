import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection
const connectionString = process.env.DATABASE_URL!;

// For direct connection (port 5432), we can use prepare
const client = postgres(connectionString);

export * as schema from './schema';
export const db = drizzle(client, { schema });
