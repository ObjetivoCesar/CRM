/**
 * ficha_cliente_junio.ts
 * Muestra los top 5 clientes con más interacción en junio 2026
 * incluyendo su ficha completa de conversation_states.
 *
 * Uso: npx tsx scripts/ficha_cliente_junio.ts
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
});

async function main() {
  // Top 5 chats activos en junio 2026
  const chats = await sql<{
    chat_id: string;
    total_msgs: number;
    primer_msg: Date;
    ultimo_msg: Date;
    contact_name: string | null;
    business_name: string | null;
    entity_type: string | null;
    ficha_raw: string | null;
  }[]>`
    SELECT
      m.chat_id,
      COUNT(*)::int            AS total_msgs,
      MIN(m.message_timestamp) AS primer_msg,
      MAX(m.message_timestamp) AS ultimo_msg,
      c.contact_name,
      c.business_name,
      c.entity_type,
      cs.data                  AS ficha_raw
    FROM donna_chat_messages m
    LEFT JOIN contacts c
           ON c.phone = m.chat_id
    LEFT JOIN conversation_states cs
           ON cs.key = m.chat_id
    WHERE m.message_timestamp >= '2026-06-01'
      AND m.role IN ('user', 'assistant')
    GROUP BY m.chat_id, c.contact_name, c.business_name, c.entity_type, cs.data
    ORDER BY total_msgs DESC
    LIMIT 5
  `;

  if (chats.length === 0) {
    console.log('⚠️  No hay mensajes en junio 2026.');
    await sql.end();
    return;
  }

  const ec = (d: Date) =>
    new Date(d).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  let idx = 1;
  for (const chat of chats) {
    const ficha = chat.ficha_raw ? (() => {
      try { return JSON.parse(chat.ficha_raw!); } catch { return null; }
    })() : null;

    console.log(`\n${'═'.repeat(56)}`);
    console.log(`  CLIENTE #${idx}  —  ${chat.contact_name || ficha?.nombre || '(sin nombre)'}`);
    console.log('═'.repeat(56));
    console.log(`📱 Número      : ${chat.chat_id}`);
    console.log(`🏢 Negocio     : ${chat.business_name || ficha?.negocio || '—'}`);
    console.log(`🏷️  Tipo        : ${chat.entity_type || '—'}`);
    console.log(`💬 Msgs junio  : ${chat.total_msgs}`);
    console.log(`🕐 Primer msg  : ${ec(chat.primer_msg)}`);
    console.log(`🕐 Último msg  : ${ec(chat.ultimo_msg)}`);

    if (ficha) {
      console.log('\n  ── FICHA DONNA ──────────────────────────────────');
      console.log(`  Nombre        : ${ficha.nombre || '—'}`);
      console.log(`  Rubro         : ${ficha.rubro || '—'}`);
      console.log(`  Ciudad        : ${ficha.ciudad || '—'}`);
      console.log(`  Temperamento  : ${ficha.temperamento || '—'} (${ficha.temperamento_confianza || '—'})`);
      console.log(`  Producto      : ${ficha.producto_interes || ficha.producto_detectado || '—'}`);
      console.log(`  Agente activo : ${ficha.agente_activo || '—'}`);
      console.log(`  Acepto LOPDP  : ${ficha.acepto_proteccion ? '✅ Sí' : '❌ No'}`);
      console.log(`  Fuente origen : ${ficha.fuente_origen || '—'}`);
      console.log(`  Campaña Ad    : ${ficha.campana_ad || '—'}`);

      if (ficha.dolores?.length) {
        console.log(`  Dolores       : ${(ficha.dolores as string[]).join(' | ')}`);
      }
      if (ficha.objeciones?.length) {
        console.log(`  Objeciones    : ${(ficha.objeciones as string[]).join(' | ')}`);
      }
      if (ficha.sesion) {
        console.log('\n  ── SESIÓN ───────────────────────────────────────');
        console.log(`  Onboarding OK : ${ficha.sesion.onboarding_completado ? '✅' : '❌'}`);
        console.log(`  Paso OB       : ${ficha.sesion.paso_onboarding ?? '—'}`);
        console.log(`  Bot pausado   : ${ficha.sesion.bot_pausado ? '⏸️ Sí' : 'No'}`);
        console.log(`  Etiqueta forz.: ${ficha.sesion.etiqueta_forzada || '—'}`);
      }
    } else {
      console.log('\n  ⚠️  Sin ficha en conversation_states');
    }

    idx++;
  }

  console.log(`\n${'═'.repeat(56)}\n`);
  await sql.end();
}

main().catch(err => {
  console.error('❌', err.message);
  sql.end();
  process.exit(1);
});
