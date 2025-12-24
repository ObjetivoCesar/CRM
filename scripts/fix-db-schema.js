const { createClient } = require('@libsql/client');
const path = require('path');

async function fixSchema() {
    const dbPath = path.join(process.cwd(), 'data', 'crm.db');
    console.log('Connecting to DB at:', dbPath);

    const client = createClient({
        url: `file:${dbPath}`,
    });

    try {
        console.log('Adding status column...');
        await client.execute("ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'nuevo'");
        console.log('✅ Column status added.');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('⚠️ Column status already exists.');
        } else {
            console.error('❌ Error adding column:', e.message);
        }
    } finally {
        client.close();
    }
}

fixSchema();
