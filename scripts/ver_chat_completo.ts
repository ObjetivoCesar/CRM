/**
 * ver_chat_completo.ts
 * Muestra el hilo completo de mensajes de un número específico
 *
 * Uso: npx tsx scripts/ver_chat_completo.ts 593982119165
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const numero = process.argv[2] || '593982119165';

  console.log(`\n🔍 Buscando conversación de: ${numero}\n`);

  // Mensajes completos
  const mensajes = await sql<{
    role: string;
    content: string;
    platform: string;
    message_timestamp: Date;
  }[]>`
    SELECT role, content, platform, message_timestamp
    FROM donna_chat_messages
    WHERE chat_id = ${numero}
    ORDER BY message_timestamp ASC
  `;

  if (mensajes.length === 0) {
    console.log('⚠️  No hay mensajes para este número.');
    await sql.end();
    return;
  }

  // Ficha (si existe)
  const fichaRow = await sql<{ data: string | null }[]>`
    SELECT data FROM conversation_states WHERE key = ${numero} LIMIT 1
  `;
  const ficha = fichaRow[0]?.data
    ? (() => { try { return JSON.parse(fichaRow[0].data!); } catch { return null; } })()
    : null;

  const ec = (d: Date) =>
    new Date(d).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  // Ficha
  console.log('═'.repeat(60));
  console.log('  FICHA DEL CLIENTE');
  console.log('═'.repeat(60));
  if (ficha) {
    console.log(JSON.stringify(ficha, null, 2));
  } else {
    console.log('⚠️  Sin ficha en conversation_states');
  }

  // Hilo
  console.log('\n' + '═'.repeat(60));
  console.log(`  CONVERSACIÓN (${mensajes.length} mensajes)`);
  console.log('═'.repeat(60));

  for (const m of mensajes) {
    const quien = m.role === 'user' ? '👤 Cliente' : '🤖 Ale   ';
    const hora  = ec(m.message_timestamp);
    const texto = m.content.length > 300 ? m.content.substring(0, 300) + '…' : m.content;
    console.log(`\n[${hora}] ${quien}`);
    console.log(`  ${texto.replace(/\n/g, '\n  ')}`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
  await sql.end();
}

main().catch(err => {
  console.error('❌', err.message);
  sql.end();
  process.exit(1);
});
