/**
 * ActivaQR Brain — Cerebro de Ale
 * v1.0 · Función pura: recibe texto + ficha + historial → devuelve respuesta + ficha actualizada.
 *
 * ARQUITECTURA:
 *   Fase 0: Detección síncrona de temperamento (sin LLM)
 *   Fase 1: Clasificador+Razonador fusionado (1 LLM call)
 *   Fase 2: Barrera legal LOPDP (determinista, sin LLM)
 *   Fase 3: Agente experto (1 LLM call con skill inyectada)
 *
 * Total: 2 LLM calls por mensaje.
 * Cero dependencias de base de datos. Cero side effects.
 *
 * LOGGING:
 *   - Texto: logs/activaqr/brain-YYYY-MM-DD.log (legible para humanos)
 *   - JSONL: logs/activaqr/conversaciones.jsonl (estructurado para auditoría)
 */

import { getAIClient, getModelId } from '../ai/client';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════
// LOGGER — cada input/output queda registrado
// ═══════════════════════════════════════════

const LOG_DIR = path.join(process.cwd(), 'logs', 'activaqr');

function asegurarLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logFile(tipo: 'text' | 'jsonl' = 'text'): string {
  const hoy = new Date().toISOString().slice(0, 10);
  if (tipo === 'jsonl') return path.join(LOG_DIR, 'conversaciones.jsonl');
  return path.join(LOG_DIR, `brain-${hoy}.log`);
}

function escribirLog(entrada: string) {
  try {
    asegurarLogDir();
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile('text'), `[${timestamp}] ${entrada}\n`, 'utf-8');
  } catch (e) {
    console.warn('[ActivaQR-Log] Error escribiendo log:', (e as Error).message);
  }
}

/**
 * Escribe un registro estructurado en formato JSONL para auditoría.
 */
function escribirJsonl(entrada: Record<string, any>) {
  try {
    asegurarLogDir();
    const registro = { timestamp: new Date().toISOString(), ...entrada };
    fs.appendFileSync(logFile('jsonl'), JSON.stringify(registro) + '\n', 'utf-8');
  } catch (e) {
    console.warn('[ActivaQR-Log] Error escribiendo JSONL:', (e as Error).message);
  }
}

/**
 * Función principal de logging. Registra cualquier evento con su fase.
 */
function log(fase: string, telefono: string | undefined, mensaje: string, datos?: any) {
  const linea = `[${fase}] 📞${telefono || '???'} ${mensaje}`;
  console.log(`🧠 ${linea}`);
  if (datos) {
    const datosStr = typeof datos === 'string' ? datos : JSON.stringify(datos, null, 0).slice(0, 500);
    escribirLog(`${linea} | DATA: ${datosStr}`);
  } else {
    escribirLog(linea);
  }
}

// ═══════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════

export interface FichaCliente {
  numero?: string;
  nombre?: string;
  acepto_proteccion?: boolean;
  acepto_fecha?: string;
  contacto_humano_solicitado?: boolean;
  temperamento?: 'flematico' | 'sanguineo' | 'colerico' | 'melancolico';
  temperamento_confianza?: 'bajo' | 'medio' | 'alto';
  senales_temperamento?: string[];
  rubro?: string;
  dolores?: string[];
  nivel_digital?: string;
  herramientas_actuales?: string[];
  objetivo?: string;
  urgencia?: string;
  intencion_actual?: string;
  producto_interes?: string;
  producto_detectado?: string;
  intereses_historial?: Array<{ producto: string; fecha: string; fuente: string }>;
  objeciones?: string[];
  descubrimientos?: Array<{ fecha: string; tipo: string; texto: string }>;
  notas?: string;
  plan_contratado?: string;
  pago_recibido?: boolean;

  // Estado interno del orquestador
  sesion?: {
    onboarding_completado?: boolean;
    paso_onboarding?: number;
    bot_pausado?: boolean;
    paso_barrera?: number;
    mensaje_original?: any;
    intencion_barrera?: string;
    etiqueta_forzada?: string;
    mensajes_ilogicos?: number;
    baja_freeze_hasta?: string;
    ultimo_mensaje_at?: string; // ISO timestamp — para timeout de 30 min
  };
  ultimaInteraccion?: string; // ISO timestamp — para timeout de 30 min
  informador?: { contador: number; paso: number; producto_activo?: string };
  closer?: { contador: number; paso: number; plan_elegido?: string; esperandoConfirmacion?: boolean };
  soporte?: { contador: number; paso: number };
  contacto?: { contador: number; paso: number };
  agente_activo?: string;
  urgencia_compra?: boolean;
  producto_detectado_progreso?: string;
  historial?: { mensajes: Array<{ rol: string; texto: string }> };
  negociacion?: {
    fase_venta?: string;
    tier_seleccionado?: string;
    objeciones_activas?: string[];
  };
  [key: string]: any;
}

export interface MensajeHistorial {
  role: 'user' | 'assistant';
  content: string;
}

export interface ResultadoActivaQR {
  respuesta: string | null;
  nuevaFicha: FichaCliente;
  transferir: boolean;
  motivoTransferencia?: string;
}

// ═══════════════════════════════════════════
// TIMEOUT DE SESIÓN (30 min de inactividad)
// ═══════════════════════════════════════════

const TIMEOUT_SESION_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Verifica si la sesión expiró por inactividad y resetea el estado temporal.
 * Preserva: nombre, rubro, temperamento, dolores, producto_interes,
 *           acepto_proteccion, intereses_historial, onboarding.
 * Resetea: agente_activo, contadores, paso_barrera, etc.
 */
