/**
 * export_conversations_excel.ts
 * ─────────────────────────────────────────────────────────────────
 * Exporta TODOS los mensajes de WhatsApp (entrada + salida) a Excel.
 * Tablas: donna_chat_messages + conversation_states + contacts
 *
 * Uso:
 *   npx tsx scripts/export_conversations_excel.ts
 *   npx tsx scripts/export_conversations_excel.ts --desde 2026-06-01
 *   npx tsx scripts/export_conversations_excel.ts --numero 593XXXXXXXXX
 *
 * Salida:
 *   exports/conversaciones_YYYY-MM-DD.xlsx
 * ─────────────────────────────────────────────────────────────────
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

// ── Args opcionales ──────────────────────────────────────────────
const args = process.argv.slice(2);
const desdeIdx = args.indexOf('--desde');
const numeroIdx = args.indexOf('--numero');
const DESDE = desdeIdx >= 0 ? args[desdeIdx + 1] : null;
const SOLO_NUMERO = numeroIdx >= 0 ? args[numeroIdx + 1] : null;

// ── DB ───────────────────────────────────────────────────────────
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
});

// ── Tipos ────────────────────────────────────────────────────────
interface Mensaje {
  chat_id: string;
  role: string;
  content: string;
  platform: string;
  message_timestamp: Date;
  // Desde contacts (puede ser null)
  contact_name: string | null;
  business_name: string | null;
  entity_type: string | null;
  // Desde conversation_states (ficha)
  ficha_nombre: string | null;
  ficha_rubro: string | null;
  ficha_temperamento: string | null;
  ficha_producto_interes: string | null;
  ficha_acepto_proteccion: boolean | null;
  ficha_agente_activo: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────
function rol(role: string): string {
  return role === 'user' ? '👤 Cliente' : role === 'assistant' ? '🤖 Ale' : '⚙️ Sistema';
}

function fecha(d: Date): string {
  return new Date(d).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Extrae JSON de la ficha guardada en conversation_states.data
function parseFicha(data: string | null): Record<string, any> {
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Iniciando exportación de conversaciones...\n');

  // 1. Cargar fichas (conversation_states) — una por chat_id
  console.log('📂 Cargando fichas de clientes (conversation_states)...');
  const fichas = await sql<{ key: string; data: string }[]>`
    SELECT key, data FROM conversation_states
  `;
  const fichaMap = new Map<string, Record<string, any>>();
  for (const f of fichas) {
    fichaMap.set(f.key, parseFicha(f.data));
  }
  console.log(`   ✅ ${fichaMap.size} fichas cargadas.`);

  // 2. Cargar mensajes con JOIN a contacts
  console.log('💬 Cargando mensajes de donna_chat_messages...');
  
  let mensajes: any[];
  
  if (SOLO_NUMERO) {
    mensajes = await sql`
      SELECT 
        m.chat_id,
        m.role,
        m.content,
        m.platform,
        m.message_timestamp,
        c.contact_name,
        c.business_name,
        c.entity_type
      FROM donna_chat_messages m
      LEFT JOIN contacts c ON c.phone = m.chat_id
      WHERE m.chat_id = ${SOLO_NUMERO}
        AND m.role IN ('user', 'assistant')
      ORDER BY m.message_timestamp ASC
    `;
  } else if (DESDE) {
    mensajes = await sql`
      SELECT 
        m.chat_id,
        m.role,
        m.content,
        m.platform,
        m.message_timestamp,
        c.contact_name,
        c.business_name,
        c.entity_type
      FROM donna_chat_messages m
      LEFT JOIN contacts c ON c.phone = m.chat_id
      WHERE m.role IN ('user', 'assistant')
        AND m.message_timestamp >= ${DESDE}::date
      ORDER BY m.message_timestamp ASC
    `;
  } else {
    mensajes = await sql`
      SELECT 
        m.chat_id,
        m.role,
        m.content,
        m.platform,
        m.message_timestamp,
        c.contact_name,
        c.business_name,
        c.entity_type
      FROM donna_chat_messages m
      LEFT JOIN contacts c ON c.phone = m.chat_id
      WHERE m.role IN ('user', 'assistant')
      ORDER BY m.message_timestamp ASC
    `;
  }

  console.log(`   ✅ ${mensajes.length} mensajes encontrados.`);

  if (mensajes.length === 0) {
    console.log('\n⚠️  No hay mensajes para exportar. Verifica que el bot haya procesado conversaciones.');
    await sql.end();
    return;
  }

  // 3. Calcular estadísticas por chat
  const chatStats = new Map<string, { total: number; usuario: number; bot: number; inicio: Date; fin: Date }>();
  for (const m of mensajes) {
    const stats = chatStats.get(m.chat_id) || { total: 0, usuario: 0, bot: 0, inicio: m.message_timestamp, fin: m.message_timestamp };
    stats.total++;
    if (m.role === 'user') stats.usuario++;
    if (m.role === 'assistant') stats.bot++;
    if (new Date(m.message_timestamp) < new Date(stats.inicio)) stats.inicio = m.message_timestamp;
    if (new Date(m.message_timestamp) > new Date(stats.fin)) stats.fin = m.message_timestamp;
    chatStats.set(m.chat_id, stats);
  }

  // 4. Crear el Excel
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ActivaQR CRM — Ale';
  wb.created = new Date();

  // ══════════════════════════════════════════════════
  // HOJA 1: Mensajes completos
  // ══════════════════════════════════════════════════
  const wsMensajes = wb.addWorksheet('💬 Conversaciones', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF4285F4' } },
  });

  wsMensajes.columns = [
    { header: 'Fecha/Hora (EC)', key: 'fecha', width: 20 },
    { header: 'Número WhatsApp', key: 'chat_id', width: 18 },
    { header: 'Nombre Contacto', key: 'nombre', width: 22 },
    { header: 'Negocio', key: 'negocio', width: 22 },
    { header: 'Rubro (Ficha)', key: 'rubro', width: 18 },
    { header: 'Rol', key: 'rol', width: 14 },
    { header: 'Mensaje', key: 'content', width: 70 },
    { header: 'Plataforma', key: 'platform', width: 14 },
    { header: 'Producto Interés', key: 'producto', width: 20 },
    { header: 'Agente Activo', key: 'agente', width: 16 },
    { header: 'Temperamento', key: 'temperamento', width: 16 },
    { header: 'Aceptó LOPDP', key: 'lopdp', width: 14 },
  ];

  // Estilo del encabezado
  const headerRow = wsMensajes.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF0D47A1' } },
    };
  });
  headerRow.height = 28;

  // Colores alternos por chat_id
  const chatColors = new Map<string, string>();
  const palette = ['FFFE8F00', 'FFFF6D00', 'FF00796B', 'FF5E35B1', 'FF1565C0', 'FF2E7D32'];
  let colorIdx = 0;
  
  let rowNum = 2;
  for (const m of mensajes) {
    const ficha = fichaMap.get(m.chat_id) || {};
    
    if (!chatColors.has(m.chat_id)) {
      chatColors.set(m.chat_id, palette[colorIdx % palette.length]);
      colorIdx++;
    }

    const isBot = m.role === 'assistant';
    
    const row = wsMensajes.addRow({
      fecha: fecha(m.message_timestamp),
      chat_id: m.chat_id,
      nombre: m.contact_name || ficha.nombre || '—',
      negocio: m.business_name || '—',
      rubro: ficha.rubro || '—',
      rol: rol(m.role),
      content: m.content,
      platform: m.platform || 'whatsapp',
      producto: ficha.producto_interes || ficha.producto_detectado || '—',
      agente: ficha.agente_activo || '—',
      temperamento: ficha.temperamento || '—',
      lopdp: ficha.acepto_proteccion ? '✅ Sí' : '❌ No',
    });

    // Colorear según rol
    row.eachCell((cell, colNumber) => {
      if (isBot) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }; // Verde claro — bot
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }; // Blanco — usuario
      }
      cell.alignment = { vertical: 'top', wrapText: colNumber === 7 }; // wrap solo en col Mensaje
      cell.font = { size: 10 };
    });

    row.height = 30;
    rowNum++;
  }

  // ══════════════════════════════════════════════════
  // HOJA 2: Resumen por número (una fila por chat)
  // ══════════════════════════════════════════════════
  const wsResumen = wb.addWorksheet('📊 Resumen por Número', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF34A853' } },
  });

  wsResumen.columns = [
    { header: 'Número WhatsApp', key: 'chat_id', width: 20 },
    { header: 'Nombre', key: 'nombre', width: 22 },
    { header: 'Negocio', key: 'negocio', width: 22 },
    { header: 'Rubro', key: 'rubro', width: 18 },
    { header: 'Ciudad', key: 'ciudad', width: 16 },
    { header: 'Temperamento', key: 'temperamento', width: 16 },
    { header: 'Producto Interés', key: 'producto', width: 20 },
    { header: 'Agente Final', key: 'agente', width: 16 },
    { header: 'Aceptó LOPDP', key: 'lopdp', width: 14 },
    { header: 'Dolores', key: 'dolores', width: 35 },
    { header: 'Objeciones', key: 'objeciones', width: 35 },
    { header: 'Total Mensajes', key: 'total', width: 16 },
    { header: 'Mensajes Cliente', key: 'usuario', width: 18 },
    { header: 'Mensajes Bot', key: 'bot', width: 16 },
    { header: 'Primer Mensaje', key: 'inicio', width: 20 },
    { header: 'Último Mensaje', key: 'fin', width: 20 },
  ];

  // Header style
  const headerRow2 = wsResumen.getRow(1);
  headerRow2.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F9D58' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow2.height = 28;

  // Obtener set de chat_ids únicos preservando orden de primera aparición
  const chatIdsOrdenados: string[] = [];
  const chatIdSet = new Set<string>();
  for (const m of mensajes) {
    if (!chatIdSet.has(m.chat_id)) {
      chatIdsOrdenados.push(m.chat_id);
      chatIdSet.add(m.chat_id);
    }
  }

  // Obtener último contacto por chat_id para nombre/negocio
  const contactoMap = new Map<string, { contact_name: string | null; business_name: string | null }>();
  for (const m of mensajes) {
    if (!contactoMap.has(m.chat_id)) {
      contactoMap.set(m.chat_id, { contact_name: m.contact_name, business_name: m.business_name });
    }
  }

  let resumenRow = 2;
  for (const chatId of chatIdsOrdenados) {
    const ficha = fichaMap.get(chatId) || {};
    const stats = chatStats.get(chatId)!;
    const contacto = contactoMap.get(chatId) || { contact_name: null, business_name: null };

    const dolores = Array.isArray(ficha.dolores) ? ficha.dolores.join(' | ') : (ficha.dolores || '—');
    const objeciones = Array.isArray(ficha.objeciones) ? ficha.objeciones.join(' | ') : (ficha.objeciones || '—');

    const row = wsResumen.addRow({
      chat_id: chatId,
      nombre: contacto.contact_name || ficha.nombre || '—',
      negocio: contacto.business_name || '—',
      rubro: ficha.rubro || '—',
      ciudad: ficha.ciudad || '—',
      temperamento: ficha.temperamento || '—',
      producto: ficha.producto_interes || ficha.producto_detectado || '—',
      agente: ficha.agente_activo || '—',
      lopdp: ficha.acepto_proteccion ? '✅ Sí' : '❌ No',
      dolores,
      objeciones,
      total: stats.total,
      usuario: stats.usuario,
      bot: stats.bot,
      inicio: fecha(stats.inicio),
      fin: fecha(stats.fin),
    });

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.font = { size: 10 };
    });

    // Alternar filas
    if (resumenRow % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } };
      });
    }

    row.height = 25;
    resumenRow++;
  }

  // ══════════════════════════════════════════════════
  // HOJA 3: Pares de entrenamiento (Input → Output)
  // Formato ideal para afinar el prompt de Ale
  // ══════════════════════════════════════════════════
  const wsTraining = wb.addWorksheet('🎓 Entrenamiento Ale', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FFEA4335' } },
  });

  wsTraining.columns = [
    { header: 'Número', key: 'chat_id', width: 18 },
    { header: 'Rubro', key: 'rubro', width: 18 },
    { header: 'Temperamento', key: 'temp', width: 16 },
    { header: 'Agente', key: 'agente', width: 14 },
    { header: 'Mensaje Cliente (INPUT)', key: 'input', width: 60 },
    { header: 'Respuesta Ale (OUTPUT)', key: 'output', width: 60 },
    { header: 'Fecha', key: 'fecha', width: 18 },
  ];

  const headerRow3 = wsTraining.getRow(1);
  headerRow3.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA4335' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow3.height = 28;

  // Generar pares: cada mensaje de usuario seguido de la respuesta del bot
  for (let i = 0; i < mensajes.length - 1; i++) {
    const curr = mensajes[i];
    const next = mensajes[i + 1];
    
    // Solo pares del mismo chat: usuario → bot
    if (curr.role === 'user' && next.role === 'assistant' && curr.chat_id === next.chat_id) {
      const ficha = fichaMap.get(curr.chat_id) || {};
      const row = wsTraining.addRow({
        chat_id: curr.chat_id,
        rubro: ficha.rubro || '—',
        temp: ficha.temperamento || '—',
        agente: ficha.agente_activo || '—',
        input: curr.content,
        output: next.content,
        fecha: fecha(curr.message_timestamp),
      });

      row.eachCell((cell, col) => {
        cell.alignment = { vertical: 'top', wrapText: col === 5 || col === 6 };
        cell.font = { size: 10 };
      });
      row.height = 35;
    }
  }

  // 5. Guardar el archivo
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const hoy = new Date().toISOString().slice(0, 10);
  const sufijo = SOLO_NUMERO ? `_${SOLO_NUMERO}` : DESDE ? `_desde_${DESDE}` : '';
  const filePath = path.join(exportDir, `conversaciones_${hoy}${sufijo}.xlsx`);

  await wb.xlsx.writeFile(filePath);

  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ EXPORTACIÓN COMPLETADA');
  console.log('══════════════════════════════════════════════════');
  console.log(`📁 Archivo: ${filePath}`);
  console.log(`💬 Total mensajes: ${mensajes.length}`);
  console.log(`👥 Chats únicos: ${chatIdsOrdenados.length}`);
  console.log(`📊 Hoja 1: Conversaciones completas`);
  console.log(`📊 Hoja 2: Resumen por número (${chatIdsOrdenados.length} filas)`);
  console.log(`📊 Hoja 3: Pares de entrenamiento para Ale`);
  console.log('══════════════════════════════════════════════════\n');

  await sql.end();
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  sql.end();
  process.exit(1);
});
