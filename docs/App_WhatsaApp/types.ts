
export interface Lead {
  id: string;
  nombreComercial: string;
  actividad: string;
  clasificacion: string;
  categoria: string;
  razonSocial: string;
  provincia: string;
  canton: string;
  parroquia: string;
  telefonoPrincipal: string;
  telefonoSecundario: string;
  email: string;
  web: string;
  personaContacto: string;
  emailContacto: string;
  estado: string; // From 'Estado' or 'Columna1'
  status: 'pending' | 'initial_sent' | 'responded' | 'not_interested' | 'converted' | 'contacted' | 'no_whatsapp'; // CRM Statuses
  emailSynced?: boolean; // True if exported to marketing tool
  lastInteractionNote?: string; // Notes about the response or rejection reason
}

export interface ParsedName {
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
}
