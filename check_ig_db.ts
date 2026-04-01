import path from 'path';
import 'dotenv/config';
import { db } from './lib/db';
import { pendingMessagesQueue, interactions } from './lib/db/schema';
import { desc, eq, gt } from 'drizzle-orm';

async function checkInstagramMessages() {
  console.log('--- LATEST INSTAGRAM QUEUE MESSAGES ---');
  const qMessages = await db.select()
    .from(pendingMessagesQueue)
    .where(eq(pendingMessagesQueue.platform, 'instagram'))
    .orderBy(desc(pendingMessagesQueue.createdAt))
    .limit(5);
  
  console.table(qMessages.map(m => ({
    id: m.id,
    type: m.type,
    status: m.status,
    createdAt: m.createdAt,
    payloadSnippet: JSON.stringify(m.payload).substring(0, 50) + '...'
  })));

  console.log('\n--- LATEST INSTAGRAM INTERACTIONS ---');
  const iMessages = await db.select()
    .from(interactions)
    .where(eq(interactions.platform, 'instagram'))
    .orderBy(desc(interactions.createdAt))
    .limit(5);
    
  console.table(iMessages.map(i => ({
    id: i.id,
    type: i.type,
    direction: i.direction,
    messageSnippet: i.content ? i.content.substring(0, 50) + '...' : null,
    createdAt: i.createdAt
  })));
  
  process.exit(0);
}

checkInstagramMessages().catch(console.error);
