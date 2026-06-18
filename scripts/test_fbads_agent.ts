/**
 * test_fbads_agent.ts
 * ─────────────────────────────────────────────────────────────────
 * Prueba los 4 casos clave del agente de Facebook Ads (activaqr_fbads.md)
 *
 * Uso:
 *   npx tsx scripts/test_fbads_agent.ts
 * ─────────────────────────────────────────────────────────────────
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { procesarMensajeActivaQR, type FichaCliente } from '../lib/activaqr/brain';

// ── Colores para consola ─────────────────────────────────────────
const C = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s: string) => `\x1b[34m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
};

interface TestCase {
  nombre: string;
  descripcion: string;
  ficha: FichaCliente;
  mensaje: string;
  expect: {
    noContiene?: string[];   // El bot NO debe decir estas cosas
    contiene?: string[];     // El bot SÍ debe decir alguna de estas
    agente?: string;         // agente_activo esperado
  };
}

const CASOS: TestCase[] = [
  // ── CASO 1: Lead de Ads dice "hola" → debe activar fbads, NO onboarding genérico ──
  {
    nombre: 'TC-01: Lead de Ads con saludo simple',
    descripcion: 'Lead con fuente_origen=fbads que solo dice "hola" → debe ir al agente fbads, NO al onboarding estándar',
    ficha: {
      numero: '593900000001',
      fuente_origen: 'fbads',
      sesion: {},
    },
    mensaje: 'hola',
    expect: {
      noContiene: ['¿Con quién tengo el gusto?', 'ciudad', '¿En qué ciudad'],
      contiene: ['anuncio', 'ActivaQR', 'negocio', 'Ale'],
    },
  },

  // ── CASO 2: Lead con nombre pre-cargado del formulario de Ads → no preguntar nombre ──
  {
    nombre: 'TC-02: Lead con nombre del formulario de Ads',
    descripcion: 'La ficha ya tiene el nombre de Meta Lead Ads → Ale debe usarlo sin preguntar de nuevo',
    ficha: {
      numero: '593900000002',
      nombre: 'Carlos Mora',
      fuente_origen: 'fbads',
      campana_ad: 'contacto_digital_junio',
      sesion: {},
    },
    mensaje: 'hola',
    expect: {
      noContiene: ['¿Con quién tengo el gusto?', '¿cuál es tu nombre?'],
      contiene: ['Carlos', 'ActivaQR', 'anuncio'],
    },
  },

  // ── CASO 3: Lead urgente "quiero comprar" → debe saltar a Closer ──
  {
    nombre: 'TC-03: Lead caliente — intención de compra directa',
    descripcion: 'Lead de Ads que dice quiero comprar → el clasificador debe detectar close_concreto o el agente fbads debe derivar rápido',
    ficha: {
      numero: '593900000003',
      fuente_origen: 'fbads',
      sesion: { onboarding_completado: true },
    },
    mensaje: 'vi su anuncio y quiero comprar el QR ese, ¿cuánto cuesta?',
    expect: {
      contiene: ['35', 'plan', 'precio', '$', 'contacto', 'QR'],
      noContiene: ['¿Con quién tengo el gusto?'],
    },
  },

  // ── CASO 4: Lead frío "¿qué es eso?" → debe ir a Informador completo ──
  {
    nombre: 'TC-04: Lead frío — no sabe qué es ActivaQR',
    descripcion: 'Lead de Ads que no entiende el producto → debe recibir explicación clara y empática',
    ficha: {
      numero: '593900000004',
      fuente_origen: 'fbads',
      sesion: {},
    },
    mensaje: 'me salió su anuncio en Facebook pero no entendí bien qué venden',
    expect: {
      contiene: ['QR', 'digital', 'negocio', 'página', 'explico'],
      noContiene: ['¿Con quién tengo el gusto?', 'ciudad'],
    },
  },
];

// ── Runner ───────────────────────────────────────────────────────
async function runTests() {
  console.log(C.bold('\n═══════════════════════════════════════════════════════'));
  console.log(C.bold('  🧪 TEST SUITE — Agente Facebook Ads (activaqr_fbads)'));
  console.log(C.bold('═══════════════════════════════════════════════════════\n'));

  let passed = 0;
  let failed = 0;

  for (const tc of CASOS) {
    console.log(C.cyan(`▶ ${tc.nombre}`));
    console.log(`  ${tc.descripcion}`);
    console.log(`  Mensaje: "${C.yellow(tc.mensaje)}"`);

    try {
      const resultado = await procesarMensajeActivaQR(
        tc.mensaje,
        tc.ficha,
        [], // historial vacío
        tc.ficha.numero || 'test'
      );

      const respuesta = resultado.respuesta || '';
      const respuestaLower = respuesta.toLowerCase();

      console.log(`  Respuesta: "${C.blue(respuesta.substring(0, 150))}${respuesta.length > 150 ? '...' : ''}"`);

      const errores: string[] = [];

      // Verificar que NO contiene
      if (tc.expect.noContiene) {
        for (const frase of tc.expect.noContiene) {
          if (respuestaLower.includes(frase.toLowerCase())) {
            errores.push(`❌ Contiene texto prohibido: "${frase}"`);
          }
        }
      }

      // Verificar que SÍ contiene al menos una
      if (tc.expect.contiene) {
        const tieneAlguno = tc.expect.contiene.some(f => respuestaLower.includes(f.toLowerCase()));
        if (!tieneAlguno) {
          errores.push(`❌ No contiene ninguno de: [${tc.expect.contiene.join(', ')}]`);
        }
      }

      if (errores.length === 0) {
        console.log(C.green('  ✅ PASSED\n'));
        passed++;
      } else {
        console.log(C.red(`  ❌ FAILED`));
        errores.forEach(e => console.log(`     ${e}`));
        console.log();
        failed++;
      }
    } catch (err: any) {
      console.log(C.red(`  ❌ ERROR: ${err.message}\n`));
      failed++;
    }
  }

  // ── Resumen final ───────────────────────────────────────────────
  console.log(C.bold('═══════════════════════════════════════════════════════'));
  console.log(C.bold(`  RESULTADO: ${C.green(String(passed))} passed  |  ${failed > 0 ? C.red(String(failed)) : '0'} failed`));
  console.log(C.bold('═══════════════════════════════════════════════════════\n'));

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
