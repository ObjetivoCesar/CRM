import { formatEcuadorPhone } from '../lib/utils/phoneFormatter';
import { classifyLeadTarget } from '../lib/utils/targetClassifier';

console.log('=== TEST 1: FORMATO DE TELÉFONOS ECUADOR ===');
const testPhones = [
  '0999123456',       // Celular 10 dígitos
  '593999123456',     // Celular 12 dígitos E.164
  '022345678',        // Fijo Quito 9 dígitos sin 0
  '0223456789',       // Fijo Quito 10 dígitos
  '2345678',          // Fijo 7 dígitos (asume Quito 02)
  '1234',             // Inválido
];

testPhones.forEach(p => {
  const res = formatEcuadorPhone(p);
  console.log(`Input: "${p}" → E164: ${res.e164} | Tipo: ${res.tipo} | Válido: ${res.valido}`);
});

console.log('\n=== TEST 2: CLASIFICACIÓN DE NEGOCIOS ===');
const testCases = [
  { nombre: 'Imprenta El Rótulo', cat: 'Impresiones y gigantografías' },
  { nombre: 'Agencia Marketing Digital Quito', cat: 'Social Media y Publicidad' },
  { nombre: 'Letreros y Vinilos Cayambe', cat: 'Señalética' },
  { nombre: 'Consultoría y Branding SPA', cat: 'Asesoría de marcas' },
  { nombre: 'Ferretería Central', cat: 'Venta de materiales' },
];

testCases.forEach(tc => {
  const res = classifyLeadTarget(tc.nombre, tc.cat);
  console.log(`Negocio: "${tc.nombre}" → Target Real: ${res.esTargetReal} | Etiqueta: ${res.etiquetaClasificacion}`);
});