function checkSessionTimeout(ficha: FichaCliente, tel: string): FichaCliente {
  const ultimo = ficha.sesion?.ultimo_mensaje_at;
  if (!ultimo) return ficha; // Primera vez, no hay timeout

  const diff = Date.now() - new Date(ultimo).getTime();
  if (diff < TIMEOUT_SESION_MS) return ficha; // Dentro del plazo

  log('TIMEOUT', tel, `Sesión expirada (${Math.round(diff / 1000 / 60)} min de inactividad). Reseteando estado temporal.`);

  // ─── Preservar perfil ───
  const perfil = {
    nombre: ficha.nombre,
    rubro: ficha.rubro,
    temperamento: ficha.temperamento,
    temperamento_confianza: ficha.temperamento_confianza,
    senales_temperamento: ficha.senales_temperamento,
    dolores: ficha.dolores,
    producto_interes: ficha.producto_interes,
    producto_detectado: ficha.producto_detectado,
    acepto_proteccion: ficha.acepto_proteccion,
    acepto_fecha: ficha.acepto_fecha,
    intereses_historial: ficha.intereses_historial,
    descubrimientos: ficha.descubrimientos,
    notas: ficha.notas,
    objeciones: ficha.objeciones,
    nivel_digital: ficha.nivel_digital,
    herramientas_actuales: ficha.herramientas_actuales,
    objetivo: ficha.objetivo,
    urgencia: ficha.urgencia,
    negociacion: ficha.negociacion,
    // Onboarding se conserva
    sesion_onboarding_completado: ficha.sesion?.onboarding_completado,
    sesion_paso_onboarding: ficha.sesion?.paso_onboarding,
  };

  // ─── Resetear estado temporal ───
  ficha.agente_activo = undefined;
  ficha.informador = { contador: 0, paso: 0 };
  ficha.closer = { contador: 0, paso: 0 };
  ficha.soporte = undefined;
  ficha.contacto = undefined;
  ficha.urgencia_compra = false;
  ficha.producto_detectado_progreso = undefined;
  ficha.sesion = {
    onboarding_completado: perfil.sesion_onboarding_completado ?? true,
    paso_onboarding: perfil.sesion_paso_onboarding ?? 3,
    paso_barrera: 0,
    bot_pausado: false,
    mensajes_ilogicos: 0,
  };
  ficha.intencion_actual = undefined;

  // ─── Restaurar perfil ───
  ficha.nombre = perfil.nombre;
  ficha.rubro = perfil.rubro;
  ficha.temperamento = perfil.temperamento;
  ficha.temperamento_confianza = perfil.temperamento_confianza;
  ficha.senales_temperamento = perfil.senales_temperamento;
  ficha.dolores = perfil.dolores;
  ficha.producto_interes = perfil.producto_interes;
  ficha.producto_detectado = perfil.producto_detectado;
  ficha.acepto_proteccion = perfil.acepto_proteccion;
  ficha.acepto_fecha = perfil.acepto_fecha;
  ficha.intereses_historial = perfil.intereses_historial;
  ficha.descubrimientos = perfil.descubrimientos;
  ficha.notas = perfil.notas;
  ficha.objeciones = perfil.objeciones;
  ficha.nivel_digital = perfil.nivel_digital;
  ficha.herramientas_actuales = perfil.herramientas_actuales;
  ficha.objetivo = perfil.objetivo;
  ficha.urgencia = perfil.urgencia;
  ficha.negociacion = perfil.negociacion;

  escribirJsonl({
    tipo: 'timeout_sesion',
    numero: tel,
    minutos_inactivo: Math.round(diff / 1000 / 60),
    perfil_preservado: {
      nombre: perfil.nombre,
      rubro: perfil.rubro,
      temperamento: perfil.temperamento,
      producto_interes: perfil.producto_interes,
      acepto_proteccion: perfil.acepto_proteccion,
    }
  });

  return ficha;
}

// ═══════════════════════════════════════════
// PLANES Y PRODUCTOS (mapeo duro)
// ═══════════════════════════════════════════

const PLANES: Record<string, { nombre: string; precio: string; link: string; upsell?: string }> = {
  'contacto_digital': { nombre: 'Contacto Digital', precio: '$35/año', link: 'https://activaqr.com/registro?plan=digital&step=2' },
  'contacto digital': { nombre: 'Contacto Digital', precio: '$35/año', link: 'https://activaqr.com/registro?plan=digital&step=2' },
  'business': { nombre: 'Business', precio: '$100/año', link: 'https://activaqr.com/registro?plan=business&step=2' },
  'catalogo': { nombre: 'Business + Catálogo', precio: '$200/año', link: 'https://activaqr.com/registro?plan=catalogo&step=2', upsell: '$150 pasarela de pagos opcional' },
  'catálogo': { nombre: 'Business + Catálogo', precio: '$200/año', link: 'https://activaqr.com/registro?plan=catalogo&step=2', upsell: '$150 pasarela de pagos opcional' },
  'tienda': { nombre: 'Tienda en Línea', precio: '$1.000', link: 'https://activaqr.com/registro?plan=completo&step=2' },
  'auditoria': { nombre: 'Auditoría Operativa', precio: '$100/año', link: 'https://activaqr.com/registro?plan=auditoria&step=2' },
  'auditoría': { nombre: 'Auditoría Operativa', precio: '$100/año', link: 'https://activaqr.com/registro?plan=auditoria&step=2' },
  'blindaje': { nombre: 'Blindaje Legal LOPDP', precio: '$300 setup + $15/mes', link: 'https://activaqr.com/registro?plan=blindaje&step=2' },
  'estados': { nombre: 'Ventas por Estados de WhatsApp', precio: '$15/mes o $130/año', link: 'https://activaqr.com/registro?plan=estados&step=2' },
};

// ═══════════════════════════════════════════
// FASE 0: TEMPERAMENTO SÍNCRONO (sin LLM)
// ═══════════════════════════════════════════

/**
 * Detecta el temperamento del cliente analizando el texto.
 * Migrado 1:1 de informador.js → detectarTemperamentoTemprano().
 * Si confianza ya es 'alto', no re-analiza.
 */
