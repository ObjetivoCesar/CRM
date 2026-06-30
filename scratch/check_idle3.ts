import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const states = await sql`SELECT key, updated_at, data FROM conversation_states ORDER BY updated_at DESC LIMIT 5`;
        for (const state of states) {
            const parsed = typeof state.data === 'string' ? JSON.parse(state.data as string) : state.data;
            const ficha = parsed.ficha || parsed;
            console.log(`\nContact: ${state.key}`);
            console.log(`updated_at: ${state.updated_at}`);
            console.log(`ultimo_mensaje_at: ${ficha.sesion?.ultimo_mensaje_at}`);
            console.log(`alerta_inactividad_enviada: ${ficha.sesion?.alerta_inactividad_enviada}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
