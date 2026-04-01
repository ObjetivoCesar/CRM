// Script directo para actualizar el token de Instagram en la base de datos
// Ejecutar con: node --env-file=.env.local tmp/update-instagram-token.mjs

import postgres from 'postgres';

const TOKEN = 'EAASfXJZBBSPkBRFSAzfdmW2lCEkTtBljHELWVAFIkhACupIZAJdhvJbTfMMAZAdUmsIpZCInD20spOLyEaEhN0O3HCdBQ4K9JLemlWpN0oPSt5xyUTAe9zqBtnPgDQGS6ZAQji2aZAKNOpB9yZCIsZCOQMWPfyyCXQUyRFdpKXOS1EaVZC9KrB6rrIrJaAZBMMe4NLuJRUAS73OZAPQaWH8GPADqNUtod3KadQZBMXJz5YF5PbMEXoc1rflOT6ZA8Ik7hZApO7G62U3IwrbtTx1VUTuFWDNXgqYqTUc3XrnrmBIWIZD';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

try {
    console.log('🔄 Actualizando token de Instagram en la base de datos...');
    
    // Primero ver qué hay en la base de datos
    const current = await sql`SELECT key, value FROM system_settings WHERE key = 'instagram_config' LIMIT 1`;
    
    if (current.length > 0) {
        console.log('📌 Config actual encontrada, actualizando token...');
        const currentValue = current[0].value || {};
        const newValue = { ...currentValue, accessToken: TOKEN };
        
        await sql`
            UPDATE system_settings 
            SET value = ${JSON.stringify(newValue)}::jsonb, updated_at = NOW()
            WHERE key = 'instagram_config'
        `;
        console.log('✅ Token actualizado exitosamente en registro existente.');
    } else {
        console.log('📌 No hay config previa, creando nueva...');
        await sql`
            INSERT INTO system_settings (key, value)
            VALUES ('instagram_config', ${JSON.stringify({ accessToken: TOKEN })}::jsonb)
        `;
        console.log('✅ Token guardado en nueva entrada.');
    }
    
    // Verificar
    const verify = await sql`SELECT value FROM system_settings WHERE key = 'instagram_config'`;
    const saved = verify[0]?.value?.accessToken;
    if (saved) {
        console.log(`✅ Verificación exitosa. Token en DB: ${saved.slice(0, 10)}...${saved.slice(-4)}`);
    }

} catch (err) {
    console.error('❌ Error:', err.message);
} finally {
    await sql.end();
    process.exit(0);
}