function detectarTemperamentoTemprano(texto: string, ficha: FichaCliente): FichaCliente {
  if (ficha.temperamento_confianza === 'alto') return ficha;

  const t = texto.toLowerCase();
  const senales: Array<{ tipo: string; senal: string }> = [];

  // Señales sanguíneo
  if (/[!]{1,}/.test(texto)) senales.push({ tipo: 'sanguineo', senal: 'usa exclamaciones' });
  if (/😊|😃|🔥|❤️|✅|👍/.test(texto)) senales.push({ tipo: 'sanguineo', senal: 'usa emojis' });
  if (texto.split(' ').length > 15) senales.push({ tipo: 'sanguineo', senal: 'escribe largo con contexto extra' });

  // Señales flemático
  if (texto.split(' ').length < 6 && senales.length === 0) senales.push({ tipo: 'flematico', senal: 'escribe muy corto' });
  if (/^[^!?]*$/.test(texto) && texto.length < 40) senales.push({ tipo: 'flematico', senal: 'sin signos de emoción' });

  // Señales colérico
  if (/ahora mismo|de inmediato|urgente|necesito ya|cuánto cuesta ya|dígame el precio/i.test(t)) {
    senales.push({ tipo: 'colerico', senal: 'urgencia imperativa' });
    senales.push({ tipo: 'colerico', senal: 'urgencia imperativa (peso doble)' });
  }
  if (/necesito|quiero saber|cuánto es|es serio|para qué sirve exactamente|qué garantía/i.test(t)) {
    senales.push({ tipo: 'colerico', senal: 'tono evaluador o imperativo' });
  }
  if (/varias sucursales|cadena|empresa grande|corporativo|franquicia|varios locales/i.test(t)) {
    senales.push({ tipo: 'colerico', senal: 'menciona escala o poder' });
    senales.push({ tipo: 'colerico', senal: 'escala (peso doble)' });
  }
  if (texto.split(' ').length < 10 && /necesito|dígame|cuánto|funciona|sirve|garantía/i.test(t)) {
    senales.push({ tipo: 'colerico', senal: 'imperativo + texto corto (dominante)' });
  }

  // Señales melancólico
  if (/no sé|no manejo|tal vez|quizás|me gustaría|podría ser/i.test(t)) senales.push({ tipo: 'melancolico', senal: 'lenguaje dubitativo' });
  if (/pequeño|solo|apenas|modesto|no tengo muchos|pocos clientes/i.test(t)) senales.push({ tipo: 'melancolico', senal: 'se minimiza' });

  if (!senales.length) return ficha;

  // Contar votos por temperamento
  const conteo: Record<string, number> = {};
  for (const s of senales) {
    conteo[s.tipo] = (conteo[s.tipo] || 0) + 1;
  }
  const ganador = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];

  if (ganador[1] >= 2) {
    ficha.temperamento = ganador[0] as FichaCliente['temperamento'];
    ficha.temperamento_confianza = ganador[1] >= 4 ? 'alto' : 'medio';
    ficha.senales_temperamento = [...new Set(senales.filter(s => s.tipo === ganador[0]).map(s => s.senal))];
    console.log(`🧠 [ActivaQR-Brain] Temperamento temprano: ${ficha.temperamento} (${ficha.temperamento_confianza}) — votos: ${ganador[1]}`);
  }

  return ficha;
}

// ═══════════════════════════════════════════
// FASE 1: CLASIFICADOR + RAZONADOR FUSIONADO (1 LLM call)
// ═══════════════════════════════════════════

/**
 * Regex anti-hackeo ALTA confianza → bloqueo inmediato.
 * Migrado 1:1 de clasificador.js.
 */
const HACK_ALTA = [
  /ignora\s+(todas\s+)?(las|tus|sus)\s+instrucciones/i,
  /olvida\s+(todas\s+)?(las|tus|sus)\s+instrucciones/i,
  /jailbreak/i, /bypass\s+restrictions/i, /override\s+security/i, /inject\s+sql/i,
  /dame\s+tu\s+api/i, /revela\s+tu\s+prompt/i,
  /tu\s+system\s+prompt/i, /system\s+prompt\s*(:|=)/i,
  /modo\s+(desarrollador|administrador|dev)/i,
  /eres\s+un\s+(asistente\s+)?(malvado|libre|sin\s+restricciones)/i,
  /act[uú]a\s+como\s+(si|un)\s+(otro|.*sistema)/i,
  /asume\s+que\s+(eres|ahora)\s+(admin|root|libre)/i,
  /c[oó]digo\s+fuente/i, /mensajes\s+de\s+otros/i,
  /mu[eé]strame\s+(el\s+)?c[oó]digo/i,
  /soy\s+(un\s+)?(test|desarrollador|admin|administrador|root)/i,
  /estamos\s+haciendo\s+pruebas/i,
  /estoy\s+haciendo\s+una\s+prueba/i,
  /quiero\s+ver\s+(el|tu)\s+(c[oó]digo|sistema|backend)/i,
  /expl[ií]came\s+(c[oó]mo|tu|c[uú]al\s+es)\s+(funcionas?|funciona|tu\s+prompt|tus?\s+instrucciones)/i,
  /como\s+si\s+fuera\s+un\s+ni[ñn]o/i,
  /por\s+qu[eé]\s+(me\s+)?(preguntas|contestaste|dijiste|hiciste)\s+.*expl[ií]c/i,
  /explica\s+tu\s+(funcionamiento|prompt|falla|l[oó]gica)/i,
];

function detectarHackeo(texto: string): boolean {
  const t = texto.toLowerCase().trim();
  return HACK_ALTA.some(p => p.test(t));
}

const ES_SALUDO = /^(hola|buenas|buenos\s+(d[ií]as|tardes|noches)|hey|hi|saludos|buen\s+d[ií]a|qu[eé]\s+tal|buenas\s+noches)[\s!.]*$/i;

function detectarSaludo(texto: string): boolean {
  return ES_SALUDO.test(texto.toLowerCase().trim());
}

const FRASES_BAJA = [
  "no me mandes más", "quiero darme de baja", "borra mis datos",
  "dame de baja", "ya no quiero recibir", "cancela mi suscripción",
  "no me contactes más", "elimíname", "quiero salir",
  "no quiero más información", "por favor no me escribas más",
  "eliminar mis datos", "no me mandes nada", "quiero cancelar",
  "déjame de contactar", "no me molestes más",
  "no deseo recibir más mensajes", "baja definitiva"
];

