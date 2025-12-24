
import { Lead, ParsedName } from '../types';
import { parseName } from './textHelpers';

export const exportLeadsToCSV = (leads: Lead[]) => {
  // Define headers
  const headers = [
    'Nombre Comercial',
    'Actividad',
    'Clasificación',
    'Categoría',
    'Razón Social',
    'Provincia',
    'Cantón',
    'Parroquia',
    'Teléfono Principal',
    'Teléfono Secundario',
    'Email',
    'Web',
    'Persona Contacto',
    'Email Contacto',
    'Estado Original',
    'CRM Status (Nuevo)',
    'Notas Interacción', // New Column
    'Email Sincronizado'
  ];

  // Map data to CSV rows
  const rows = leads.map(lead => [
    `"${lead.nombreComercial}"`,
    `"${lead.actividad}"`,
    `"${lead.clasificacion}"`,
    `"${lead.categoria}"`,
    `"${lead.razonSocial}"`,
    `"${lead.provincia}"`,
    `"${lead.canton}"`,
    `"${lead.parroquia}"`,
    `"${lead.telefonoPrincipal}"`,
    `"${lead.telefonoSecundario}"`,
    `"${lead.email}"`,
    `"${lead.web}"`,
    `"${lead.personaContacto}"`,
    `"${lead.emailContacto}"`,
    `"${lead.estado}"`,
    `"${lead.status}"`,
    `"${lead.lastInteractionNote || ''}"`, // Export Note
    `"${lead.emailSynced ? 'SI' : 'NO'}"`
  ]);

  downloadCSV(headers, rows, `crm_turismo_backup_${getDateString()}.csv`);
};

export const generateMarketingCSV = (leads: Lead[]) => {
  // Filters: Has email + Has not been marked as 'not_interested'
  const marketingLeads = leads.filter(l => 
    (l.email && l.email.includes('@') || l.emailContacto && l.emailContacto.includes('@')) &&
    l.status !== 'not_interested'
  );

  const headers = [
    'Email Address',
    'First Name',
    'Last Name',
    'Company',
    'Phone',
    'Tags', // Important for segmentation
    'Notes' // Context for marketing tool
  ];

  const rows = marketingLeads.map(lead => {
    // Priority to contact email, then general email
    const finalEmail = (lead.emailContacto && lead.emailContacto.includes('@')) ? lead.emailContacto : lead.email;
    
    // Parse name for personalization
    const rawName = lead.personaContacto || lead.razonSocial;
    const { firstName, lastName } = parseName(rawName);

    // Generate Tags based on CRM status
    const tags = [];
    tags.push('Importado CRM');
    if (lead.status === 'initial_sent') tags.push('Interesado WhatsApp');
    if (lead.status === 'responded') tags.push('Respondio WhatsApp');
    if (lead.status === 'no_whatsapp') tags.push('Solo Email');
    
    return [
      `"${finalEmail}"`,
      `"${firstName}"`,
      `"${lastName}"`,
      `"${lead.nombreComercial}"`,
      `"${lead.telefonoPrincipal}"`,
      `"${tags.join(',')}"`,
      `"${lead.lastInteractionNote || ''}"`
    ];
  });

  downloadCSV(headers, rows, `marketing_import_${getDateString()}.csv`);
  return marketingLeads.map(l => l.id); // Return IDs to mark as synced
};

const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const getDateString = () => new Date().toISOString().slice(0,10);
