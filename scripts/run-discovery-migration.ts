import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function runMigration() {
    try {
        const sqlPath = path.join(process.cwd(), 'docs', 'add_discovery_tagging_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log('Executing SQL migration...');
        console.log(sql);

        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(s => s.trim().length > 0);

        for (const statement of statements) {
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
            if (error) {
                console.error('Error executing statement:', error);
                console.log('Statement:', statement);
            } else {
                console.log('✅ Statement executed successfully');
            }
        }

        console.log('\n✅ Migration completed!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

runMigration();
