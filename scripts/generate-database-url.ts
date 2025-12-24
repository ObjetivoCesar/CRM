/**
 * Este script genera la DATABASE_URL correcta para Drizzle
 * basándose en las credenciales de Supabase que ya tienes
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('📋 Información de Supabase:');
console.log('URL:', supabaseUrl);

// Extraer el project ID de la URL
const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (projectId) {
    console.log('Project ID:', projectId);
    console.log('\n🔧 Para completar la configuración, necesitas:');
    console.log('\n1. Tu DATABASE PASSWORD (la contraseña de la base de datos)');
    console.log('   - Si no la recuerdas, ve a Supabase Dashboard → Database Settings');
    console.log('   - Haz clic en "Reset database password"');
    console.log('\n2. Una vez tengas la password, añade esta línea a tu .env.local:');
    console.log('\nDATABASE_URL=postgresql://postgres.' + projectId + ':[TU_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1');
    console.log('\n⚠️  Reemplaza [TU_PASSWORD] con tu contraseña real');
    console.log('\n3. Reinicia el servidor: npm run dev');
} else {
    console.error('❌ No se pudo extraer el Project ID de la URL');
}
