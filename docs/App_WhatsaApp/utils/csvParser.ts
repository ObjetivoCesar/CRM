import { Lead } from '../types';

export const parseCSV = (csvText: string): Lead[] => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');

  const leads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV parsing handling quotes
    const row: string[] = [];
    let currentRow = '';
    let insideQuotes = false;
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (j + 1 < line.length && line[j + 1] === '"') {
          currentRow += '"';
          j++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentRow);
        currentRow = '';
      } else {
        currentRow += char;
      }
    }
    row.push(currentRow);

    // Safely get index
    const getVal = (idx: number) => row[idx] ? row[idx].trim() : '';

    if (row.length > 5) {
       // Determine internal status based on the "Estado" or "Columna1" comments
       const rawEstado = (getVal(14) + " " + getVal(15)).toLowerCase();
       let status: Lead['status'] = 'pending';
       
       if (rawEstado.includes('contestaron') || rawEstado.includes('interesado')) status = 'responded';
       if (rawEstado.includes('envie') || rawEstado.includes('chateado') || rawEstado.includes('mensaje')) status = 'initial_sent';
       if (rawEstado.includes('no interesa')) status = 'not_interested';
       
       leads.push({
        id: `lead-${i}`,
        nombreComercial: getVal(0),
        actividad: getVal(1),
        clasificacion: getVal(2),
        categoria: getVal(3),
        razonSocial: getVal(4),
        provincia: getVal(5),
        canton: getVal(6),
        parroquia: getVal(7),
        telefonoPrincipal: getVal(8),
        telefonoSecundario: getVal(9),
        email: getVal(10),
        web: getVal(11),
        personaContacto: getVal(12),
        emailContacto: getVal(13),
        estado: getVal(14) + " " + getVal(15),
        status: status
       });
    }
  }

  return leads;
};