# PDR – Documento de Requerimientos del Producto (Versión 1.2: Hardened Reliability)

## 1. Visión General del Sistema: "La Máquina de Confianza"

Donna evoluciona de un asistente de CRM a un **Sistema de Cumplimiento Estratégico y Gobernanza**.
Su objetivo final no es "ahorrar tiempo", sino **generar confianza**.
La confianza se logra cuando **nunca se olvida una promesa**, sin importar cuán pequeña sea.

---

## 2. Principios Rectores (Inalterables)

1.  **Cero Automatización de Mensajería:** El CRM prepara borradores, el humano envía. Donna no conversa.
2.  **La IA Propone, el Humano Dispone:** Ningún compromiso entra al sistema sin validación humana explícita (Human-in-the-loop).
3.  **Memoria + Cumplimiento:** El valor no es charlar, es recordar y ejecutar.
4.  **Delegación Inteligente:** Distingue tareas de Venta (César) vs. Ejecución (Equipo) vs. Espera (Cliente).
5.  **Proactividad Real (Push):** No depende de que el humano abra el CRM; Donna busca al humano en WhatsApp.
6.  **Vigilancia de Relación:** El sistema evalúa silenciosamente si un cliente se está enfriando.
6.  **Pocos Clientes, Atención Infinita:** Diseñado para alto valor, no alto volumen.

---

## 3. Modelo de Compromisos ("The Core")

El átomo del sistema ya no es la "tarea", es el **Compromiso (Commitment)**.

### 3.1 Estados del Compromiso
Cada promesa vive en uno de estos estados frente al cliente:
*   ⏳ **Borrador (Draft):** Propuesto por la IA, esperando validación de César.
*   ⏳ **Pendiente Cliente:** La pelota está en su cancha (ej. "Enviar logo"). Donna vigila el tiempo.
*   ⏳ **Pendiente Equipo:** Abel/Técnicos trabajando. Donna vigila el deadline interno.
*   ⏳ **Pendiente César:** Acción de relación o venta requerida.
*   ⚠️ **En Riesgo:** Se acerca la fecha límite o el cliente no responde (dentro de periodo de gracia).
*   ✅ **Cumplido:** Entregado y cerrado.
*   ❌ **Roto (Broken):** La promesa se incumplió. No se borra. Queda como mancha en el historial.

### 3.2 Caducidad y Tolerancia
No todos los compromisos son iguales.
*   **Due Date:** Fecha prometida.
*   **Grace Period:** Días extra antes de marcar "Roto" o escalar alertas.
*   **Severity:** Baja (Info), Media (Warning), Alta (Critical - Daña relación).

---

## 4. Gobernanza y Responsabilidad

¿Quién responde cuando el tablero se enciende en rojo?

### Matriz de Alertas
| Tipo de Riesgo | Responsable Primario | Responsable Secundario | Acción Esperada |
| :--- | :--- | :--- | :--- |
| **Retraso Cliente** | César | - | Contactar para desbloquear ("Health Check"). |
| **Retraso Equipo** | Abel (Técnico) | César (Supervisor) | Reasignar recursos o Renegociar fecha. |
| **Retraso César** | César | - | Ejecutar tarea. |
| **Riesgo Sistémico** | César (Director) | - | Revisar por qué fallamos tanto (Auditoría). |

---

## 5. Ciclo de Vida del Cliente (Donna's Zones)

1.  **Pre-Reunión (Venta):**
    *   *Rol:* Estratega.
    *   *Output:* Briefing de Preparación + Alerta de Riesgos.
2.  **Post-Reunión (Confianza):**
    *   *Rol:* Auditor de Acuerdos.
    *   *Output:* Generación de Compromisos (Borradores).
3.  **Ejecución (Credibilidad):**
    *   *Rol:* Vigía y Recordadora.
    *   *Output:* Alertas de plazos + **Mensajes Push (WhatsApp)** a César/Abel.
4.  **Seguimiento (Fidelización):**
    *   *Rol:* Memoria Proactiva.
    *   *Output:* Recordatorios de "toques" personales + **Notificaciones de Seguimiento** a Clientes.

---

## 6. Manual Human-AI (Micro-Protocolo)

Para que el sistema funcione, el humano (César) tiene obligaciones:
1.  **Notas de Calidad:** Escribir los acuerdos de forma clara post-reunión.
    *   *Bien:* "Acordamos X para el Lunes".
    *   *Mal:* "Vemos la otra semana".
2.  **Validación Diaria:** Revisar el Modal de Post-Reunión y confirmar qué compromisos son reales.
3.  **Cierre de Ciclos:** Marcar manualmente cuando algo se cumple (Donna no es adivina).

---

## 7. Límites Explícitos (Negative Scope)

**Donna NUNCA hará esto:**
*   🔴 **Negociar/Convencer:** No usurpa el rol comercial.
*   🔴 **Enviar:** Jamás toca el botón de enviar.
*   🔴 **Automatizar Basura:** No guarda compromisos sin revisión humana.

---

## 8. Integración Técnica (Resumen)

*   **Tabla `commitments`:** Con campos de `severity`, `grace_period`, `status`.
*   **UI Modal de Revisión:** Componente crítico para el "Human-in-the-loop".
*   **Historial de Confiabilidad:** Log simple en tabla `agents` (`reliability_stats`).
