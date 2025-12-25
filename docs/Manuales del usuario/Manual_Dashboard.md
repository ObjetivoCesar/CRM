# Manual del Usuario - Dashboard CRM

## 📊 Visión General

El **Dashboard** es el centro de comando del CRM, diseñado para proporcionar una visión integral del rendimiento del negocio en tiempo real. Combina métricas financieras, estado del pipeline de ventas, tareas pendientes y análisis de clientes en una sola pantalla.

---

## 🎯 Componentes del Dashboard

### 1. **Inteligencia Financiera** (Widget Principal)

El widget de **Inteligencia Financiera** es el componente más destacado del dashboard, ubicado en la parte superior. Proporciona análisis dinámico de rentabilidad y flujo de caja.

#### **Métricas Principales (KPIs)**

| Métrica | Descripción | Cálculo |
|---------|-------------|---------|
| **Ingresos Reales** | Total de ingresos confirmados (pagados) | Suma de transacciones INCOME con status PAID |
| **Gastos Op.** | Total de gastos operacionales confirmados | Suma de transacciones EXPENSE con status PAID |
| **Efic. Cobranza** | Porcentaje de cobros exitosos | (Cobrado / Facturado) × 100% |
| **Cobranza Pendiente** | Monto total por cobrar | Suma de transacciones INCOME con status PENDING |

#### **Controles Interactivos**

##### **📅 Selector de Rango de Fechas**
- **Ubicación**: Parte superior derecha del widget
- **Función**: Permite seleccionar un rango de fechas personalizado para el análisis
- **Uso**:
  1. Haz clic en el botón con el ícono de calendario
  2. Selecciona la fecha de inicio (FROM)
  3. Selecciona la fecha de fin (TO)
  4. Los datos se actualizan automáticamente

##### **⏱️ Presets de Periodo**
- **Este Mes**: Desde el inicio del mes actual hasta hoy
- **Últimos 90d**: Últimos 90 días
- **Año Actual**: Desde el 1 de enero hasta hoy

**Uso**: Selecciona una opción del dropdown "Periodo" para aplicar el rango predefinido.

##### **🔍 Filtros Avanzados**
Haz clic en el botón de filtro (ícono de embudo) para abrir el panel de filtros.

**Opciones disponibles:**

1. **Tipo de Transacción**
   - Todos
   - Ingresos
   - Gastos

2. **Estado**
   - Todos
   - Pagado
   - Pendiente

**Botones del panel:**
- **Limpiar**: Resetea todos los filtros a "Todos"
- **Aplicar**: Cierra el panel (los filtros se aplican automáticamente al cambiar)

#### **📈 Gráfica de Tendencias**

Visualización de área que muestra la evolución diaria de:
- **Ingresos** (línea verde)
- **Gastos** (línea roja)

**Interacción**: Pasa el cursor sobre la gráfica para ver los valores exactos de cada día.

#### **👥 Breakdown de Clientes**

Muestra los **Top 5 clientes** por ingresos generados en el periodo seleccionado.

> **Nota**: Actualmente muestra los primeros 8 caracteres del UUID del cliente. Para ver nombres completos, es necesario establecer la relación de foreign key entre `transactions.contact_id` y `contacts.id` en la base de datos.

---

### 2. **Cola de Prospección** (Discovery Queue)

**Ubicación**: Tarjeta naranja debajo del widget financiero

**Función**: Muestra el número de leads listos para contactar hoy según el módulo Discovery.

**Elementos**:
- **Número grande**: Cantidad de leads en cola
- **Botón "Ir a Trainer"**: Acceso directo al módulo Trainer para preparar las llamadas

**Uso**:
1. Revisa el número de leads pendientes
2. Haz clic en "Ir a Trainer →" para acceder al módulo de preparación de llamadas

---

### 3. **Embudo de Ventas** (Pipeline Funnel)

**Ubicación**: Sección izquierda, debajo de la cola de prospección

**Función**: Visualiza la conversión de prospectos a clientes cerrados en el mes actual.

**Etapas del embudo**:
1. **Prospectos** (gris): Total de leads en el sistema
2. **Contactados** (azul): Leads que han sido contactados
3. **Interesados** (amarillo): Leads que mostraron interés
4. **Cerrados** (verde): Leads convertidos en clientes

**Interpretación**:
- Las barras más largas indican mayor volumen
- Compara las longitudes para identificar cuellos de botella en el proceso de ventas
- Pasa el cursor sobre cada barra para ver el número exacto

---

### 4. **Tareas Pendientes**

**Ubicación**: Sección derecha, al lado del embudo de ventas

**Función**: Lista de tareas urgentes y próximas.

**Elementos de cada tarea**:
- **Título**: Descripción de la tarea
- **Fecha**: Fecha de vencimiento
- **Estado**: Indicador visual de urgencia

**Acciones**:
- Haz clic en "Ver Todas →" para acceder al módulo completo de tareas

---

### 5. **Breakdown de Clientes** (Gráfica de Pastel)

**Ubicación**: Parte inferior del dashboard

**Función**: Distribución visual de ingresos por cliente.

**Características**:
- **Gráfica de pastel**: Cada segmento representa un cliente
- **Colores**: Diferencia visual entre clientes
- **Tooltip**: Pasa el cursor sobre un segmento para ver:
  - Nombre del cliente
  - Monto de ingresos
  - Porcentaje del total

**Uso**:
- Identifica rápidamente tus clientes más valiosos
- Detecta dependencia excesiva de un solo cliente (segmento muy grande)
- Planifica estrategias de retención para clientes clave

---

## 🔄 Flujo de Trabajo Recomendado

### **Rutina Diaria**

