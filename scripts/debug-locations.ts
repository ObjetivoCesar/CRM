
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load env vars
config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLocations() {
    console.log('🔍 Checking distinct provinces in DB...');

    // We cannot use .select('distinct provincia') directly with supabase easily without rpc or tricky syntax in some versions,
    // but .select('provincia') with a transform or just fetching a chunk is fine for debugging.
    // Better: let's try to get a decent sample or use a hack if the dataset is huge.
    // Actually, let's just fetch 1000 rows and see the unique values. It's not exhaustive but likely covers the problem.
    // OR: use the direct Postgres if possible. But `import-discovery-leads-robust.ts` succeeded, so supabase client works.

    const { data, error } = await supabase
        .from('discovery_leads')
        .select('provincia')
        .limit(2000); // Fetch a good chunk

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data found in discovery_leads');
        return;
    }

    const uniqueProvinces = new Set(data.map(d => d.provincia).filter(Boolean));
    const sortedProvinces = Array.from(uniqueProvinces).sort();

    console.log('✅ Unique Provinces Found (Sampled):');
    sortedProvinces.forEach(p => console.log(`"${p}"`));

    // Specifically check for our missing friends
    console.log('\n🔍 Specific Checks:');
    const problemChildren = sortedProvinces.filter(p =>
        (p && p.toUpperCase().includes('SANTO')) ||
        (p && p.toUpperCase().includes('SUCUM'))
    );
    console.log('Matches for Santo/Sucum:', problemChildren);
}

checkLocations();
