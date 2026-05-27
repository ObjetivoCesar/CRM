/**
 * ActivaQR Product DNA — Source of Truth
 * 
 * Extracted from public/Nuevo_Adn_ActivaQR.txt
 * This is the canonical product intelligence file used by:
 * - ActivaQR Brain (conversational selling)
 * - FB Ads Research (campaign optimization)
 * - Lead auto-enrichment (HITO 1.2)
 * 
 * Each product has: psychological triggers, pain points, keywords, pricing, upsell paths.
 */

export interface ProductDNA {
    id: string;
    name: string;
    price: string;
    url: string;
    keywords: string[];
    pains: string[];
    emotionalTriggers: string[];
    reptileArguments: string[];
    angle: string;
    upsellPath?: string[];
    linkedServices?: string[];
}

export const PRODUCTS: ProductDNA[] = [
    {
        id: 'contacto_digital',
        name: 'Contacto Digital Esencial',
        price: '$35/año',
        url: 'https://www.activaqr.com/contacto-digital-v2',
        keywords: ['tarjeta digital', 'vcard', 'contacto', 'qr', 'agenda', 'guardar', 'whatsapp', 'teléfono', 'celular', 'número', 'perfil', 'negocio', 'emprendedor', 'vender', 'cliente'],
        pains: [
            'Gastar dinero en tarjetas que terminan en la basura',
            'Perder clientes por cambio de número',
            'Perder tiempo deletreando correos o nombres',
            'Que te recomienden pero no te encuentren',
            'Ser un "inquilino" en el WhatsApp del cliente'
        ],
        emotionalTriggers: [
            'Muerte comercial por anonimato',
            'Lucha contra la irrelevancia y el olvido',
            'Tu cara siendo pisoteada en el suelo',
            'Ser el primero cuando te necesiten'
        ],
        reptileArguments: [
            'Esa venta que se llevó otro porque no te encontró, ¿vale más que los $35?',
            'Si pierdes un solo trabajo de $100, el plan ya se pagó tres veces',
            'Vendes un seguro contra la pérdida de leads',
            'De "inquilino" a "propietario" en su lista de contactos'
        ],
        angle: 'La vacuna contra el olvido — asegura que tu cara sea lo primero que vean cuando necesiten tu servicio',
        upsellPath: ['contacto_business', 'blindaje_lopdp']
    },
    {
        id: 'contacto_business',
        name: 'Contacto Business',
        price: '$100/año',
        url: 'https://www.activaqr.com/contacto-business-v2',
        keywords: ['vitrina', 'digital', 'negocio', 'promoción', 'promocion', 'actualizar', 'cambios', 'precios', 'ofertas', 'catálogo', 'fotos', 'teléfono', 'whatsapp', 'app', 'inicio'],
        pains: [
            'Depender del algoritmo de redes sociales (solo 3% de alcance)',
            'Perder horas avisando cambios uno por uno',
            'Cliente ve promo vieja y llega a pedir algo que ya no hay',
            'Ser un inquilino en Instagram/Facebook'
        ],
        emotionalTriggers: [
            'Independencia algorítmica',
            'Recuperar el 100% de visibilidad',
            'Instalarse como app en la pantalla de inicio del cliente',
            'El empleado de ventas más barato: 24/7 sin horas extra'
        ],
        reptileArguments: [
            '$100 al año es menos que un mes de publicidad en Facebook que nadie vio',
            'Comparado con un Community Manager ($2,400/año), esto es un regalo',
            'Si Facebook cierra tu cuenta mañana, ¿cómo te comunicas con tus clientes?'
        ],
        angle: 'De inquilino a dueño — recupera el control de tu audiencia',
        upsellPath: ['catalogo', 'blindaje_lopdp']
    },
    {
        id: 'catalogo',
        name: 'Business + Catálogo',
        price: '$200/año',
        url: 'https://www.activaqr.com/contacto-business-catalogo-v2',
        keywords: ['catálogo', 'catalogo', 'productos', 'carrito', 'pedido', 'comprar', 'orden', 'menu', 'restaurante', 'comida', 'platos', 'delivery', 'stock', 'inventario', 'precios'],
        pains: [
            'El "catálogo humano": responder precios 50 veces al día',
            'Perder tiempo operativo en lugar de vender',
            'Depender de apps de delivery que cobran 30% de comisión',
            'Que los clientes pidan productos agotados'
        ],
        emotionalTriggers: [
            'Terminal de Pedidos Autónoma',
            'El fin del "catálogo humano"',
            '100% de la venta íntegra (sin comisiones)',
            'Autogestión del cliente'
        ],
        reptileArguments: [
            'Apps de delivery cobran hasta 30%. Con ActivaQR la venta llega íntegra',
            'Mientras tu competencia espera al diseñador, tú actualizas en 10 segundos',
            '¿Cuánto tiempo pierdes a la semana explicando precios?'
        ],
        angle: 'Transforma tu WhatsApp en una terminal de pedidos 24/7',
        upsellPath: ['tienda_linea', 'pasarela_pagos', 'blindaje_lopdp'],
        linkedServices: ['pasarela_pagos']
    },
    {
        id: 'tienda_linea',
        name: 'Sitio Web Completo',
        price: '$1,000',
        url: 'https://www.activaqr.com/sitio-web-completo-v2',
        keywords: ['página web', 'pagina web', 'sitio web', 'ecommerce', 'tienda', 'online', 'seo', 'google', 'posicionamiento', 'blog', 'dominio', 'hosting', 'marca', 'autoridad'],
        pains: [
            'Ser invisible cuando los grandes clientes buscan en Google',
            'Depender de terceros para tu presencia digital',
            'Parecer un negocio improvisado frente a la competencia',
            'No tener un activo digital propio'
        ],
        emotionalTriggers: [
            'Soberanía y Autoridad Total',
            'Centro de Mando Digital',
            'De inquilino a propietario de tu imperio',
            'Lo único que nadie te puede quitar'
        ],
        reptileArguments: [
            'Si un cliente busca en Google y no apareces, ya perdiste la venta',
            'Las redes sociales son terreno prestado. Tu sitio web es tu activo',
            '$1,000 vs $2,400/año de un Community Manager que no te construye un activo'
        ],
        angle: 'Construye tu imperio digital con infraestructura propia',
        upsellPath: ['auditoria'],
        linkedServices: ['blindaje_lopdp', 'pasarela_pagos']
    },
    {
        id: 'auditoria',
        name: 'Auditoría Operativa',
        price: '$2,400 (lifetime)',
        url: 'https://www.activaqr.com/auditoria-operativa',
        keywords: ['auditoría', 'auditoria', 'control', 'calidad', 'supervisión', 'supervision', 'reporte', 'quejas', 'feedback', 'operación', 'operacion', 'personal', 'clientes', 'hotel', 'restaurante', 'franquicia'],
        pains: [
            'Ser el último en enterarte que tu negocio se hunde',
            'Empleados que ocultan problemas por miedo',
            'Enterarte de los problemas por Google Reviews (demasiado tarde)',
            'No saber qué pasa cuando no estás presente'
        ],
        emotionalTriggers: [
            'La Paradoja del Juez y Parte',
            'Ceguera Operativa → Control Total',
            'Auditor Incógnito 24/7',
            'Paz Mental'
        ],
        reptileArguments: [
            '¿Cuánto te cuesta que un cliente insatisfecho se vaya en silencio?',
            'Si prefieres seguir "ciego", nos vemos en Google Reviews',
            'En 24 meses se amortiza solo. Luego es gratis para siempre'
        ],
        angle: 'El seguro de supervivencia de tu marca — entérate antes de que sea tarde',
        upsellPath: []
    },
    {
        id: 'blindaje_lopdp',
        name: 'Blindaje LOPDP',
        price: '$300 setup + $15/mes',
        url: 'https://www.activaqr.com/privacidad',
        keywords: ['protección', 'datos', 'legal', 'lopdp', 'privacidad', 'multa', 'sanción', 'sancion', 'consentimiento', 'registro', 'cumplimiento', 'ley', 'superintendencia', 'rat'],
        pains: [
            'Multas de hasta $194k por no tener consentimiento trazable',
            'Capturar datos sin evidencia legal',
            'No poder demostrar cumplimiento ante la Superintendencia',
            'Riesgo de sanción por no tener RAT'
        ],
        emotionalTriggers: [
            'El costo de la No-Diligencia',
            'La FEF fue multada $194k — ¿tu negocio es más grande que la FEF?',
            'Blindaje ante el depredador regulatorio',
            'Tranquilidad patrimonial'
        ],
        reptileArguments: [
            'Si guardas contactos sin permiso explícito, te expones a una multa',
            'El consentimiento en WhatsApp no vale — necesitas IP, fecha y hora',
            'Por $15/mes blindas tu negocio contra la Superintendencia'
        ],
        angle: 'Protege tu patrimonio con el Registro de Actividades de Tratamiento automatizado',
        linkedServices: ['estados_whatsapp']
    },
    {
        id: 'estados_whatsapp',
        name: 'Estados WhatsApp',
        price: '$15/mes',
        url: 'https://www.activaqr.com',
        keywords: ['estados', 'whatsapp', 'promoción', 'promocion', 'automatización', 'automatizacion', 'marketing', 'difusión', 'dificultad', 'contactos', 'audiencia', 'ventas'],
        pains: [
            'El 90% de los prospectos se pierden porque no guardan tu número',
            'Sin guardado mutuo, tus estados son invisibles',
            'Perder tiempo registrando contactos uno por uno',
            'No tener una base de datos que crezca sola'
        ],
        emotionalTriggers: [
            'Sistema de Crecimiento de Audiencia Automatizado',
            'Tu audiencia creciendo sola mientras duermes',
            'El activo comercial que se construye solo',
            'Ingreso recurrente de alta escalabilidad'
        ],
        reptileArguments: [
            'Registrar un contacto manual toma 2 min. 100 prospectos = 3 horas. ¿Vale tu tiempo $5/hora?',
            '500 contactos que ven tus estados valen miles en ventas',
            'Por $15/mes tienes una secretaria digital que no descansa'
        ],
        angle: 'Tu audiencia creciendo sola mientras tú trabajas en lo importante'
    }
];

// Additional services for reference
export const ADDITIONAL_SERVICES = [
    {
        id: 'pasarela_pagos',
        name: 'Pasarela de Pagos Payphone',
        price: '$150 setup único',
        keywords: ['pagos', 'payphone', 'tarjeta', 'cobro', 'banco', 'transferencia'],
        angle: 'Tu catálogo que no solo informa, sino que cobra directamente'
    },
    {
        id: 'acceso_wifi',
        name: 'Acceso WiFi Estratégico',
        price: '$45',
        keywords: ['wifi', 'internet', 'clave', 'conexión'],
        angle: 'El ritual de la clave del WiFi convertido en funnel de captura'
    },
    {
        id: 'formularios_pedido',
        name: 'Formularios de Pedido Estructurados',
        price: '$60/año',
        keywords: ['formulario', 'pedido', 'orden', 'estructurado'],
        angle: 'Pedidos que llegan organizados y se registran automáticamente'
    }
];
