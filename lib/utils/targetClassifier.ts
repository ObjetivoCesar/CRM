/**
 * targetClassifier.ts — Clasificación de prospectos: target real vs agencia/intermediario
 * 
 * Contexto: Para campañas de ActivaQR, queremos imprentas, rotulistas y señaléticas.
 * Queremos EVITAR agencias de marketing/publicidad que son intermediarios sin poder de decisión.
 */

const KEYWORDS_TARGET_REAL = [
  'imprenta', 'impresora', 'impresion', 'impresiones',
  'letrero', 'letreros', 'señalizacion', 'señaletica', 'senalizacion',
  'rotulo', 'rotulos', 'rotulacion', 'rotulista',
  'pancarta', 'pancartas', 'banner', 'banners', 'lona', 'lonas',
  'vinil', 'vinilo', 'vinilos', 'plotter',
  'caja de luz', 'cajas de luz', 'luminoso',
  'sublimacion', 'serigrafia', 'gran formato',
  'corte laser', 'grabado laser', 'laser',
  'adhesivo', 'adhesivos', 'etiqueta', 'etiquetas',
  'microperforado', 'souvenir', 'souvenirs',
  'corporativo', 'gigantografia', 'mesh',
];

const KEYWORDS_AGENCIA = [
  'agencia', 'marketing', 'comunica', 'community',
  'prensa', 'medios', 'modelos', 'relaciones publicas',
  'social media', 'community manager', 'estrategia',
  'branding', 'digital', 'consultoria', 'publicidad', 'publicista',
  'asesor', 'asesoria', 'contenido', 'influencer',
];

export type TargetLabel =
  | 'imprenta_pura'
  | 'agencia_marketing'
  | 'ambiguo_por_revisar';

export interface TargetClassification {
  esTargetReal: boolean;
  esAgenciaIntermediario: boolean;
  etiquetaClasificacion: TargetLabel;
}

/**
 * Clasifica un negocio como target real (imprenta/señalética) o agencia intermediaria.
 * Se usa en el pipeline de ingesta de prospectos del scraper.
 */
export function classifyLeadTarget(
  nombreNegocio: string,
  categoria: string = ''
): TargetClassification {
  const text = `${nombreNegocio} ${categoria}`.toLowerCase()
    // Normalizar tildes para mejor matching
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/ñ/g, 'n');

  const isAgencia = KEYWORDS_AGENCIA.some(kw => text.includes(kw));
  const isTargetReal = KEYWORDS_TARGET_REAL.some(kw => text.includes(kw));

  if (isTargetReal && !isAgencia) {
    return {
      esTargetReal: true,
      esAgenciaIntermediario: false,
      etiquetaClasificacion: 'imprenta_pura',
    };
  }

  if (isAgencia) {
    return {
      esTargetReal: false,
      esAgenciaIntermediario: true,
      etiquetaClasificacion: 'agencia_marketing',
    };
  }

  // Conservador: pasar para revisión manual
  return {
    esTargetReal: true,
    esAgenciaIntermediario: false,
    etiquetaClasificacion: 'ambiguo_por_revisar',
  };
}