function detectarBaja(texto: string): boolean {
  const t = texto.toLowerCase().trim();
  if (t.includes('baja') && t.length < 15 && !t.includes('retenci')) return true;
  if (FRASES_BAJA.some(frase => t.includes(frase))) return true;
  if (/no\s+(me\s+)?(env[ií][eé]s?|mandes?|escribas?|contactes?|molestes?)\s*(m[aá]s)?/i.test(t)) return true;
  if (/no\s+quiero\s+(m[aá]s\s+)?(mensajes?|informaci[oó]n|que\s+me)/i.test(t)) return true;
  if (/no\s+deseo\s+(recibir|m[aá]s)/i.test(t)) return true;
  if (/simplemente\s+no\s+quiero/i.test(t)) return true;
  return false;
}

/**
 * Clasificador+Razonador fusionado vía LLM.
 * Una sola llamada que devuelve { categoria, producto_detectado, razonamiento, contexto, respuesta_directa }.
 */
async function clasificarYRazonar(
  texto: string,
  ficha: FichaCliente,
  historial: MensajeHistorial[]
): Promise<{
  categoria: string;
  producto_detectado: string | null;
  razonamiento: string;
  contexto: string;
  respuesta_directa: string | null;
  es_fuera_dominio: boolean;
  nombre_detectado: string | null;
  rubro_detectado: string | null;
}> {
  // Cargar prompt del clasificador desde skill
  let systemPrompt: string;
  try {
    const promptPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', 'activaqr_clasificador.md');
    systemPrompt = fs.readFileSync(promptPath, 'utf-8');
  } catch {
    systemPrompt = `Eres un clasificador de intenciones para ActivaQR. Clasifica en: close_concreto, close_general, informador, soporte, humano, saludo, ambiguo. Responde solo JSON.`;
  }

  const historialStr = historial.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

  try {
    const aiClient = getAIClient('FAST');
    const modelId = getModelId('FAST');

    const response = await aiClient.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Ficha del cliente:\n- Nombre: ${ficha.nombre || 'desconocido'}\n- Rubro: ${ficha.rubro || 'desconocido'}\n- Producto interés: ${ficha.producto_interes || 'ninguno'}\n\nHistorial reciente:\n${historialStr || 'Sin historial'}\n\nMensaje del cliente: "${texto}"\n\nClasifica este mensaje. Responde SOLO con JSON.`
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const telLog = ficha.numero || 'unknown';
    log('LLM-CLASIF', telLog, `RAW response: ${content.substring(0, 300)}`);

    const parsed = JSON.parse(content);

    return {
      categoria: parsed.categoria || 'ambiguo',
      producto_detectado: parsed.producto_detectado || null,
      razonamiento: parsed.razon || '',
      contexto: parsed.contexto || '',
      respuesta_directa: parsed.respuesta_directa || null,
      es_fuera_dominio: parsed.fuera_dominio === true,
      nombre_detectado: parsed.nombre_detectado || null,
      rubro_detectado: parsed.rubro_detectado || null,
    };
  } catch (e: any) {
    console.error('[ActivaQR-Brain] Error en clasificador:', e.message);
    return {
      categoria: 'ambiguo',
      producto_detectado: null,
      razonamiento: '',
      contexto: '',
      respuesta_directa: null,
      es_fuera_dominio: false,
      nombre_detectado: null,
      rubro_detectado: null,
    };
  }
}

// ═══════════════════════════════════════════
// FASE 2: BARRERA LEGAL LOPDP (determinista)
// ═══════════════════════════════════════════

function getMensajesLegales() {
  return {
    link: process.env.LINK_POLITICAS || 'https://activaqr.com/privacidad',
    barrera: `Antes de seguir, por ley (LOPDP) necesito que aceptes nuestras políticas de privacidad. Es rapidito, mira: ${process.env.LINK_POLITICAS || 'https://activaqr.com/privacidad'}\nCuando aceptes en la web, escríbeme *"Listo"* y seguimos de una. 😊`,
    barreraUrgente: `Un segundo antes de darte los detalles — por ley (LOPDP) necesito tu autorización. Literal 30 segundos: ${process.env.LINK_POLITICAS || 'https://activaqr.com/privacidad'}\nCuando termines, escríbeme *"Listo"* y seguimos. 😊`,
    noAcepta: 'Entendido perfectamente. Por la Ley de Protección de Datos (LOPDP) no podemos enviarte información sin tu autorización expresa. Si cambias de opinión, solo vuelve a escribirnos. ¡Que tengas un excelente día!',
  };
}

interface ResultadoBarrera {
  respuesta: string | null;
  nuevaFicha: FichaCliente;
  bloqueado: boolean;
  aceptado: boolean;
}

function barreraLegal(texto: string, ficha: FichaCliente, categoria: string): ResultadoBarrera {
  const msgs = getMensajesLegales();
  const textoLimpio = texto.toLowerCase().trim();

  // Si ya aceptó, no hay barrera
  if (ficha.acepto_proteccion) {
    return { respuesta: null, nuevaFicha: ficha, bloqueado: false, aceptado: true };
  }

  // Si está en medio de la barrera (paso > 0)
  const pasoBarrera = ficha.sesion?.paso_barrera || 0;

  if (pasoBarrera === 0) {
    // Primera vez: mostrar barrera
    ficha.sesion = { ...(ficha.sesion || {}), paso_barrera: 1 };
    const esUrgente = ['close_concreto', 'close_general'].includes(categoria);
    return {
      respuesta: esUrgente ? msgs.barreraUrgente : msgs.barrera,
      nuevaFicha: ficha,
      bloqueado: true,
      aceptado: false,
    };
  }

  // Paso 1: esperando "listo" o "acepto"
  if (pasoBarrera >= 1) {
    if (/^(listo|acepto|s[ií]|ok|dale|de acuerdo|aceptado)$/i.test(textoLimpio)) {
      ficha.acepto_proteccion = true;
      ficha.acepto_fecha = new Date().toISOString();
      ficha.sesion = { ...(ficha.sesion || {}), paso_barrera: 0 };
      return { respuesta: null, nuevaFicha: ficha, bloqueado: false, aceptado: true };
    }

    if (/^(no|negativo|para nada|de ninguna manera)$/i.test(textoLimpio) || textoLimpio.includes('no acepto')) {
      ficha.sesion = { ...(ficha.sesion || {}), paso_barrera: 0 };
      return { respuesta: msgs.noAcepta, nuevaFicha: ficha, bloqueado: true, aceptado: false };
    }

    // Respuesta ambigua, reintentar
    ficha.sesion = { ...(ficha.sesion || {}), paso_barrera: 2 };
    const esUrgente = ['close_concreto', 'close_general'].includes(categoria);
    return {
      respuesta: esUrgente ? msgs.barreraUrgente : msgs.barrera,
      nuevaFicha: ficha,
      bloqueado: true,
      aceptado: false,
    };
  }

  return { respuesta: null, nuevaFicha: ficha, bloqueado: false, aceptado: false };
}

// ═══════════════════════════════════════════
// FASE 3: AGENTE EXPERTO (1 LLM call)
// ═══════════════════════════════════════════

/**
 * Carga un skill .md y reemplaza placeholders.
 */
function cargarSkillPrompt(nombreArchivo: string, ficha: FichaCliente, historial: MensajeHistorial[]): string {
  try {
    const promptPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', nombreArchivo);
    let prompt = fs.readFileSync(promptPath, 'utf-8');

    // Reemplazar placeholders
    prompt = prompt.replace(/\{nombre\}/g, ficha.nombre || '');
    prompt = prompt.replace(/\{rubro\}/g, ficha.rubro || 'desconocido');
    prompt = prompt.replace(/\{producto\}/g, ficha.producto_detectado || ficha.producto_interes || '');
    prompt = prompt.replace(/\{temperamento\}/g, ficha.temperamento || '');
    prompt = prompt.replace(/\{dolores\}/g, (ficha.dolores || []).join(', '));

    // ADN: Inyectar biblia de productos si es el Informador
    if (nombreArchivo === 'activaqr_informador.md') {
      try {
        const adnPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', 'activaqr_informador_adn.md');
        const adnPrompt = fs.readFileSync(adnPath, 'utf-8');
        prompt += `\n\n═══════════════════════════════════\n`;
        prompt += `BIBLIA Y CATÁLOGO DE PRODUCTOS OFICIALES DE ACTIVAQR (ADN):\n`;
        prompt += adnPrompt;
        prompt += `\n═══════════════════════════════════\n`;
      } catch (e: any) {
        console.error('[ActivaQR-Brain] Error inyectando ADN de productos:', e.message);
      }
    }

    // RAG: Inyectar base de conocimiento técnico si es Soporte
    if (nombreArchivo === 'activaqr_soporte.md') {
      try {
        const ragPath = path.join(process.cwd(), 'lib', 'donna', 'prompts', 'activaqr_rag_inputs.md');
        const ragPrompt = fs.readFileSync(ragPath, 'utf-8');
        prompt += `\n\n═══════════════════════════════════\n`;
        prompt += `BASE DE CONOCIMIENTO TÉCNICO Y SOPORTE DE ACTIVAQR (RAG):\n`;
        prompt += ragPrompt;
        prompt += `\n═══════════════════════════════════\n`;
      } catch (e: any) {
        console.error('[ActivaQR-Brain] Error inyectando RAG de soporte:', e.message);
      }
    }

    // Inyectar memoria del cliente
    prompt += `\n\n═══════════════════════════════════\n`;
    prompt += `MEMORIA DEL CLIENTE:\n`;
    prompt += `- Nombre: ${ficha.nombre || 'desconocido'}\n`;
    prompt += `- Rubro: ${ficha.rubro || 'desconocido'}\n`;
    prompt += `- Dolor identificado: ${ficha.dolores?.join(', ') || 'ninguno aún'}\n`;
    prompt += `- Producto de interés: ${ficha.producto_interes || ficha.producto_detectado || 'ninguno aún'}\n`;
    prompt += `- Objeciones activas: ${ficha.objeciones?.join(', ') || 'ninguna'}\n`;

    // Temperamento
    if (ficha.temperamento && ficha.temperamento_confianza !== 'bajo') {
      const estilos: Record<string, string> = {
        flematico: "Es directo y lógico. Sin rodeos. Responde corto y concreto. No uses emojis.",
        sanguineo: "Es energético y emotivo. Usa su entusiasmo. Dale protagonismo. Puede tener emojis.",
        colerico: "Es evaluador y dominante. Mantén postura de igual. No te sometas. Tono firme.",
        melancolico: "Es inseguro y busca respaldo. Valida su duda sin ampliarla. Dale seguridad sin presionar."
      };
      prompt += `\n🧠 PERFIL (temperamento ${ficha.temperamento}, confianza ${ficha.temperamento_confianza}):\n${estilos[ficha.temperamento] || ''}\n`;
    }

    // Historial
    if (historial.length > 0) {
      prompt += `\nHISTORIAL RECIENTE:\n${historial.slice(-6).map(m => `[${m.role}]: ${m.content}`).join('\n')}\n`;
    }

    // Reglas anti-alucinación de planes
    prompt += `\n\n⚠️ REGLAS ESTRICTAS DE ALCANCE DE PLANES (PROHIBIDO ALUCINAR):
- Contacto Digital ($35/año) SOLO instala datos de contacto. NO incluye galería, fotos, catálogo, ni pedidos.
- Business ($100/año) incluye vitrina digital con fotos, galería y promociones. NO tiene carrito de compras.
- Catálogo ($200/año) incluye carrito de compras y pedidos (hasta 20 productos).`;

    prompt += `\n═══════════════════════════════════\n`;

    // JSON mode
    if (!prompt.toLowerCase().includes('json')) {
      prompt += `\n\nResponde SOLO con texto plano, el mensaje que le enviarías al cliente. Sin JSON, sin metadatos.`;
    }

    return prompt;
  } catch (e: any) {
    console.error(`[ActivaQR-Brain] Error cargando skill ${nombreArchivo}:`, e.message);
    return 'Eres Ale, asistente virtual de ActivaQR Ecuador. Responde de forma cercana y profesional.';
  }
}

/**
 * Extrae la respuesta limpia de la IA eliminando etiquetas XML internas.
 * El Closer usa <pensamiento>...</pensamiento> para razonar internamente
 * y <respuesta>...</respuesta> para el mensaje al cliente.
 * Si no encuentra etiquetas, limpia lo que haya por si la IA no estructuró bien.
 */
function extraerRespuestaLimpia(texto: string): string {
  if (!texto) return '';

  // Capturar contenido dentro de <respuesta>
  const match = texto.match(/<respuesta>([\s\S]*?)<\/respuesta>/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallbacks de limpieza si la IA no estructuró bien
  let limpio = texto;
  limpio = limpio.replace(/<pensamiento>[\s\S]*?<\/pensamiento>/gi, '');
  limpio = limpio.replace(/<\/?respuesta>/gi, '');
  limpio = limpio.replace(/<\/?pensamiento>/gi, '');
  limpio = limpio.replace(/Movimiento \d\s*—\s*[^:\n]+:?/gi, '');

  return limpio.trim();
}

async function ejecutarAgenteExperto(
  texto: string,
  ficha: FichaCliente,
  historial: MensajeHistorial[],
  categoria: string,
  producto: string | null
): Promise<string> {
  // Seleccionar skill según categoría
  let skillArchivo = 'activaqr_informador.md';
  let maxTokens = 300;

  if (categoria === 'close_concreto' || categoria === 'close_general') {
    skillArchivo = 'activaqr_closer.md';
    maxTokens = 600; // Closer necesita más tokens para pensamiento estratégico
  } else if (categoria === 'soporte') {
    skillArchivo = 'activaqr_soporte.md';
  } else if (categoria === 'humano') {
    // No necesita LLM, se responde directo
    return '¡Claro! Te conecto con un asesor de ActivaQR enseguida. César o un miembro de su equipo se pondrá en contacto contigo. 😊';
  }

  const systemPrompt = cargarSkillPrompt(skillArchivo, ficha, historial);

  try {
    const aiClient = getAIClient('FAST');
    const modelId = getModelId('FAST');

    const response = await aiClient.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: texto }
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const rawContent = response.choices[0]?.message?.content || '';

    // Log del prompt (resumido) y respuesta cruda del LLM
    const telLog = ficha.numero || 'unknown';
    log('LLM-EXPERT', telLog, `${skillArchivo} (${maxTokens} tok)`, {
      promptSize: systemPrompt.length,
      userInput: texto.substring(0, 100),
      rawResponse: rawContent.substring(0, 300)
    });

    // Si es closer, limpiar obligatoriamente las etiquetas XML del sandbox
    if (categoria === 'close_concreto' || categoria === 'close_general') {
      const limpia = extraerRespuestaLimpia(rawContent);
      log('F3-LIMPIA', telLog, `Contenido limpiado: "${limpia.substring(0, 100)}"`);
      return limpia;
    }

    return rawContent;
  } catch (e: any) {
    console.error('[ActivaQR-Brain] Error en agente experto:', e.message);

    // Fallback determinista
    if (categoria === 'saludo') {
      return '¡Hola! Soy Ale, de ActivaQR. 👋 ¿En qué puedo ayudarte hoy? ¿Te gustaría conocer nuestros planes o tienes alguna duda?';
    }
    if (categoria === 'close_general' || categoria === 'close_concreto') {
      return `${ficha.nombre ? ficha.nombre + ', ' : ''}claro, déjame contarte sobre nuestros planes. Tenemos desde $35/año con Contacto Digital hasta nuestra Tienda en Línea completa. ¿Qué tipo de negocio tienes para recomendarte el ideal?`;
    }
    return 'Para ayudarte mejor, ¿me cuentas un poco más sobre qué necesitas? 😊';
  }
}

// ═══════════════════════════════════════════
// ONBOARDING (pasos 1-2 del informador)
// ═══════════════════════════════════════════

async function ejecutarOnboarding(
  texto: string,
  ficha: FichaCliente,
  _historial: MensajeHistorial[]
): Promise<{ respuesta: string; nuevaFicha: FichaCliente }> {
  if (!ficha.sesion) ficha.sesion = {};
  if (ficha.sesion.paso_onboarding === undefined) ficha.sesion.paso_onboarding = 0;

  const paso = ficha.sesion.paso_onboarding;
  const nombreConocido = ficha.nombre || '';

  // Intentar extraer nombre del mensaje (patrones inequívocos)
  if (!nombreConocido) {
    const introMatch = texto.match(/(?:me\s+llamo|mi\s+nombre\s+es|soy)\s+(\S.*)/i);
    if (introMatch) {
      const palabras = introMatch[1].split(/[\s,\.!?]+/);
      const nombreParts: string[] = [];
      for (const p of palabras) {
        if (/^[A-ZÁÉÍÓÚÑ]/.test(p)) nombreParts.push(p.replace(/[!?.,;:]+$/, ''));
        else break;
      }
      if (nombreParts.length > 0) {
        const nombreExtraido = nombreParts.join(' ');
        const BLOQUEADAS = /^(Hola|Buenas|Soy|Tengo|Quiero|Ok|Dale|Gracias|Acepto|Listo|Claro)$/;
        if (!BLOQUEADAS.test(nombreExtraido)) {
          ficha.nombre = nombreExtraido;
          console.log(`[ActivaQR-Brain] Nombre extraído: "${nombreExtraido}"`);
        }
      }
    }
  }

  const nombreActualizado = ficha.nombre || '';

  // Paso 0: primer contacto
  if (paso === 0 && !nombreActualizado) {
    ficha.sesion.paso_onboarding = 1;
    return {
      respuesta: '¡Hola! Soy Ale, de ActivaQR. 😊 ¿Con quién tengo el gusto?',
      nuevaFicha: ficha
    };
  }

  // Paso 1: ya preguntamos el nombre, esperando respuesta
  if (paso === 1) {
    if (nombreActualizado) {
      ficha.sesion.paso_onboarding = 2;
      detectarTemperamentoTemprano(texto, ficha);
      return {
        respuesta: `¡${nombreActualizado}, un gusto enorme! 😊 Cuéntame, ¿en qué rubro o tipo de negocio estás? Así te explico lo que aplica para ti.`,
        nuevaFicha: ficha
      };
    }
    // Reintentar
    return {
      respuesta: 'Perdón, no capté tu nombre. ¿Me lo repites? 😊',
      nuevaFicha: ficha
    };
  }

  // Paso 2: preguntamos rubro
  if (paso === 2 && !ficha.rubro) {
    // Intentar extraer rubro con LLM
    try {
      const aiClient = getAIClient('FAST');
      const modelId = getModelId('FAST');
      const resp = await aiClient.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: 'Extrae la profesión, oficio o tipo de negocio de este mensaje. Responde 1-4 palabras, en minúsculas, sin puntuación. Si no se menciona, responde "null".' },
          { role: 'user', content: texto }
        ],
        temperature: 0,
        max_tokens: 15,
      });
      const rubro = resp.choices[0]?.message?.content?.trim() || '';
      if (rubro && rubro !== 'null') {
        ficha.rubro = rubro;
        detectarTemperamentoTemprano(texto, ficha);
      }
    } catch { /* ignorar */ }
  }

  if (ficha.rubro) {
    ficha.sesion.paso_onboarding = 3;
    ficha.sesion.onboarding_completado = true;
  }

  return { respuesta: null as any, nuevaFicha: ficha };
}

// ═══════════════════════════════════════════
// FUNCIÓN PRINCIPAL (ENTRY POINT)
// ═══════════════════════════════════════════

export async function procesarMensajeActivaQR(
  mensaje: string,
  fichaActual: FichaCliente,
  historial: MensajeHistorial[]
): Promise<ResultadoActivaQR> {
  const texto = mensaje.trim();
  const tel = fichaActual.numero || 'unknown';
  log('INPUT', tel, `Mensaje recibido: "${texto.substring(0, 100)}"`, { largo: texto.length, historial: historial.length });

  if (!texto) {
    log('INPUT', tel, 'Mensaje vacío, retornando null');
    return { respuesta: null, nuevaFicha: fichaActual, transferir: false };
  }

  // ─── TIMEOUT DE SESIÓN (30 min) ───
  // Clonar ficha para no mutar la original
  const ficha: FichaCliente = JSON.parse(JSON.stringify(fichaActual));
  checkSessionTimeout(ficha, tel);

  // Inicializar estructuras internas
  if (!ficha.sesion) ficha.sesion = {};
  if (!ficha.informador) ficha.informador = { contador: 0, paso: 0 };
  if (!ficha.closer) ficha.closer = { contador: 0, paso: 0 };

  // ─── DETECCIÓN DE BAJA ───
  if (detectarBaja(texto)) {
    log('BAJA', tel, `Baja LOPDP detectada: "${texto.substring(0, 60)}"`);
    return {
      respuesta: 'Entendido. Tu solicitud de baja ha sido registrada. No recibirás más mensajes nuestros. Si cambias de opinión, solo vuelve a escribirnos. ¡Que tengas un excelente día! 🙏',
      nuevaFicha: ficha,
      transferir: false,
    };
  }

  // ─── REACTIVACIÓN POST-BAJA FREEZE ───
  const freezeHasta = ficha.sesion.baja_freeze_hasta;
  if (freezeHasta && new Date() < new Date(freezeHasta)) {
    log('FREEZE', tel, 'Baja freeze activo, bloqueando mensaje');
    return {
      respuesta: 'Tu solicitud de baja está siendo procesada. Podrás contactarnos nuevamente después de las 6:00 AM. 🙏',
      nuevaFicha: ficha,
      transferir: false,
    };
  }
  if (freezeHasta) {
    delete ficha.sesion.baja_freeze_hasta;
    log('FREEZE', tel, 'Baja freeze expirado, reactivando');
  }

  // ─── FASE 0: TEMPERAMENTO TEMPRANO ───
  detectarTemperamentoTemprano(texto, ficha);
  if (ficha.temperamento) {
    log('TEMP', tel, `Detectado: ${ficha.temperamento} (${ficha.temperamento_confianza})`);
  }

  // ─── ANTI-HACKEO (sync, sin LLM) ───
  if (detectarHackeo(texto)) {
    log('SEGURIDAD', tel, `Anti-hackeo activado: "${texto.substring(0, 60)}"`);
    return {
      respuesta: '⚠️ Ups, no puedo procesar ese mensaje. ¿Podrías escribirlo de otra forma?',
      nuevaFicha: ficha,
      transferir: false,
    };
  }

  // ─── SALUDO (sync, sin LLM) ───
  if (detectarSaludo(texto) && !ficha.sesion.onboarding_completado) {
    log('SALUDO', tel, 'Saludo detectado, inicio onboarding');
    ficha.sesion.paso_onboarding = 1;
    return {
      respuesta: '¡Hola! Soy Ale, de ActivaQR. 😊 ¿Con quién tengo el gusto?',
      nuevaFicha: ficha,
      transferir: false,
    };
  }

  // ─── ONBOARDING ───
  if (!ficha.sesion.onboarding_completado) {
    const resultOnboarding = await ejecutarOnboarding(texto, ficha, historial);
    if (resultOnboarding.respuesta) {
      return {
        respuesta: resultOnboarding.respuesta,
        nuevaFicha: resultOnboarding.nuevaFicha,
        transferir: false,
      };
    }
    // Si onboarding devuelve null, seguir al clasificador
  }

  // ─── FASE 1: CLASIFICADOR + RAZONADOR FUSIONADO ───
  const inicioClasif = Date.now();
  const clasificacion = await clasificarYRazonar(texto, ficha, historial);
  const { categoria, producto_detectado, respuesta_directa, es_fuera_dominio, nombre_detectado, rubro_detectado } = clasificacion;
  log('F1-CLASIF', tel, `→ ${categoria}${producto_detectado ? ' (' + producto_detectado + ')' : ''} | ${Date.now() - inicioClasif}ms`, clasificacion);

  // Sincronizar datos detectados por el clasificador
  if (nombre_detectado && !ficha.nombre) {
    ficha.nombre = nombre_detectado;
    console.log(`[ActivaQR-Brain] Nombre detectado: ${nombre_detectado}`);
  }
  if (rubro_detectado && !ficha.rubro) {
    ficha.rubro = rubro_detectado;
    console.log(`[ActivaQR-Brain] Rubro detectado: ${rubro_detectado}`);
  }
  if (producto_detectado && !ficha.producto_detectado) {
    ficha.producto_detectado = producto_detectado;
    ficha.producto_interes = producto_detectado;
  }

  // Fuera de dominio → respuesta directa
  if (es_fuera_dominio && respuesta_directa) {
    return {
      respuesta: respuesta_directa,
      nuevaFicha: ficha,
      transferir: false,
    };
  }

  // Hackeo detectado por LLM
  if (categoria === 'hackeo') {
    return {
      respuesta: '⚠️ Ups, no puedo procesar ese mensaje. ¿Podrías escribirlo de otra forma?',
      nuevaFicha: ficha,
      transferir: false,
    };
  }

  // Humano → transferir
  if (categoria === 'humano') {
    ficha.contacto_humano_solicitado = true;
    return {
      respuesta: '¡Claro! Te conecto con un asesor de ActivaQR enseguida. César o un miembro de su equipo se pondrá en contacto contigo. 😊',
      nuevaFicha: ficha,
      transferir: true,
      motivoTransferencia: 'Solicitud del cliente',
    };
  }

  // ─── FASE 2: BARRERA LEGAL LOPDP ───
  const esInfoSensible = ['close_concreto', 'close_general'].includes(categoria);
  const politicasPendientes = !ficha.acepto_proteccion;

  if ((esInfoSensible && politicasPendientes) || (ficha.sesion.paso_barrera || 0) > 0) {
    log('F2-BARRERA', tel, `InfoSensible=${esInfoSensible} Pendientes=${politicasPendientes} paso=${ficha.sesion.paso_barrera || 0}`);
    const resultadoBarrera = barreraLegal(texto, ficha, categoria);
    ficha.sesion = resultadoBarrera.nuevaFicha.sesion;
    ficha.acepto_proteccion = resultadoBarrera.nuevaFicha.acepto_proteccion;

    if (resultadoBarrera.bloqueado || resultadoBarrera.respuesta) {
      log('F2-BARRERA', tel, `Bloqueado=${resultadoBarrera.bloqueado}`, { respuesta: resultadoBarrera.respuesta?.substring(0, 60) });
      return {
        respuesta: resultadoBarrera.respuesta,
        nuevaFicha: ficha,
        transferir: false,
      };
    }
    log('F2-BARRERA', tel, 'Barrera superada, cliente aceptó políticas');
  }

  // Guard ILógico — 3 strikes
  if (ficha.agente_activo && categoria === 'ambiguo' && texto.length < 80) {
    if (!ficha.sesion) ficha.sesion = {};
    ficha.sesion.mensajes_ilogicos = (ficha.sesion.mensajes_ilogicos || 0) + 1;
    if (ficha.sesion.mensajes_ilogicos >= 3) {
      return { respuesta: null, nuevaFicha: ficha, transferir: false };
    }
    return {
      respuesta: '¿Me cuentas un poco más en qué puedo ayudarte? 😊',
      nuevaFicha: ficha,
      transferir: false,
    };
  }

  // ─── FASE 3: AGENTE EXPERTO ───
  let categoriaEfectiva = categoria;

  // Si es close pero no hay descubrimientos, forzar informador primero
  const tieneDescubrimientos = (ficha.dolores && ficha.dolores.length > 0) || !!ficha.rubro;
  if (['close_general', 'close_concreto'].includes(categoria) && !tieneDescubrimientos) {
    categoriaEfectiva = 'informador';
    ficha.urgencia_compra = true;
    log('F3-RUTEO', tel, `Close sin descubrimientos → forzando informador`);
  }

  // Actualizar agente activo
  ficha.agente_activo = categoriaEfectiva;
  if (categoriaEfectiva === 'informador' || categoriaEfectiva === 'close_concreto' || categoriaEfectiva === 'close_general') {
    ficha.informador!.contador += 1;
  }

  const inicioExpert = Date.now();
  const respuestaExperto = await ejecutarAgenteExperto(texto, ficha, historial, categoriaEfectiva, producto_detectado);
  log('F3-EXPERTO', tel, `${categoriaEfectiva} → ${Date.now() - inicioExpert}ms`, { respuesta: respuestaExperto.substring(0, 200) });

  // JSONL: registro de auditoría completo
  escribirJsonl({
    tipo: 'interaccion_completa',
    numero: tel,
    nombre: ficha.nombre || null,
    temperamento: ficha.temperamento || null,
    temperamento_confianza: ficha.temperamento_confianza || null,
    rubro: ficha.rubro || null,
    producto_interes: ficha.producto_interes || null,
    categoria: categoria,
    categoria_efectiva: categoriaEfectiva,
    agente_activo: ficha.agente_activo || null,
    input: texto.substring(0, 500),
    output: respuestaExperto.trim().substring(0, 500) || null,
    transferir: false,
    acepto_proteccion: ficha.acepto_proteccion || false,
    objeciones: ficha.objeciones || [],
    historial_count: historial.length,
  });

  // Actualizar timestamp de última interacción
  if (!ficha.sesion) ficha.sesion = {};
  ficha.sesion.ultimo_mensaje_at = new Date().toISOString();

  return {
    respuesta: respuestaExperto.trim() || null,
    nuevaFicha: ficha,
    transferir: false,
  };
}
