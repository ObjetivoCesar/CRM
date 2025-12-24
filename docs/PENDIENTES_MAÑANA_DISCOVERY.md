# 📋 Tareas Pendientes - Discovery & Coach Module (Actualizado 21/12/2024)

**Fecha Última Actualización**: 21 de Diciembre, 2024 (Madrugada)
**Estado**: ✅ Investigación IA FUNCIONANDO CORRECTAMENTE (Gemini Flash Latest + Tavily)

---

## 🏆 LOGROS DE HOY
*   **Investigación en Tiempo Real:** Se implementó y verificó la integración de Tavily Search + Gemini AI.
*   **Corrección Modelo Gemini:** Se identificó que la API Key solo soporta modelos nuevos (`gemini-flash-latest`, `gemini-2.5-flash`) y se actualizó el código para usar `gemini-flash-latest`, resolviendo el error 404/Quota.
*   **UI Discovery:** El botón "Investigar IA" y el reporte en el modal funcionan perfectamente.
*   **Conversión Exitosa:** Se verificó el flujo completo: Discovery -> Investigación -> Conversión a Lead (Datos guardados correctamente).
*   **Conexión Base de Datos:** Se resolvió el problema de conexión (ECONNREFUSED) reiniciando el servidor.

---

## 🔧 TAREAS PARA MAÑANA (Próxima Sesión)

### 1. UX/UI Entrenador (Prioridad Alta)
> *"De donde los va a seleccionar..."*

*   [ ] **Conexión Discovery -> Entrenador:** Asegurar que el Entrenador (`/trainer`) pueda "jalar" fácilmente los leads investigados en Discovery. Actualmente ya lista los leads, pero se debe verificar que priorice los que tienen estado "investigated" o una etiqueta específica.

### 2. Módulo Coach / Entrenador
*   [ ] **Feedback Post-Llamada:** Implementar la lógica para analizar el audio grabado y dar feedback basado en el "Diagnóstico Reptil" generado en la preparación.
*   [ ] **Mejorar UI de Preparación:** Hacer más evidente la conexión entre el "Informe de Inteligencia" (datos duros) y la "Tarjeta Mental" (estrategia psicológica).

### 3. Módulo Donna (Visión)
*   [ ] Continuar refinando la visión de Donna como asistente proactiva basada en la arquitectura de agentes.

---

## 📝 NOTA PARA TI MISMO (DEV)
*   **Modelo de IA:** NO CAMBIAR `gemini-flash-latest` en `research-agent.ts` a menos que sea estrictamente necesario. Los modelos 1.5 antiguos NO funcionan con esta key.
*   **Reiniciar Servidor:** Si ves errores de conexión a DB (`ECONNREFUSED 127.0.0.1`), es señal de reiniciar `npm run dev` para que tome bien las variables de entorno.
*   **Flujo:** El usuario está muy contento con el reporte generado ("Hizo un gran trabajo"). Mantener esa calidad de prompt ("Informe de Inteligencia Pre-Llamada").

---
