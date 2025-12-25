# Manual Técnico - Módulo Discovery

## 📋 Visión General

**Propósito**: Sistema de prospección en frío con investigación automatizada por IA (Gemini) y filtrado avanzado de leads.

**Características Clave**:
- Base de datos masiva de prospectos (miles de registros)
- Investigación pre-llamada con Gemini AI
- 11 filtros dinámicos con faceted search
- Sistema de cola personalizada ("Mi Cola")
- Etiquetado de contacto y seguimiento
- Paginación (25/50/100 por página)

---

## 🏗️ Arquitectura

**Archivo Principal**: `app/discovery/page.tsx` (734 líneas)

**APIs**:
- `GET /api/discovery` - Listar leads con filtros
- `POST /api/discovery` - Crear lead
- `GET /api/discovery/facets` - Opciones de filtros dinámicos
- `POST /api/discovery/{id}/research` - Investigar con Gemini
- `PATCH /api/discovery/{id}` - Actualizar lead
- `POST /api/discovery/{id}/convert` - Convertir a Lead

**Tabla**: `discovery_leads`

---

## 📊 Modelo de Datos

```typescript
interface DiscoveryLead {
  id: string;
  ruc: string | null;
  businessName: string;
  businessType: string | null;
  category: string | null;
  province: string | null;
  city: string | null;
  representative: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  address: string | null;
  researchData: string | null;        // Reporte de Gemini
  status: 'pending' | 'investigated' | 'no_answer' | 'not_interested' | 'sent_info' | 'converted';
  columna1: 'no_contactado' | 'no_contesto' | 'contesto_interesado' | 'contesto_no_interesado' | 'buzon_voz' | 'numero_invalido';
  columna2: 'pendiente' | 'en_cola' | 'convertir_a_lead' | 'descartar' | 'seguimiento_7_dias' | 'seguimiento_30_dias';
  clasificacion: string | null;
  createdAt: string;
}
```

---

## 🎯 Funcionalidades Principales

### 1. **Filtros Dinámicos** (11 filtros)

**Filtros Disponibles**:
1. **Búsqueda**: Por nombre de negocio
2. **Provincia**: Multi-select
3. **Cantón**: Multi-select
4. **Actividad**: Multi-select
5. **Categoría**: Multi-select
6. **Clasificación**: Multi-select
7. **Web**: Texto libre
8. **Email**: Texto libre
9. **Estado**: Multi-select (pending, investigated, etc.)
10. **Etiqueta Contacto** (columna1): Multi-select
11. **Acción Seguimiento** (columna2): Multi-select

**Faceted Search**:
- Opciones se actualizan dinámicamente según filtros activos
- Muestra contadores de resultados por opción
- API: `GET /api/discovery/facets`

**Componente**: `MultiSelectFilter`
- Popover con búsqueda interna
- Checkbox "Seleccionar todo"
- Botón "Limpiar filtros"

---

### 2. **Investigación con IA (Gemini)**

**Botón**: "Investigar IA" en cada card de lead

**Proceso**:
1. Usuario hace clic en "Investigar IA"
2. `POST /api/discovery/{id}/research`
3. Gemini genera reporte basado en:
   - Nombre del negocio
   - Tipo de negocio
   - Ciudad
   - Información pública disponible
4. Reporte se guarda en `researchData`
5. Estado cambia a `investigated`

**Reporte Incluye**:
- Resumen del negocio
- Análisis de mercado
- Puntos de dolor potenciales
- Recomendaciones de approach

**Limitaciones**:
- Requiere API key de Gemini
- Puede tardar 5-10 segundos
- Depende de información pública disponible

---

### 3. **Sistema de Cola ("Mi Cola")**

**Botón**: 📋 (ClipboardList icon)

**Funcionalidad**:
- Añadir/quitar leads de "Mi Cola"
- Estado `columna2`: `en_cola` ↔ `pendiente`
- Badge naranja "📋 EN COLA" en leads añadidos
- Ideal para planificar llamadas del día

