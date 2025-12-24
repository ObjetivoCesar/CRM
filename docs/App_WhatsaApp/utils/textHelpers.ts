import { ParsedName } from '../types';

export const cleanPhone = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, ''); // Remove non-digits
  
  // Ecuador logic
  if (cleaned.startsWith('0')) {
    cleaned = '593' + cleaned.substring(1);
  } else if (!cleaned.startsWith('593') && cleaned.length === 9) {
    // If it's a 9 digit cell without 0? Rare, but just in case
    cleaned = '593' + cleaned;
  }
  
  return cleaned;
};

export const parseName = (fullName: string): ParsedName => {
  if (!fullName) return { firstName: 'Amigo/a', lastName: '', gender: 'M' };
  
  const parts = fullName.trim().split(/\s+/).map(p => p.toUpperCase());
  
  let firstName = '';
  let lastName = '';
  
  // Latin American naming convention heuristic: 
  // Often: APPATERNO APMATERNO NOMBRE1 NOMBRE2
  if (parts.length >= 3) {
     lastName = parts[0];
     firstName = parts.length === 4 ? parts[2] : parts[parts.length - 1];
  } else if (parts.length === 2) {
      lastName = parts[0];
      firstName = parts[1];
  } else {
      firstName = parts[0];
  }
  
  // Gender detection logic
  const nameForGender = firstName;
  let gender: 'M' | 'F' = 'M';
  
  if (nameForGender.endsWith('A')) {
      gender = 'F';
  }
  
  // Override for common exceptions
  const maleExceptions = ['JOSHUA', 'LUKA', 'NICOLA', 'JOSE'];
  const femaleExceptions = ['PIEDAD', 'RAQUEL', 'ESTHER', 'RUTH', 'LIZ', 'CARMEN', 'BEATRIZ'];
  
  if (maleExceptions.includes(nameForGender)) gender = 'M';
  if (femaleExceptions.some(ex => nameForGender.includes(ex))) gender = 'F';

  // Capitalize for display
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return {
    firstName: capitalize(firstName),
    lastName: capitalize(lastName),
    gender
  };
};

export const generateWhatsAppMessage = (
  contactName: string, 
  businessName: string, 
  gender: 'M' | 'F'
): string => {
  const genderWord = gender === 'F' ? 'POSICIONADA' : 'POSICIONADO';
  
  // Fallback if contact name is empty
  const nameDisplay = contactName ? contactName : 'Amigo/a';
  
  // Nota: Se usa "Le iba a llamar" (Usted) para la apertura por respeto.
  // Se usa "¿Quieres saber...?" (Tú) para el gancho del video para mayor cercanía/impacto publicitario.
  return `${nameDisplay}, buen día.
Le iba a llamar por WhatsApp, pero con esto de la inseguridad es probable que desconfíes, así que mejor le escribo.
Soy César Reyes y ayudo a negocios turísticos de alojamiento como ${businessName} a:
- Captar clientes directos sin pagar comisiones a Booking u otras plataformas de reservas.
- Que encuentren su marca en Google (no en redes sociales)
Esto se logra POSICIONANDO TU MARCA.
¿Quieres saber si estás ${genderWord}? Mira este video de 41 segundos donde te explico cómo saber si REALMENTE lo estás 👇
https://youtube.com/shorts/s9fogp9aRtI?si=MSmFAKpbz6JKud1t
Si tiene sentido para ${businessName}, agendamos una llamada.
¿Qué le parece?`;
};
