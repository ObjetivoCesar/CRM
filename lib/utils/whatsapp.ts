// Utility for detecting gender from Spanish names and generating personalized messages

const MALE_NAMES = [
    'JUAN', 'JOSE', 'LUIS', 'CARLOS', 'MIGUEL', 'PEDRO', 'JORGE', 'FRANCISCO', 'ANTONIO',
    'FERNANDO', 'MANUEL', 'ROBERTO', 'EDUARDO', 'DANIEL', 'RAFAEL', 'RICARDO', 'ALBERTO',
    'DIEGO', 'SERGIO', 'PABLO', 'CESAR', 'JAVIER', 'ANDRES', 'MARIO', 'VICTOR', 'RAUL',
    'RODRIGO', 'GUILLERMO', 'GUSTAVO', 'ENRIQUE', 'OSCAR', 'RAMON', 'ALFREDO', 'MARCO',
    'WILSON', 'EDISON', 'ROBERT', 'ANGEL', 'ELADIO', 'JEFFREY', 'FELIPE', 'SANTIAGO',
    'ALVARO', 'LEONARDO', 'JULIO', 'WILMAN', 'REINALDO', 'SALVADOR', 'PAUL', 'ALONZO'
];

const FEMALE_NAMES = [
    'MARIA', 'CARMEN', 'ROSA', 'ANA', 'LUCIA', 'MARTHA', 'GLORIA', 'PATRICIA', 'LAURA',
    'ELENA', 'SILVIA', 'BEATRIZ', 'TERESA', 'MONICA', 'ANGELA', 'SANDRA', 'DIANA',
    'PAOLA', 'ESPERANZA', 'PIEDAD', 'LOURDES', 'ELIZABETH', 'ESTEFANIA', 'BLANCA',
    'ENRIQUETA', 'ORFELINA', 'CARMELA', 'ESTIN', 'JOSEFINA', 'YOLANDA', 'ROSARIO',
    'BETHIL', 'VICENTA', 'INES', 'KARINA', 'ALEJANDRA', 'SILVANA', 'MERLY', 'IPATIA'
];

export interface PersonName {
    firstName: string;
    lastName: string;
    fullName: string;
    gender: 'M' | 'F' | 'U'; // Male, Female, Unknown
}

/**
 * Parses a full name and detects gender based on first name
 */
export function parsePersonName(fullName: string): PersonName {
    if (!fullName || fullName.trim() === '') {
        return {
            firstName: '',
            lastName: '',
            fullName: '',
            gender: 'U'
        };
    }

    const nameParts = fullName.trim().toUpperCase().split(' ').filter(p => p.length > 0);

    if (nameParts.length === 0) {
        return {
            firstName: '',
            lastName: '',
            fullName: fullName.trim(),
            gender: 'U'
        };
    }

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Detect gender
    let gender: 'M' | 'F' | 'U' = 'U';

    if (MALE_NAMES.includes(firstName)) {
        gender = 'M';
    } else if (FEMALE_NAMES.includes(firstName)) {
        gender = 'F';
    } else {
        // Try to detect by common endings
        if (firstName.endsWith('A') && !firstName.endsWith('IA')) {
            gender = 'F';
        } else if (firstName.endsWith('O')) {
            gender = 'M';
        }
    }

    return {
        firstName,
        lastName,
        fullName: fullName.trim(),
        gender
    };
}

/**
 * Generates personalized WhatsApp message
 */
export interface MessageTemplate {
    videoUrl: string;
    greeting: string;
    intro: string;
    benefits: string[];
    videoPrompt: string;
    closing: string;
}

export const DEFAULT_TEMPLATE: MessageTemplate = {
    videoUrl: 'https://youtube.com/shorts/s9fogp9aRtI?si=MSmFAKpbz6JKud1t',
    greeting: '{firstName}, buen día.',
    intro: 'Le iba a llamar por WhatsApp, pero con esto de la inseguridad es probable que desconfíes, así que mejor le escribo.\n\nSoy César Reyes y ayudo a negocios turísticos de alojamiento como {businessName} a:',
    benefits: [
        'Captar clientes directos sin pagar comisiones a Booking u otras plataformas de reservas.',
        'Que encuentren su marca en Google (no en redes sociales)'
    ],
    videoPrompt: 'Esto se logra POSICIONANDO TU MARCA.\n\n¿Quieres saber si estás POSICIONAD{genderSuffix}? Mira este video de 41 segundos donde te explico cómo saber si REALMENTE lo estás 👇',
    closing: 'Si tiene sentido para {businessName}, agendamos una llamada.\n\n¿Qué le parece?'
};

export function generateWhatsAppMessage(
    contactName: string,
    businessName: string,
    template: MessageTemplate = DEFAULT_TEMPLATE
): string {
    const parsedName = parsePersonName(contactName);
    const firstName = parsedName.firstName || parsedName.lastName.split(' ')[0] || 'Estimado/a';
    const genderSuffix = parsedName.gender === 'F' ? 'A' : 'O';

    const message = `${template.greeting.replace('{firstName}', firstName)}

${template.intro.replace('{businessName}', businessName)}
- ${template.benefits.join('\n- ')}

${template.videoPrompt.replace('{genderSuffix}', genderSuffix)}

${template.videoUrl}

${template.closing.replace('{businessName}', businessName)}`;

    return message;
}

/**
 * Generates WhatsApp Web URL with pre-filled message
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/\D/g, '');

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
