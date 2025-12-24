
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importLeads() {
    try {
        // Updated to point to the file the user is struggling with
        const csvPath = path.join(process.cwd(), 'docs', 'BASE_FINAL_SUPABASE 2.csv');

        if (!fs.existsSync(csvPath)) {
            console.error(`CSV file not found at: ${csvPath}`);
            return;
        }

        console.log(`Reading CSV file from: ${csvPath}`);
        const fileContent = fs.readFileSync(csvPath, 'utf-8');

        Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';', // CRITICAL: The file uses semicolons!
            complete: async (results) => {
                console.log(`Parsed ${results.data.length} records.`);

                let importedCount = 0;
                let errorCount = 0;
                const batchSize = 100;
                let batch: any[] = [];

                const totalRecords = results.data.length;

                for (let i = 0; i < totalRecords; i++) {
                    const record = results.data[i] as any;

                    // Simple validation: Ensure at least a RUC or Name exists
                    if (!record['ruc'] && !record['nombre_comercial']) {
                        continue;
                    }

                    // Map empty strings to null to keep DB clean
                    const cleanRecord: any = {};
                    Object.keys(record).forEach(key => {
                        // DB columns are snake_case, ensuring we lower case just in case
                        const dbKey = key.trim().toLowerCase();
                        let value = record[key];

                        if (typeof value === 'string') {
                            value = value.trim();
                            if (value === '') value = null;
                        }

                        // Remove arbitrary columns not in our table schema to be safe
                        // But since correct mapped table has extra columns, we pass everything that matches known headers
                        cleanRecord[dbKey] = value;
                    });

                    // Force status default
                    cleanRecord['status'] = 'pending';

                    batch.push(cleanRecord);

                    if (batch.length >= batchSize) {
                        const { error } = await supabase.from('tabla_prueba_final').insert(batch);
                        if (error) {
                            console.error(`Error inserting batch at index ${i}:`, error.message);
                            errorCount += batch.length;
                        } else {
                            importedCount += batch.length;
                            process.stdout.write(`\rImported: ${importedCount} / ${totalRecords}`);
                        }
                        batch = [];
                    }
                }

                // Final batch
                if (batch.length > 0) {
                    const { error } = await supabase.from('tabla_prueba_final').insert(batch);
                    if (error) {
                        console.error('Error inserting final batch:', error.message);
                        errorCount += batch.length;
                    } else {
                        importedCount += batch.length;
                    }
                }

                console.log(`\n\nImport complete!`);
                console.log(`Success: ${importedCount}`);
                console.log(`Failed: ${errorCount}`);
            },
            error: (error: any) => {
                console.error('Error parsing CSV:', error);
            }
        });

    } catch (error) {
        console.error('Error importing leads:', error);
    }
}

importLeads();
