import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const csvPath = path.join(process.cwd(), 'docs', 'BASE_CORREGIDA_PARA_SUPABASE.csv');

try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const results = Papa.parse(fileContent, { header: false }); // Parse as arrays

    if (results.errors.length > 0) {
        console.log('Parse errors:', results.errors);
    }

    const rows = results.data;
    if (rows.length === 0) {
        console.log('No rows found');
        process.exit(0);
    }

    const headerLength = (rows[0] as any[]).length;
    console.log(`Header columns: ${headerLength}`);

    let issues = 0;
    rows.forEach((row: any, index) => {
        if (row.length !== headerLength) {
            // Ignore last empty line if it exists
            if (row.length === 1 && row[0] === '') return;

            console.log(`Row ${index + 1} mismatch: Found ${row.length}, expected ${headerLength}`);
            issues++;
        }
    });

    if (issues === 0) {
        console.log('All rows have consistent column counts.');
    } else {
        console.log(`Found ${issues} rows with column mismatches.`);
    }

} catch (error) {
    console.error('Error:', error);
}
