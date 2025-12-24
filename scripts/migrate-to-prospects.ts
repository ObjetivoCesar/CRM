import { createClient } from '@libsql/client';
import path from 'path';

async function migrateToProspects() {
    const dbPath = path.join(process.cwd(), 'data', 'crm.db');
    const client = createClient({ url: `file:${dbPath}` });

    console.log('🔄 Starting migration...');

    try {
        // 1. Create prospects table
        console.log('📋 Creating prospects table...');
        await client.execute(`
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        city TEXT,
        province TEXT,
        business_type TEXT,
        outreach_status TEXT DEFAULT 'new',
        whatsapp_status TEXT DEFAULT 'pending',
        whatsapp_sent_at INTEGER,
        email_sequence_step INTEGER DEFAULT 0,
        last_email_sent_at INTEGER,
        next_follow_up INTEGER,
        is_newsletter_subscriber INTEGER DEFAULT 0,
        notes TEXT,
        source TEXT DEFAULT 'import',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

        // 2. Copy data from leads to prospects (only imported ones)
        console.log('📦 Migrating imported data to prospects...');
        await client.execute(`
      INSERT INTO prospects 
      SELECT 
        id, business_name, contact_name, phone, email, city, 
        NULL as province, business_type,
        'new' as outreach_status,
        'pending' as whatsapp_status,
        NULL as whatsapp_sent_at,
        0 as email_sequence_step,
        NULL as last_email_sent_at,
        NULL as next_follow_up,
        0 as is_newsletter_subscriber,
        notes, 'import' as source,
        created_at, updated_at
      FROM leads 
      WHERE source = 'import'
    `);

        const countResult = await client.execute('SELECT COUNT(*) as count FROM prospects');
        console.log(`✅ Migrated ${countResult.rows[0].count} records to prospects table`);

        // 3. Delete imported records from leads
        console.log('🗑️  Cleaning leads table...');
        await client.execute(`DELETE FROM leads WHERE source = 'import'`);

        const leadsResult = await client.execute('SELECT COUNT(*) as count FROM leads');
        console.log(`✅ Leads table now has ${leadsResult.rows[0].count} records (only from Recorridos)`);

        // 4. Create indices
        console.log('🔍 Creating indices...');
        await client.batch([
            `CREATE INDEX IF NOT EXISTS idx_prospects_outreach_status ON prospects(outreach_status)`,
            `CREATE INDEX IF NOT EXISTS idx_prospects_city ON prospects(city)`,
            `CREATE INDEX IF NOT EXISTS idx_prospects_province ON prospects(province)`,
        ], 'write');

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.close();
    }
}

migrateToProspects();
