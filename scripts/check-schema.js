const { createClient } = require('@libsql/client');
const path = require('path');

async function checkSchema() {
    const dbPath = path.join(process.cwd(), 'data', 'crm.db');
    const client = createClient({ url: `file:${dbPath}` });

    try {
        const result = await client.execute("PRAGMA table_info(leads)");
        console.log('Columns in leads table:');
        result.rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.close();
    }
}

checkSchema();
