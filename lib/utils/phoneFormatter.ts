/**
 * phoneFormatter.ts — Normalización de teléfonos ecuatorianos a E.164
 * 
 * Reglas Ecuador:
 *   - Celular: 09XXXXXXXX (10 dígitos) → +5939XXXXXXXX
 *   - Fijo: 02/03/.../07 XXXXXXX (10 dígitos) → +593 2/3/...XXXXXXX
 *   - Prefijo +593: 12 dígitos total
 *   - 9 dígitos sin cero: asumimos celular (ej: 999123456)
 *   - 7 dígitos: fijo sin código ciudad (asumimos Quito 02)
 */

export interface PhoneFormatResult {
  raw: string;
  e164: string | null;
  whatsappUrl: string | null;
  telUrl: string | null;
  tipo: 'celular' | 'fijo' | 'invalido';
  valido: boolean;
  motivoInvalido?: string;
}

export function formatEcuadorPhone(phone: string): PhoneFormatResult {
  const invalid = (motivo: string): PhoneFormatResult => ({
    raw: phone,
    e164: null,
    whatsappUrl: null,
    telUrl: null,
    tipo: 'invalido',
    valido: false,
    motivoInvalido: motivo,
  });

  if (!phone || typeof phone !== 'string') return invalid('sin_telefono');

  const digits = phone.replace(/\D/g, '');
  let local = '';
  let e164 = '';

  if (digits.length === 12 && digits.startsWith('593')) {
    local = digits.slice(3);
    e164 = digits;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    local = digits.slice(1);
    e164 = '593' + local;
  } else if (digits.length === 9 && digits.startsWith('9')) {
    local = digits;
    e164 = '593' + local;
  } else if (digits.length === 7) {
    // Fijo sin código de ciudad → asumir Quito (02)
    local = '2' + digits;
    e164 = '593' + local;
  } else {
    return invalid(`longitud_${digits.length}_digitos`);
  }

  // Determinar tipo
  let tipo: 'celular' | 'fijo' | 'invalido';
  if (local.startsWith('9')) {
    tipo = 'celular';
  } else if (/^[2-7]/.test(local)) {
    tipo = 'fijo';
  } else {
    return invalid('prefijo_desconocido');
  }

  return {
    raw: phone,
    e164,
    valido: true,
    tipo,
    telUrl: `tel:+${e164}`,
    whatsappUrl: tipo === 'celular' ? `https://wa.me/${e164}` : null,
  };
}

/**
 * Normaliza un teléfono y retorna solo el E.164 o null
 */
export function toE164(phone: string): string | null {
  return formatEcuadorPhone(phone).e164;
}
