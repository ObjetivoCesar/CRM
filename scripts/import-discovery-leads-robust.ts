
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPER FUNCTIONS ---

function cleanString(val: any): string | null {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'S/N' || trimmed.toLowerCase() === 'no aplica' || trimmed === '0' || trimmed === '-') return null;
    return trimmed;
}

function parseInteger(val: any): number | null {
    if (typeof val === 'number') return val;
    const cleaned = cleanString(val);
    if (!cleaned) return null;

    // Remove dots/commas if they are just formatting (careful with decimals)
    // Assuming integers for "total_trabajadores", etc.
    const num = parseInt(cleaned.replace(/\./g, '').replace(/,/g, ''), 10);
    return isNaN(num) ? null : num;
}

// Basic date cleaner (just keeps as text for now if format varies, or could try to standardize)
// The schema has dates as TEXT, so strict ISO conversion isn't blocking, but good for cleanup.
function cleanDate(val: any): string | null {
    return cleanString(val);
}

// --- ZOD SCHEMA ---
// This matches the cleanup logic we want to apply before inserting info 'discovery_leads'
const leadSchema = z.object({
    ruc: z.string().nullable(),
    nombre_comercial: z.string().min(1, "Nombre comercial is required"),
    // ... map other fields dynamically or explicitly if key business logic depends on them
});


// Helper to normalize headers to snake_case lowercase
function normalizeHeader(header: string): string {
    return header
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[()]/g, '')
        .replace(/\//g, '_')
        .replace(/-/g, '_')
        .replace(/_{2,}/g, '_');
}

