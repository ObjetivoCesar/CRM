# Manual Técnico - Módulo Donna (AI Assistant)

## 📋 Visión General
**Propósito**: Asistente de IA conversacional para consultas y automatización.

## 🤖 Características

### 1. **Chat Conversacional**
- Interfaz de chat estilo ChatGPT
- Contexto del CRM
- Respuestas en tiempo real

### 2. **Capacidades**
- **Consultas de Datos**: "¿Cuántos leads tengo pendientes?"
- **Análisis**: "¿Cuál es mi tasa de conversión este mes?"
- **Recomendaciones**: "¿A qué leads debo llamar hoy?"
- **Automatización**: "Crea una tarea para llamar a Juan mañana"

### 3. **Integración con Gemini**
- Powered by Google Gemini
- Acceso a datos del CRM
- Contexto de usuario actual

## 🎯 Casos de Uso

### Consultas Rápidas
```
Usuario: "¿Cuántos clientes tengo en Loja?"
Donna: "Tienes 23 clientes activos en Loja, 5 en negociación y 12 prospectos investigados."
```

### Análisis
```
Usuario: "¿Cuál es mi mejor fuente de leads?"
Donna: "Discovery ha generado el 65% de tus leads este mes, con una tasa de conversión del 32%."
```

### Automatización
```
Usuario: "Recuérdame llamar a Hotel XYZ mañana a las 10am"
Donna: "✅ Tarea creada: Llamar a Hotel XYZ - Mañana 10:00 AM"
```

### Recomendaciones
```
Usuario: "¿Qué debo hacer hoy?"
Donna: "Tienes 3 leads en tu cola de Discovery, 2 cotizaciones pendientes de seguimiento y 1 contrato por vencer en 15 días."
```

## 🔌 Integración

### Acceso a Datos
- **Leads**: Consultar, filtrar, analizar
- **Clients**: Información de clientes
- **Tasks**: Crear, listar, completar
- **Events**: Agendar, consultar calendario
- **Finanzas**: Métricas, reportes
- **Discovery**: Prospectos, investigaciones

### APIs Utilizadas
- `POST /api/ai/agent/chat` - Chat principal
- Acceso a todos los endpoints del CRM
- Permisos según usuario

## 🎨 Interfaz

### Componentes
- **Input de Chat**: Textarea con autocompletado
- **Historial**: Conversación completa
- **Sugerencias**: Preguntas frecuentes
- **Acciones Rápidas**: Botones para tareas comunes

### Características UX
- Typing indicator
- Markdown en respuestas
- Links clickeables a registros
- Botones de acción directa

## 🚨 Limitaciones

1. **Requiere Gemini API**: Sin API key no funciona
2. **Sin Memoria Persistente**: No recuerda conversaciones previas
3. **Permisos**: Solo accede a datos del usuario actual
4. **Sin Voz**: Solo texto (por ahora)

## 🔮 Mejoras Sugeridas

### Corto Plazo
1. **Historial de Conversaciones**: Guardar chats
2. **Favoritos**: Guardar consultas frecuentes
3. **Exportar**: Descargar conversación

### Mediano Plazo
4. **Voz**: Input y output por voz
5. **Proactiva**: Notificaciones automáticas
6. **Aprendizaje**: Mejora con uso

### Largo Plazo
7. **Multimodal**: Analizar imágenes/documentos
8. **Workflows**: Crear automatizaciones complejas
9. **Integración Externa**: Slack, WhatsApp, etc.

---
**Versión**: 1.0 | **Última actualización**: Diciembre 2025
