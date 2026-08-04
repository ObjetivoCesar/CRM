import { formatEcuadorPhone } from '../lib/utils/phoneFormatter';
import { classifyLeadTarget } from '../lib/utils/targetClassifier';
import { evaluatePitch, ScriptStep } from '../lib/ai/pitchEvaluator';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureDetails: string) {
  if (condition) {
    results.push({ name: testName, passed: true, details: 'OK' });
  } else {
    results.push({ name: testName, passed: false, details: failureDetails });
  }
}

async function runAllAutomatedTests() {
  console.log('🧪 EJECUTANDO BATERÍA COMPLETA DE PRUEBAS AUTOMÁTICAS DE SISTEMA...\n');

  // ============================================
  // BLOQUE 1: FORMATO Y NORMALIZACIÓN DE TELÉFONOS (Casos normal y límites/errores)
  // ============================================

  // Test 1.1: Celular 10 dígitos con 09
  const t1 = formatEcuadorPhone('0999123456');
  assert(t1.valido && t1.e164 === '593999123456' && t1.tipo === 'celular', 
    'Phone normal: Celular 10 dígitos con 09', 
    `Esperado +593999123456 celular, obtenido ${t1.e164} ${t1.tipo}`
  );

  // Test 1.2: Celular en formato E.164 con 593
  const t2 = formatEcuadorPhone('593987654321');
  assert(t2.valido && t2.e164 === '593987654321' && t2.tipo === 'celular',
    'Phone normal: Celular E.164 directo',
    `Esperado 593987654321, obtenido ${t2.e164}`
  );

  // Test 1.3: Fijo 10 dígitos (Quito 02)
  const t3 = formatEcuadorPhone('0229998888');
  assert(t3.valido && t3.e164 === '593229998888' && t3.tipo === 'fijo',
    'Phone normal: Fijo Quito 10 dígitos',
    `Esperado 593229998888 fijo, obtenido ${t3.e164} ${t3.tipo}`
  );

  // Test 1.4 (Caso Límite): Fijo 7 dígitos (asume prefijo 02)
  const t4 = formatEcuadorPhone('2999888');
  assert(t4.valido && t4.e164 === '59322999888' && t4.tipo === 'fijo',
    'Phone caso límite: Fijo 7 dígitos asume Quito 02',
    `Esperado 59322999888, obtenido ${t4.e164}`
  );

  // Test 1.5 (Caso Error/Inválido): Teléfono con menos de 7 dígitos
  const t5 = formatEcuadorPhone('12345');
  assert(!t5.valido && t5.tipo === 'invalido',
    'Phone error: Teléfono corto descartado',
    `Esperado valido=false, obtenido valido=${t5.valido}`
  );

  // Test 1.6 (Caso Error/Inválido): Cadena vacía o caracteres nulos
  const t6 = formatEcuadorPhone('');
  assert(!t6.valido && t6.motivoInvalido === 'sin_telefono',
    'Phone error: String vacío manejado sin crash',
    `Esperado motivo sin_telefono, obtenido ${t6.motivoInvalido}`
  );

  // ============================================
  // BLOQUE 2: CLASIFICACIÓN SEMÁNTICA DE TARGET (Imprentas vs Agencias)
  // ============================================

  // Test 2.1: Target Puro (Imprenta / Rotulación)
  const c1 = classifyLeadTarget('Imprenta y Gigantografías del Norte', 'Rotulación y banners');
  assert(c1.esTargetReal && c1.etiquetaClasificacion === 'imprenta_pura',
    'Target normal: Imprenta pura clasificada correctamente',
    `Esperado imprenta_pura, obtenido ${c1.etiquetaClasificacion}`
  );

  // Test 2.2: Intermediario / Agencia de Marketing
  const c2 = classifyLeadTarget('Agencia de Marketing Digital y Social Media', 'Publicidad');
  assert(!c1.esAgenciaIntermediario && c2.esAgenciaIntermediario && c2.etiquetaClasificacion === 'agencia_marketing',
    'Target normal: Agencia detectada como intermediario',
    `Esperado agencia_marketing, obtenido ${c2.etiquetaClasificacion}`
  );

  // Test 2.3 (Caso Límite): Nombre ambiguo con tildes y caracteres especiales
  const c3 = classifyLeadTarget('SEÑALÉTICA & ROTULACIÓN CAYAMBE!!!', 'Impresión Láser');
  assert(c3.esTargetReal && c3.etiquetaClasificacion === 'imprenta_pura',
    'Target caso límite: Resiste mayúsculas, tildes y signos especiales',
    `Esperado imprenta_pura, obtenido ${c3.etiquetaClasificacion}`
  );

  // Test 2.4 (Caso Límite): Negocio no relacionado (Ferretería/Farmacia)
  const c4 = classifyLeadTarget('Ferretería El Tornillo', 'Materiales de construcción');
  assert(c4.esTargetReal && c4.etiquetaClasificacion === 'ambiguo_por_revisar',
    'Target caso límite: Negocio neutro pasa a ambiguo para revisión',
    `Esperado ambiguo_por_revisar, obtenido ${c4.etiquetaClasificacion}`
  );

  // ============================================
  // BLOQUE 3: AUDITORÍA Y EVALUACIÓN DE PITCH CON GROQ LLAMA 3.3
  // ============================================

  const testScript: ScriptStep[] = [
    { orden: 1, gatillo: 'Identidad', frase: 'Buenas, ¿hablo con el dueño?' },
    { orden: 2, gatillo: 'Problema', frase: 'Muchos locales tienen el problema de que no los encuentran...' },
    { orden: 3, gatillo: 'Ganancia', frase: 'Creamos un QR físico-digital desde $7...' }
  ];

  // Test 3.1: Transcripción real completa (Llamada excelente)
  const evalGood = await evaluatePitch(
    'Buenas tardes, ¿hablo con el dueño de la imprenta? Le saluda César de Objetivo. Le llamo porque muchos locales tienen el problema de que los clientes no los ubican. Nosotros les creamos un QR desde $7 dólares para conectar su local. ¿Le gustaría una demo?',
    testScript
  );
  assert(evalGood.puntajeGlobal >= 60 && evalGood.ganchoGananciaTemplrano,
    'Pitch IA normal: Evalúa transcripción completa correctamente',
    `Puntaje obtenido ${evalGood.puntajeGlobal}`
  );

  // Test 3.2 (Caso Error/Límite): Transcripción demasiado corta / fallida
  const evalBad = await evaluatePitch('Hola sí chao', testScript);
  assert(evalBad.puntajeGlobal <= 20,
    'Pitch IA error: Transcripción muy corta recibe score bajo',
    `Puntaje obtenido ${evalBad.puntajeGlobal}`
  );

  // ============================================
  // REPORTAR RESULTADOS FINALES
  // ============================================
  console.log('\n📊 === INFORME DE AUTOVERIFICACIÓN DEL SISTEMA ===\n');
  let passedCount = 0;

  results.forEach((r, i) => {
    if (r.passed) {
      passedCount++;
      console.log(`  ✅ Pruebas ${i + 1}: ${r.name}`);
    } else {
      console.log(`  ❌ Pruebas ${i + 1}: ${r.name} -> FALLÓ: ${r.details}`);
    }
  });

  console.log(`\nTotal Pruebas: ${results.length} | Pasaron: ${passedCount} | Fallaron: ${results.length - passedCount}`);

  if (passedCount === results.length) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON AL 100%! El sistema es seguro y confiable.');
  } else {
    console.log('\n⚠️ SE DETECTARON ERRORES QUE DEBEN SER CORREGIDOS.');
  }
}

runAllAutomatedTests();