async function importLeads() {
    try {
        // Using the FULL dataset from Google Sheets (30,800+ records)
        const csvPath = path.join(process.cwd(), 'docs', 'Consolidado Nacional 2025 activos MINTUR 10 - Consolidado.csv');

        if (!fs.existsSync(csvPath)) {
            console.error(`CSV file not found at: ${csvPath}`);
            return;
        }

        console.log(`Reading CSV file from: ${csvPath}`);
        const fileContent = fs.readFileSync(csvPath, 'utf-8');

        // Prepare error log
        const errorLogPath = path.join(process.cwd(), 'logs', 'import_errors_discovery.csv');
        if (!fs.existsSync(path.dirname(errorLogPath))) {
            fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
        }
        const errorStream = fs.createWriteStream(errorLogPath);
        errorStream.write('Row,Error,Data\n');

        Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            transformHeader: (header) => normalizeHeader(header), // Auto-normalize headers!
            complete: async (results) => {
                console.log(`Parsed ${results.data.length} records. Starting processing...`);
                console.log('Headers found:', results.meta.fields);
                if (results.data.length > 0) {
                    console.log('First record keys:', Object.keys(results.data[0] as any));
                    console.log('First record sample:', results.data[0]);
                }

                let importedCount = 0;
                let ignoredCount = 0;
                let errorCount = 0;
                const batchSize = 100;
                let batch: any[] = [];

                const totalRecords = results.data.length;

                for (let i = 0; i < totalRecords; i++) {
                    const record = results.data[i] as any;

                    // 1. Basic Validity Check
                    if (!record['nombre_comercial'] && !record['ruc']) {
                        ignoredCount++;
                        continue;
                    }

                    // 2. Map & Clean Data
                    // We map CSV columns (headers) to DB columns (snake_case)
                    // Note: We are trusting the CSV headers match our expectations or we assume order. 
                    // Better to use explicit mapping if headers change.

                    const cleanRecord: any = {
                        ruc: cleanString(record['ruc']),
                        codigo_establecimiento_ruc: cleanString(record['codigo_establecimiento_ruc']),
                        estado_ruc: cleanString(record['estado_ruc']),
                        nombre_comercial: cleanString(record['nombre_comercial']) || "SIN NOMBRE",
                        numero_registro: cleanString(record['numero_registro']),
                        fecha_registro: cleanDate(record['fecha_registro']),
                        actividad_modalidad: cleanString(record['actividad_modalidad']),
                        clasificacion: cleanString(record['clasificacion']),
                        categoria: cleanString(record['categoria']),
                        razon_social_propietario: cleanString(record['razon_social_propietario']),
                        representante_legal: cleanString(record['representante_legal']),
                        tipo_personeria_juridica: cleanString(record['tipo_personeria_juridica']),
                        personeria_juridica: cleanString(record['personeria_juridica']),
                        provincia: cleanString(record['provincia']),
                        canton: cleanString(record['canton']),
                        parroquia: cleanString(record['parroquia']),
                        tipo_parroquia: cleanString(record['tipo_parroquia']),
                        direccion: cleanString(record['direccion']),
                        referencia_direccion: cleanString(record['referencia_direccion']),
                        latitud: cleanString(record['latitud']),
                        longitud: cleanString(record['longitud']),
                        zona_turistica: cleanString(record['zona_turistica']),
                        administracion_zonal: cleanString(record['administracion_zonal']),
                        sector_turistico: cleanString(record['sector_turistico']),
                        telefono_principal: cleanString(record['telefono_principal']),
                        telefono_secundario: cleanString(record['telefono_secundario']),
                        correo_electronico: cleanString(record['correo_electronico']),
                        direccion_web: cleanString(record['direccion_web']),
                        persona_contacto: cleanString(record['persona_contacto']),
                        correo_persona_contacto: cleanString(record['correo_persona_contacto']),
                        tipo_local: cleanString(record['tipo_local']),
                        tipo_establecimiento: cleanString(record['tipo_establecimiento']),
                        nombre_franquicia_cadena: cleanString(record['nombre_franquicia_cadena']),
                        estado_registro_establecimiento: cleanString(record['estado_registro_establecimiento']),
                        sistema_origen: cleanString(record['sistema_origen']),
                        estado_registro_con_deuda: cleanString(record['estado_registro_con_deuda']),

                        // Numeric fields
                        total_trabajadores_hombres: parseInteger(record['total_trabajadores_hombres']),
                        total_trabajadores_mujeres: parseInteger(record['total_trabajadores_mujeres']),
                        total_trabajadores_hombres_discapacidad: parseInteger(record['total_trabajadores_hombres_discapacidad']),
                        total_trabajadores_mujeres_discapacidad: parseInteger(record['total_trabajadores_mujeres_discapacidad']),
                        total_trabajadores: parseInteger(record['total_trabajadores']),
                        total_habitaciones_tiendas: parseInteger(record['total_habitaciones_tiendas']),
                        total_camas: parseInteger(record['total_camas']),
                        total_plazas: parseInteger(record['total_plazas']),
                        total_capacidades_servicios_complementarios: parseInteger(record['total_capacidades_servicios_complementarios']),
                        total_mesas: parseInteger(record['total_mesas']),
                        total_capacidades_personas: parseInteger(record['total_capacidades_personas']),

                        // More Text fields
                        titulo_habilitante: cleanString(record['titulo_habilitante']),
                        fecha_emision_titulo: cleanDate(record['fecha_emision_titulo']),
                        fecha_caducidad_titulo: cleanDate(record['fecha_caducidad_titulo']),
                        tipo_tramite: cleanString(record['tipo_tramite']),
                        fecha_tramite: cleanDate(record['fecha_tramite']),
                        modificacion_sistema: cleanString(record['modificacion_sistema']),
                        observaciones_modificacion_sistema: cleanString(record['observaciones_modificacion_sistema']),

                        // Default status
                        status: 'pending'
                    };

                    batch.push(cleanRecord);

                    if (batch.length >= batchSize) {
                        const { error } = await supabase.from('discovery_leads').insert(batch);
                        if (error) {
                            console.error(`Error inserting batch at index ${i}:`, error.message);
                            // Log specific error for this batch
                            errorStream.write(`${i},"${error.message}","Batch failed"\n`);
                            errorCount += batch.length;
                        } else {
                            importedCount += batch.length;
                            process.stdout.write(`\rImported: ${importedCount} / ${totalRecords}`);
                        }
                        batch = []; // Clear batch
                    }
                }

                // Final batch
                if (batch.length > 0) {
                    const { error } = await supabase.from('discovery_leads').insert(batch);
                    if (error) {
                        console.error('Error inserting final batch:', error.message);
                        errorStream.write(`FINAL,"${error.message}","Batch failed"\n`);
                        errorCount += batch.length;
                    } else {
                        importedCount += batch.length;
                    }
                }

                console.log(`\n\nImport complete!`);
                console.log(`Success: ${importedCount}`);
                console.log(`Ignored (Empty): ${ignoredCount}`);
                console.log(`Failed (DB Error): ${errorCount}`);
                console.log(`Check logs/import_errors_discovery.csv for details.`);

                errorStream.end();
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
