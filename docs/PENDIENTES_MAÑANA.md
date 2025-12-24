# 📋 Tareas Pendientes y Roadmap

**Fecha Última Actualización:** 20 de Diciembre, 2024
**Estado General:** Módulos Core (Entrenador, Discovery) funcionales. Foco en Integración y UX.

---

## 🚀 1. Optimización del Entrenador (Prioridad Alta)
> *"De donde los va a seleccionar..."* — El usuario necesita un flujo conectado.

- [ ] **Filtrado Inteligente de Prospectos:**
  - **Objetivo:** Que el dropdown del Entrenador SOLO muestre los leads que el usuario seleccionó previamente en Discovery.
  - **Acción Técnica:** Modificar `/api/trainer` (o el fetch en frontend) para filtrar por una etiqueta específica (ej. `status = 'prospecto'` o `tag = 'work_list'`).
- [ ] **Verificación de Datos:** Asegurar que la tabla `discovery_leads` y `leads` tengan el campo necesario para este filtrado.

## 👩‍💼 2. Módulo Donna (Visión a Mediano Plazo)
> *"Una secretaria muy avanzada..."*

- [ ] **Roadmap Técnico:** Definir arquitectura para los "Agentes Pequeños" (Sub-agents).
- [ ] **Integración Cortex:** Evaluar cómo "Cortex AI" puede alimentar las decisiones de Donna inicialmente.
- [ ] **Briefing Matutino:** Prototipar la vista de "Resumen del Día" (no lista de leads, sino lista de decisiones).

## 🔍 3. Módulo Discovery (Mantenimiento)
- [ ] **Validación Final:** Confirmar que la importación de datos masiva funciona correctamente con los filtros de provincia y actividad.
- [ ] **UX de Etiquetado:** Verificar que sea rápido marcar 20 leads como "Prospecto" para enviarlos al Entrenador.

## 🧹 4. Limpieza (Realizado)
- ✅ Se eliminaron archivos obsoletos (`PENDIENTES_SESION_DISCOVERY.md`, `PDR_ENTRENADOR_LLAMADAS.md`, `pdf_nuevo_modulo`).
- ✅ Se consolidó la visión de Donna en `docs/VISION_DONNA.md`.
- ✅ Se añadió acceso a Donna en el Sidebar.

---
**Nota:** Este documento reemplaza a los anteriores reportes de pendientes.
