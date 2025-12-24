const { createClient } = require('@libsql/client');
const path = require('path');

async function check() {
    const dbPath = path.join(process.cwd(), 'data', 'crm.db');
    console.log('Connecting to DB at:', dbPath);

    const client = createClient({
        url: `file:${dbPath}`,
    });

    try {
        const result = await client.execute("SELECT count(*) as count FROM leads");
        console.log('Total leads:', result.rows[0].count);

        const leads = await client.execute("SELECT business_name FROM leads LIMIT 5");
        console.log('Sample leads:', leads.rows);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.close();
    }
}

check();