**Uso**:
1. Filtrar leads interesantes
2. Clic en 📋 para añadir a cola
3. Filtrar por `columna2: en_cola` para ver solo tu cola
4. Trabajar leads uno por uno

---

### 4. **Etiquetado de Contacto** (columna1)

**Opciones**:
- `no_contactado`: Sin intentos de contacto
- `no_contesto`: Llamó pero no contestó
- `contesto_interesado`: Contestó y mostró interés
- `contesto_no_interesado`: Contestó pero no interesado
- `buzon_voz`: Cayó en buzón de voz
- `numero_invalido`: Número no válido

**Uso**: Registrar resultado de cada intento de contacto

---

### 5. **Acciones de Seguimiento** (columna2)

**Opciones**:
- `pendiente`: Sin acción definida
- `en_cola`: En mi cola de hoy
- `convertir_a_lead`: Listo para convertir
- `descartar`: No es prospecto válido
- `seguimiento_7_dias`: Llamar en 7 días
- `seguimiento_30_dias`: Llamar en 30 días

**Uso**: Planificar próximos pasos

---

## 🔄 Flujos de Trabajo

### Flujo 1: Prospección Diaria

```
1. Abrir /discovery
2. Aplicar filtros (provincia, actividad, etc.)
3. Para cada lead interesante:
   a. Clic "Investigar IA"
   b. Leer reporte de Gemini
   c. Clic 📋 para añadir a cola
4. Filtrar por "En Cola"
5. Llamar leads uno por uno
6. Actualizar columna1 con resultado
7. Actualizar columna2 con próximo paso
```

### Flujo 2: Investigación Masiva

```
1. Filtrar leads sin investigar (status: pending)
2. Investigar con IA (uno por uno)
3. Revisar reportes
4. Etiquetar como:
   - "Convertir a Lead" (interesantes)
   - "Descartar" (no relevantes)
   - "Seguimiento 7/30 días" (potenciales)
```

### Flujo 3: Conversión a Lead

```
1. Filtrar por columna2: "convertir_a_lead"
2. Para cada prospecto:
   a. Clic en botón "Convertir" (si existe)
   b. POST /api/discovery/{id}/convert
   c. Lead se crea en módulo Leads
   d. Estado cambia a "converted"
```

---

## 🎨 Componentes UI

### **Card de Lead**

**Elementos**:
- **Header**: Nombre del negocio + Badge de estado
- **Tipo**: Badge con tipo de negocio
- **Contacto**: Representante, ciudad, teléfono
- **Clasificación**: Si existe
- **Acciones**:
  - Botón "Investigar IA" / "Re-investigar"
  - Botón 📋 (añadir/quitar de cola)

**Estados Visuales**:
- `pending`: Badge amarillo
- `investigated`: Badge azul
- `no_answer`: Badge gris
- `not_interested`: Badge rojo
- `sent_info`: Badge morado
- `converted`: Badge verde

**Badge "EN COLA"**: Naranja, visible cuando `columna2 === 'en_cola'`

---

### **Panel de Filtros**

**Layout**: Grid responsivo (1/2/4/8 columnas)

**Elementos**:
- Input de búsqueda con ícono 🔍
- 10 MultiSelectFilter
- Contador de filtros activos
- Botón "Limpiar" (visible si hay filtros)

**Interacción**:
- Filtros se aplican automáticamente
- Facets se actualizan en cada cambio
- Paginación resetea a página 1

---

### **Paginación**

**Controles**:
- Selector de tamaño: 25/50/100 por página
- Botones: Anterior / Siguiente
- Números de página (primeras 5 + última)
- Resumen: "Mostrando X-Y de Z resultados"

---

## 🔌 Integración con Otros Módulos

### Con **Leads**
- Botón "Convertir a Lead"
- API: `POST /api/discovery/{id}/convert`
- Crea lead en tabla `leads` con datos de discovery

