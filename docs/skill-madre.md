# 🧠 CRM Objetivo — Gobernanza Core (Skill Madre)

Este documento define la arquitectura core del CRM y las reglas de integración con el bot de IA ("Ale"). Sirve como la fuente de verdad inmutable para cualquier desarrollador o agente de IA que trabaje en esta base de código.

---

## 1. Arquitectura de Datos y Ciclo de Vida del Contacto

El CRM gestiona contactos unificados a través del funnel comercial.
- **Tabla Única de Contactos:** `contacts` almacena prospects, leads y clientes.
- **Fases del Lead (`contacts.status`):**
  - `'sin_contacto'`: Contacto nuevo o de entrada.
  - `'primer_contacto'`: Informador (el bot o César dio la primera explicación).
  - `'segundo_contacto'`: Closer (el lead muestra interés de compra o cotización).
  - `'tercer_contacto'`: Intervención César (transferido a humano o pausado).
  - `'soporte'`: Clientes que requieren soporte técnico.
  - `'convertido'`: Venta completada/Lead ganado (entity_type cambia a `'client'`).

---

## 2. El Tablero Kanban y su Mapeo con la DB y la Ficha de Ale

El Kanban posee **6 columnas principales**. Cada movimiento manual o automático actualiza el estado comercial en la tabla `contacts` y sincroniza inmediatamente el cerebro de Ale (`ficha.intencion_actual` en `conversationStates` con key = teléfono del chat).

| Columna en UI | `contacts.botMode` | `contacts.status` | Sincronización en Ficha de Ale |
|---|---|---|---|
| **Entrada / Clasificador** | `'active'` | `'sin_contacto'` | `ficha.intencion_actual = 'saludo'` |
| **Informador** | `'active'` | `'primer_contacto'` | `ficha.intencion_actual = 'informador'` |
| **Closer** | `'active'` | `'segundo_contacto'` | `ficha.intencion_actual = 'close_concreto'` |
| **Soporte** | `'active'` | `'soporte'` | `ficha.intencion_actual = 'soporte'` |
| **Intervención César** | `'paused'` | `'tercer_contacto'` | `ficha.intencion_actual = 'humano'` |
| **Finalizados** | `'disabled'` | `'convertido'` | `ficha.intencion_actual = 'finalizados'` |

---

## 3. Lógica de Recuperación y Errores (Message Worker)

El `message_worker.ts` es el único responsable de persistir y procesar la entrada de WhatsApp. Para evitar errores y bloqueos:
- **Typing Action:** Envía una simulación de escritura ("typing") al usuario para humanizar el tiempo de respuesta.
- **Cleanup de Zombies:** Ante cualquier fallo en el procesamiento de IA, los mensajes procesados se limpian incondicionalmente de `pending_messages_queue` para prevenir bucles infinitos de re-intento.
- **Handover:** Si el bot está pausado (`botMode = 'paused'`), Ale guardará el historial pero no enviará respuestas de IA.

---

## 4. Función de Exportación de Chats

El CRM cuenta con una herramienta para exportar el historial de chat con fines de auditoría o transferencia:
- **Descargar:** Genera un archivo plano `.txt` con formato limpio: `[HH:MM] Emisor: Mensaje`.
- **Reenvío:** Realiza un POST a `/api/conversations/[id]/export` enviando la conversación formateada a otro número de WhatsApp.