1. **Revisa Métricas Financieras** (5 min)
   - Verifica ingresos y gastos del día anterior
   - Revisa la eficiencia de cobranza
   - Identifica cobranzas pendientes urgentes

2. **Consulta la Cola de Prospección** (2 min)
   - Revisa cuántos leads debes contactar hoy
   - Accede al Trainer si hay leads pendientes

3. **Analiza el Embudo** (3 min)
   - Identifica en qué etapa se están "atorando" los prospectos
   - Planifica acciones para mover leads a la siguiente etapa

4. **Revisa Tareas Pendientes** (5 min)
   - Prioriza tareas urgentes
   - Marca tareas completadas

### **Rutina Semanal**

1. **Análisis Financiero Profundo** (15 min)
   - Usa el selector de fechas para ver "Últimos 90d"
   - Aplica filtros para analizar solo ingresos o solo gastos
   - Identifica tendencias en la gráfica

2. **Revisión de Clientes** (10 min)
   - Analiza el breakdown de clientes
   - Identifica clientes que no han generado ingresos recientemente
   - Planifica acciones de reactivación

### **Rutina Mensual**

1. **Reporte de Cierre de Mes** (30 min)
   - Selecciona "Este Mes" en el widget financiero
   - Exporta o captura las métricas clave
   - Compara con el mes anterior
   - Analiza la conversión del embudo de ventas

---

## 💡 Consejos y Mejores Prácticas

### **Optimización del Dashboard**

1. **Usa Filtros Estratégicamente**
   - Filtra solo por "Ingresos" + "Pendiente" para enfocarte en cobranza
   - Filtra por "Gastos" + "Pagado" para revisar gastos confirmados

2. **Aprovecha los Presets de Periodo**
   - "Últimos 90d" es ideal para identificar tendencias
   - "Año Actual" te da la visión completa del año fiscal

3. **Monitorea la Eficiencia de Cobranza**
   - Un porcentaje bajo (<70%) indica problemas de cobranza
   - Investiga clientes con facturas pendientes antiguas

4. **Interpreta el Embudo**
   - Si "Contactados" es bajo: Necesitas más actividad de prospección
   - Si "Interesados" es bajo: Mejora tu pitch de ventas
   - Si "Cerrados" es bajo: Revisa tu proceso de cierre

### **Indicadores de Alerta**

| Indicador | Valor Normal | Acción si está fuera de rango |
|-----------|--------------|-------------------------------|
| Eficiencia de Cobranza | >80% | Revisar políticas de crédito y seguimiento |
| Cobranza Pendiente | <20% de ingresos | Intensificar gestión de cobros |
| Conversión (Cerrados/Prospectos) | >10% | Analizar calidad de leads y proceso de ventas |

---

## 🚀 Funcionalidades Avanzadas

### **Combinación de Filtros**

Puedes combinar múltiples filtros para análisis específicos:

**Ejemplo 1: Análisis de Cobranza**
- Rango: "Este Mes"
- Tipo: "Ingresos"
- Estado: "Pendiente"
- **Resultado**: Lista de facturas por cobrar del mes

**Ejemplo 2: Control de Gastos**
- Rango: "Últimos 90d"
- Tipo: "Gastos"
- Estado: "Pagado"
- **Resultado**: Gastos confirmados del trimestre

### **Interpretación de la Gráfica de Tendencias**

- **Líneas paralelas**: Equilibrio entre ingresos y gastos
- **Ingresos por encima de gastos**: Rentabilidad positiva
- **Picos en ingresos**: Identifica qué causó el aumento (cliente grande, campaña exitosa)
- **Picos en gastos**: Revisa si fueron inversiones planificadas

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué el breakdown de clientes muestra UUIDs en lugar de nombres?**  
R: Actualmente falta la relación de foreign key en la base de datos entre `transactions.contact_id` y `contacts.id`. Una vez establecida, se mostrarán los nombres de negocio.

**P: ¿Los datos se actualizan en tiempo real?**  
R: Los datos se actualizan automáticamente cuando cambias filtros o rangos de fechas. Para refrescar manualmente, cambia y vuelve a aplicar un filtro.

**P: ¿Puedo exportar los datos del dashboard?**  
R: Actualmente no hay función de exportación directa. Puedes capturar pantallas o acceder a los módulos específicos (Finanzas, Contactos) para exportar datos detallados.

**P: ¿Qué significa "Eficiencia de Cobranza al 0%"?**  
R: Significa que no hay transacciones facturadas (INCOME) en el periodo seleccionado, o que todas están pendientes de pago.

---

## 🔗 Navegación Rápida

Desde el Dashboard puedes acceder rápidamente a:

- **Trainer**: Botón en la tarjeta "Cola de Prospección"
- **Tareas**: Botón "Ver Todas" en la sección de tareas
- **Nuevo Prospecto**: Botón en la esquina superior derecha

---

## 📝 Notas Técnicas

- **Moneda**: Todas las cifras se muestran en MXN (Pesos Mexicanos)
- **Formato de fecha**: Español (es-MX)
- **Zona horaria**: Local del navegador
- **Actualización**: Los cambios en filtros disparan automáticamente una nueva consulta al servidor

---

## 🎨 Leyenda de Colores

| Color | Significado |
|-------|-------------|
| 🟢 Verde | Ingresos, métricas positivas, clientes cerrados |
| 🔴 Rojo | Gastos, alertas, métricas negativas |
| 🟡 Amarillo | Leads interesados, advertencias |
| 🔵 Azul | Leads contactados, información neutral |
| 🟠 Naranja | Discovery queue, acciones pendientes |
| 🟣 Índigo | Widget principal, métricas clave |

---

**Última actualización**: Diciembre 2025  
**Versión del manual**: 1.0
