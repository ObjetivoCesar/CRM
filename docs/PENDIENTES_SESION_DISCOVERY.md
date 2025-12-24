# Reporte de Estado y Pendientes - Módulo Discovery
**Fecha:** 19 de Diciembre, 2025
**Estado:** Bloqueado en Importación de Datos (Data Incompatible)

## Resumen del Problema
No se ha podido completar la carga de la base de datos de prospectos (30,800 registros) debido a errores de compatibilidad de tipos ("Data Incompatible") en Supabase y errores de lectura en el script local.

**Causa Raíz:**
1. **Datos Sucios:** El archivo CSV (`BASE_FINAL_SUPABASE 2.csv`) contiene valores no válidos (e.g., texto en columnas numéricas, celdas vacías vs nulas) que rompen la validación estricta de Supabase.
2. **Formato CSV:** El archivo usa punto y coma (`;`) como delimitador, mientras que la configuración estándar suele esperar comas.
3. **Validación de UI:** La interfaz web de Supabase es estricta y falla todo el lote si una sola fila está mal.

## Tareas Pendientes para la Próxima Sesión

### 1. Limpieza e Importación (Prioridad Alta)
- [ ] **Ejecutar Script de Importación Customizado:**
  - Ya se creó `scripts/import-discovery-leads.ts` configurado para leer `;` y mapear a columnas `TEXT`.
  - **Acción:** Ejecutar `npx tsx scripts/import-discovery-leads.ts` apuntando a la tabla `tabla_prueba_final`.
  - *Nota:* Hacer esto vía script local es más robusto que la web de Supabase porque podemos loguear errores fila por fila sin detener el proceso.

### 2. Normalización de Datos
- [ ] **Casteo de Tipos:**
  - Una vez los datos estén en `tabla_prueba_final` (todo texto), crear una consulta SQL para moverlos a la tabla real `discovery_leads`, convirtiendo los textos a números/fechas válidos.
  - `CAST(NULLIF(columna, '') AS INTEGER)`

### 3. Verificación de Funcionalidad
- [ ] **Probar Endpoint de Investigación:**
  - Confirmar que la IA (Gemini) lee correctamente la data desde la nueva tabla.
- [ ] **Prueba de UI:**
  - Verificar que el Dashboard `/discovery` carga los leads importados.

## Archivos Clave
- `docs/create_tabla_prueba_final.sql`: Script SQL para tabla con esquema relajado (todo TEXT).
- `scripts/import-discovery-leads.ts`: Script de Node.js ajustado para parsing robusto.
- `docs/BASE_FINAL_SUPABASE 2.csv`: Archivo fuente actual.

## Recomendación Técnica
No intentar usar la subida manual de Supabase para este archivo. Usar estrictamente el script de Node.js que permite control total sobre el parsing y manejo de errores.
