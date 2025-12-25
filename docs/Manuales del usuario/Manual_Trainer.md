# Manual Técnico - Módulo Trainer (Entrenador de Ventas)

## 📋 Visión General

**Propósito**: Preparación inteligente para llamadas de ventas con análisis y coaching por IA (Gemini).

**Características Clave**:
- Análisis automático de leads con Gemini
- Generación de pitch personalizado
- Identificación de objeciones potenciales
- Recomendaciones de approach
- Integración con datos de Discovery y Leads

---

## 🏗️ Arquitectura

**Archivo Principal**: `app/trainer/page.tsx`

**API**:
- `POST /api/trainer/analyze` - Analizar lead con Gemini

**Flujo**:
1. Usuario selecciona lead para llamar
2. Sistema analiza lead con IA
3. Genera reporte de preparación
4. Usuario revisa y ejecuta llamada

---

## 📊 Funcionalidades

### 1. **Selección de Lead**

**Fuentes**:
- Leads del módulo Leads
- Prospectos de Discovery (investigados)
- Contactos de Recorridos

**Datos Utilizados**:
- Nombre del negocio
- Tipo de negocio
- Contacto
- Ubicación
- Notas previas
- Research data (si existe)

---

### 2. **Análisis con IA**

**Prompt a Gemini**:
```
Analiza este lead para una llamada de ventas:
- Negocio: [nombre]
- Tipo: [tipo]
- Ubicación: [ciudad]
- Contexto: [notas/research]

Genera:
1. Perfil del cliente
2. Puntos de dolor probables
3. Pitch recomendado
4. Objeciones potenciales y respuestas
5. Preguntas clave para hacer
```

**Resultado**: Reporte estructurado para preparar llamada

---

### 3. **Reporte de Preparación**

**Secciones**:
1. **Perfil del Cliente**:
   - Industria y tamaño
   - Madurez digital
   - Necesidades probables

2. **Puntos de Dolor**:
   - Problemas identificados
   - Impacto en el negocio

3. **Pitch Sugerido**:
   - Apertura
   - Propuesta de valor
   - Call to action

4. **Objeciones y Respuestas**:
   - Objeción probable → Respuesta sugerida

5. **Preguntas Clave**:
   - Para calificar lead
   - Para descubrir necesidades

---

## 🔄 Flujo de Trabajo

```
1. Abrir /trainer
2. Seleccionar lead de lista
3. Clic "Preparar Llamada"
4. Sistema analiza con Gemini (5-10 seg)
5. Revisar reporte de preparación
6. Ejecutar llamada
7. (Opcional) Registrar resultado
```

---

## 🎯 Casos de Uso

### Caso 1: Llamada en Frío
- Lead de Discovery sin contacto previo
- IA genera contexto basado en investigación
- Pitch genérico pero personalizado

### Caso 2: Seguimiento
- Lead con interacción previa
- IA usa historial para personalizar
- Enfoque en objeciones anteriores

### Caso 3: Cierre
- Lead calificado, listo para propuesta
- IA sugiere estrategia de cierre
- Manejo de objeciones finales

---

## 🔌 Integración

### Con **Discovery**:
- Usa `researchData` para contexto
- Leads investigados = mejor análisis

### Con **Leads**:
- Accede a historial de interacciones
- Usa notas de Recorridos

### Con **Recorridos**:
- Datos de FODA
- Frases clave del contacto
- Estilo de comunicación

---

## 🚨 Limitaciones

1. **Requiere Gemini API**: Sin API key no funciona
2. **Calidad depende de datos**: Más contexto = mejor análisis
3. **No registra resultados**: No hay feedback loop
4. **Sin templates**: Cada análisis es único

---

## 🔮 Mejoras Sugeridas

1. **Templates de Pitch**: Biblioteca de pitches probados
2. **Registro de Resultados**: Guardar outcome de llamadas
3. **Learning Loop**: IA aprende de llamadas exitosas
4. **Role-play**: Simulador de objeciones
5. **Scripts**: Guiones paso a paso

---

**Última actualización**: Diciembre 2025  
**Versión**: 1.0
