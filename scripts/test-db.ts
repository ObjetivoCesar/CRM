import { db, schema } from '@/lib/db';

async function testDatabase() {
    console.log('🧪 Testing Local Database...');

    try {
        // 1. Insert a test lead
        const testLead = {
            businessName: 'Hotel de Prueba',
            contactName: 'Juan Pérez',
            phone: '0991234567',
            email: 'juan@hotelprueba.com',
            city: 'Quito',
            businessType: 'Hotel',
            outreachStatus: 'new',
            notes: 'Lead de prueba generado automáticamente',
        };

        console.log('📝 Inserting test lead:', testLead.businessName);
        const result = await db.insert(schema.leads).values(testLead).returning();
        const insertedId = result[0].id;
        console.log('✅ Lead inserted with ID:', insertedId);

        // 2. Query the lead back
        console.log('🔍 Querying lead...');
        const leads = await db.select().from(schema.leads);
        console.log(`✅ Found ${leads.length} leads in database.`);

        const found = leads.find(l => l.id === insertedId);
        if (found) {
            console.log('✅ Verified inserted lead:', found.businessName);
        } else {
            console.error('❌ Could not find inserted lead!');
        }

        // 3. Count new leads (simulating dashboard metric)
        console.log('📊 Testing count query...');
        // We can't use the API logic directly here easily without mocking, but we can check the DB state
        // which the API reads.

    } catch (error) {
        console.error('❌ Database test failed:', error);
    }
}

testDatabase();
