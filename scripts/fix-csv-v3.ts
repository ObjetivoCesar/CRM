import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(process.cwd(), 'docs', 'Ejemplo de base de datos sector turismo - Hoja 1.csv');
const outputPath = path.join(process.cwd(), 'docs', 'BASE_FINAL_SUPABASE_v2.csv');

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

try {
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    // We will build the new content
    const cleanedLines: string[] = [];

    // Add header first
    cleanedLines.push(englishHeaders.join(','));

    // Process data lines (skip index 0 which is the original bad header?)
    // Actually, check if index 0 is header or wrapped header.
    // The previous view_file showed Line 1 is unwrapped: "RUC,Código..."
    // Line 2 is wrapped: "100...
    // So we skip line 0 (original header) and process the rest.

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Strip outer quotes
        if (line.startsWith('"')) {
            line = line.substring(1);
        }

        if (line.endsWith('";')) {
            line = line.substring(0, line.length - 2);
        } else if (line.endsWith('"')) {
            line = line.substring(0, line.length - 1);
        } else if (line.endsWith(';')) {
            line = line.substring(0, line.length - 1);
        }

        // Global replace "" with "
        // In JS replaceAll is standard in Node 15+
        line = line.split('""').join('"');

        cleanedLines.push(line);
    }

    fs.writeFileSync(outputPath, cleanedLines.join('\n'), 'utf-8');
    console.log(`Successfully created FINAL CLEAN CSV at: ${outputPath}`);
    console.log(`Processed ${cleanedLines.length} lines (including header).`);

} catch (error) {
    console.error('Error processing CSV:', error);
}
