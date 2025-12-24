import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const inputPath = path.join(process.cwd(), 'docs', 'Ejemplo de base de datos sector turismo - Hoja 1.csv');
const outputPath = path.join(process.cwd(), 'docs', 'BASE_FINAL_SUPABASE.csv');

try {
    const fileContent = fs.readFileSync(inputPath, 'utf-8');

    // Manual line splitting to inspect raw structure
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim());

    // We know the file has valid quoted strings but they might be double-double quoted?
    // Let's use Papa Parse on the raw content first with a lenient config

    const results = Papa.parse(fileContent, {
        header: false,
        skipEmptyLines: true,
        quoteChar: '"',
        escapeChar: '"',
    });

    if (results.errors.length > 0) {
        console.log('Parse errors in original:', results.errors);
        // Fallback: Naive line processing if standard parse fails heavily
        // But likely the previous "fix" script ruined it by just stripping start/end.
    }

    // Prepare headers (row 0)
    // We want to force specific headers.
    const englishHeaders = [
        "ruc", "codigo_establecimiento_ruc", "estado_ruc", "nombre_comercial", "numero_registro", "fecha_registro",
        "actividad_modalidad", "clasificacion", "categoria", "razon_social_propietario", "representante_legal",
        "tipo_local", "tipo_establecimiento", "nombre_franquicia_cadena", "tipo_personeria_juridica", "personeria_juridica",
        "provincia", "canton", "parroquia", "tipo_parroquia", "direccion", "referencia_direccion", "telefono_principal",
        "telefono_secundario", "latitud", "longitud", "correo_electronico", "direccion_web", "estado_registro_establecimiento",
        "sistema_origen", "estado_registro_con_deuda", "total_trabajadores_hombres", "total_trabajadores_mujeres",
        "total_trabajadores_hombres_discapacidad", "total_trabajadores_mujeres_discapacidad", "total_trabajadores",
        "total_habitaciones_tiendas", "total_camas", "total_plazas", "total_capacidades_servicios_complementarios",
        "total_mesas", "total_capacidades_personas", "titulo_habilitante", "fecha_emision_titulo", "fecha_caducidad_titulo",
        "tipo_vehiculo", "matricula", "fecha_matricula", "fecha_caducidad_matricula", "capacidad_unidad", "total_vehiculos",
        "total_asientos_vehiculos", "tipo_local_transporte", "tipo_embarcaciones", "modalidad_embarcaciones",
        "matricula_embarcacion", "total_capacidades_embarcaciones", "total_capacidades_otras_actividades",
        "anio_declaracion_tarifario", "fecha_declaracion_tarifario", "tipos_capacidades", "cantidad_por_tipo_capacidad",
        "plazas_por_tipo_capacidad", "tarifa_por_tipo_capacidad", "tipos_cocina", "tipos_servicio",
        "modalidades_turismo_aventura", "actividades_permitidas_ctc", "identificaciones_guias_turismo",
        "nombres_guias_turismo", "ruc_companias_transporte", "razon_social_companias_transporte",
        "identificaciones_representantes_ventas", "nombres_representante_ventas", "persona_contacto",
        "correo_persona_contacto", "tipo_tramite", "fecha_tramite", "modificacion_sistema", "observaciones_modificacion_sistema",
        "zona_turistica", "administracion_zonal", "sector_turistico", "columna1", "columna2"
    ];

    // Map data
    const cleanedRows = results.data.map((row: any[], index) => {
        // Skip original header row
        if (index === 0) return null;

        // Process each cell:
        // 1. Trim whitespace
        // 2. Remove any internal " chars that might be artifacts if not handled by CSV parser
        // 3. Ensure empty strings are just ""
        const cleanRow = row.map(cell => {
            if (typeof cell === 'string') {
                return cell.trim();
            }
            return cell;
        });

        // Ensure consistent length with header
        // If row is longer, slice it. If shorter, padding with empty strings
        if (cleanRow.length > englishHeaders.length) {
            return cleanRow.slice(0, englishHeaders.length);
        }
        while (cleanRow.length < englishHeaders.length) {
            cleanRow.push('');
        }

        return cleanRow;
    }).filter(r => r !== null); // Removing header row

    // Re-construct CSV
    const csvContent = Papa.unparse({
        fields: englishHeaders,
        data: cleanedRows
    }, {
        quotes: true, // Force quotes to be safe against commas in content
    });

    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    console.log(`Successfully created FINAL CSV at: ${outputPath}`);
    console.log(`Original rows: ${results.data.length}, Final rows: ${cleanedRows.length}`);

} catch (error) {
    console.error('Error processing CSV:', error);
}
