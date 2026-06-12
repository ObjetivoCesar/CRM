// @ts-nocheck
import { db } from './lib/db';
import { sql } from 'drizzle-orm';

async function testSchema() {
    try {
        console.log('🔍 Checking columns in "pending_messages_queue"...');
        
        console.log('Adding "failed_at" if it does not exist...');
        await db.execute(sql`ALTER TABLE pending_messages_queue ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;`);
        
        console.log('Adding "retry_count" if it does not exist...');
        await db.execute(sql`ALTER TABLE pending_messages_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;`);
        
        console.log('✅ Schema migration complete!');
    } catch (error) {
        console.error('❌ Error testing/updating schema:', error);
    } finally {
        process.exit(0);
    }
}

testSchema();
