import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(process.cwd(), 'docs', 'Ejemplo de base de datos sector turismo - Hoja 1.csv');
const outputPath = path.join(process.cwd(), 'docs', 'BASE_CORREGIDA_PARA_SUPABASE.csv');

try {
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    const cleanedLines = lines.map((line, index) => {
        if (!line.trim()) return null; // Skip empty lines

        // Header line (index 0) is likely fine, but let's check
        if (index === 0) {
            // Remove trailing semicolon if present
            return line.replace(/;$/, '');
        }

        // Data lines: remove leading quote and trailing quote/semicolon
        // Pattern: Starts with ", ends with "; or "
        let cleaned = line.trim();

        if (cleaned.startsWith('"')) {
            cleaned = cleaned.substring(1);
        }

        if (cleaned.endsWith('";')) {
            cleaned = cleaned.substring(0, cleaned.length - 2);
        } else if (cleaned.endsWith('"')) {
            cleaned = cleaned.substring(0, cleaned.length - 1);
        } else if (cleaned.endsWith(';')) {
            cleaned = cleaned.substring(0, cleaned.length - 1);
        }

        return cleaned;
    }).filter(line => line !== null);

    fs.writeFileSync(outputPath, cleanedLines.join('\n'), 'utf-8');
    console.log(`Successfully created corrected CSV at: ${outputPath}`);

} catch (error) {
    console.error('Error processing CSV:', error);
}
