# Manual Técnico - Módulo Leads

## 📋 Visión General
**Propósito**: Gestión del pipeline de ventas y conversión de prospectos a clientes.

## 🎯 Funcionalidades

### 1. **Gestión de Leads**
- **CRUD Completo**: Crear, ver, editar, eliminar leads
- **Fuentes**: Discovery, Recorridos, manual, importación
- **Calificación**: Scoring automático (potencial)
- **Asignación**: A vendedor específico

### 2. **Pipeline de Ventas**
- **Etapas**:
  - Nuevo
  - Contactado
  - Calificado
  - Propuesta enviada
  - Negociación
  - Ganado
  - Perdido

### 3. **Conversión**
- **A Cliente**: Lead ganado → Cliente activo
- **Datos Heredados**: Toda la info pasa a módulo Clients
- **Trigger**: Crea registro en `clients` table

## 📊 Estructura de Datos

```typescript
interface Lead {
  id: string;
  // Datos de Recorridos (si aplica)
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  businessActivity: string;
  
  // Perfilado
  interestedProduct: string[];
  pains: string;
  goals: string;
  objections: string;
  
  // Contexto
  yearsInBusiness: number;
  numberOfEmployees: number;
  averageTicket: number;
  
  // FODA
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  
  // Pipeline
  stage: LeadStage;
  score: number;
  assignedTo: string;
  source: 'discovery' | 'recorridos' | 'manual' | 'import';
  
  // Tracking
  createdAt: Date;
  lastContactedAt: Date;
  convertedAt?: Date;
}
```

## 🔄 Flujo de Conversión

### Discovery → Lead
```
1. Prospecto investigado en Discovery
2. Columna2 = "convertir_a_lead"
3. Clic "Convertir a Lead"
4. POST /api/discovery/{id}/convert
5. Lead creado con datos de Discovery
6. Estado Discovery = "converted"
```

### Recorridos → Lead
```
1. Completar formulario de Recorridos
2. Guardar expediente
3. Automáticamente crea Lead
4. Lead hereda todos los 32 campos
5. Incluye análisis FODA
```

### Lead → Cliente
```
1. Lead en etapa "Ganado"
2. Clic "Convertir a Cliente"
3. POST /api/leads/{id}/convert
4. Cliente creado en tabla `clients`
5. Lead marcado como convertido
6. Relación mantenida para historial
```

## 🎨 Vistas

### 1. **Lista**
- Tabla con todos los leads
- Filtros: Etapa, asignado a, fuente
- Búsqueda por nombre/empresa

### 2. **Kanban** (Potencial)
- Columnas por etapa
- Drag & drop para mover entre etapas
- Contador por columna

### 3. **Detalle**
- Vista 360° del lead
- Todas las secciones de Recorridos
- Historial de interacciones
- Cotizaciones enviadas
- Tareas relacionadas

## 🔌 Integración

### Con **Discovery**
- Leads convertidos desde Discovery
- Mantiene `researchData` de Gemini

### Con **Recorridos**
- Leads creados desde expedientes
- Hereda análisis FODA completo

### Con **Cotizaciones**
- Generar cotización para lead
- Tracking de propuestas

### Con **Tasks**
- Tareas de seguimiento automáticas
- Recordatorios de contacto

### Con **Clients**
- Conversión final
- Migración de datos

## 📈 Métricas

### Actuales (Potenciales)
- Total de leads
- Por etapa
- Tasa de conversión
- Tiempo promedio en pipeline
- Leads por fuente

### Sugeridas
- Scoring predictivo con IA
- Probabilidad de cierre
- Valor estimado del deal
- Próximos pasos sugeridos

## 🔮 Mejoras Sugeridas

### Corto Plazo
1. **Lead Scoring**: Puntuación automática
2. **Actividades**: Log de todas las interacciones
3. **Notas**: Sistema de comentarios

### Mediano Plazo
4. **Email Tracking**: Saber si abrió emails
5. **Secuencias**: Emails automáticos de seguimiento
6. **Rotación**: Asignación automática round-robin

### Largo Plazo
7. **IA Predictiva**: Probabilidad de cierre
8. **Recomendaciones**: Próximos pasos sugeridos
9. **Automatización**: Workflows personalizados

---
**Versión**: 1.0 | **Última actualización**: Diciembre 2025