### Con **Trainer**
- Datos de investigación IA útiles para preparar llamadas
- `researchData` puede alimentar contexto de Trainer

### Con **Prospects** (Potencial)
- Exportar leads investigados a Prospects
- Sincronizar estados de contacto

---

## 📈 Métricas Disponibles

**Resumen de Resultados**:
- Total de leads que coinciden con filtros
- Rango actual mostrado (X-Y de Z)

**Métricas Potenciales** (no implementadas):
- Tasa de conversión (converted / total)
- Leads investigados vs pendientes
- Distribución por provincia/actividad
- Efectividad de seguimientos

---

## 🚨 Limitaciones Conocidas

1. **Sin Bulk Actions**:
   - No se puede investigar múltiples leads a la vez
   - No se puede añadir múltiples a cola simultáneamente

2. **Sin Historial**:
   - No guarda log de cambios de estado
   - No registra quién investigó cada lead

3. **Sin Asignación**:
   - No hay concepto de "dueño" de lead
   - Todos ven todos los leads

4. **Gemini API**:
   - Requiere configuración de API key
   - Costo por investigación
   - Puede fallar si API no disponible

5. **Sin Exportación**:
   - No se puede exportar resultados filtrados
   - No hay reportes descargables

---

## 🔮 Mejoras Sugeridas

### Corto Plazo
1. **Bulk Actions**: Investigar/etiquetar múltiples leads
2. **Historial de Cambios**: Log de estados
3. **Exportar Filtrados**: CSV/Excel de resultados

### Mediano Plazo
4. **Asignación de Leads**: Dueño por lead
5. **Recordatorios**: Notificaciones para seguimientos
6. **Templates de Investigación**: Personalizar prompts de Gemini

### Largo Plazo
7. **Scoring Automático**: IA predice probabilidad de conversión
8. **Integración CRM**: Sincronización bidireccional
9. **Analytics Dashboard**: Métricas y tendencias

---

## 🧪 Testing

**Probar Filtros**:
1. Aplicar filtro de provincia
2. Verificar que facets se actualicen
3. Combinar múltiples filtros
4. Limpiar y verificar reset

**Probar Investigación**:
1. Seleccionar lead sin investigar
2. Clic "Investigar IA"
3. Esperar spinner
4. Verificar que aparezca reporte
5. Verificar badge cambia a "Investigado"

**Probar Cola**:
1. Clic 📋 en varios leads
2. Verificar badge "EN COLA"
3. Filtrar por columna2: "en_cola"
4. Verificar solo aparecen leads en cola
5. Quitar de cola y verificar desaparece

---

## 📚 Preguntas Frecuentes

**P: ¿Cuántos leads puedo investigar por día?**  
R: Depende del límite de tu API key de Gemini. Sin límite en el CRM.

**P: ¿Los filtros se guardan entre sesiones?**  
R: No, se resetean al refrescar la página.

**P: ¿Puedo compartir mi cola con otros usuarios?**  
R: No, la cola es por navegador (localStorage). Implementar cola compartida requiere backend.

**P: ¿Qué pasa si dos personas investigan el mismo lead?**  
R: El último reporte sobrescribe el anterior. No hay control de concurrencia.

**P: ¿Puedo editar un lead?**  
R: Actualmente no hay UI para editar. Solo se puede actualizar via API.

---

## 🔗 Referencias

**Archivos Clave**:
- `app/discovery/page.tsx` (734 líneas)
- `app/api/discovery/route.ts`
- `app/api/discovery/facets/route.ts`
- `app/api/discovery/[id]/research/route.ts`

**Tabla**: `discovery_leads` en Supabase

**Dependencias**:
- Gemini AI API
- Shadcn UI (Card, Badge, Button, Popover, Command)
- TanStack Query (potencial para caché)

---

**Última actualización**: Diciembre 2025  
**Versión**: 1.0  
**Autor**: Documentación Técnica CRM
