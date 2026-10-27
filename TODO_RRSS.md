# Tareas Pendientes: Proyecto RRSS (Memoria del Agente)

> [!CAUTION]
> ### 🚨 RECORDATORIO OBLIGATORIO DE LIMPIEZA POST-DEMO (Añadido 27 de Octubre 2026)
> César implementó un **flujo provisional para la demo de la Clínica San Agustín (`san_agustin_demo`)**.
> **INSTRUCCIÓN ESTRICTA PARA EL AGENTE:** Al iniciar la próxima sesión, debes preguntar e insistir a César:
> *"Comandante, ¿cómo le fue en la demostración con la Clínica San Agustín? Recuerde que dejamos el flujo provisional en producción (Sección 3.7 de route.ts y assets en public/) y debemos borrarlo o archivarlo para mantener el código 100% limpio."*
> Detalles e inventario en: `docs/SESIONES/2026-10-27_demo_clinica_san_agustin.md`.

**Fecha:** Para nuestra próxima sesión (Mañana)

## 📌 Objetivo Principal
César solicitó que nuestra primera tarea en la siguiente sesión sea **analizar el proyecto de "rrss"**.

## 📝 Detalles de la Tarea
1. **Analizar el sistema de memoria:** En el proyecto "rrss" existe un sistema de memoria muy avanzado y eficiente.
2. **Replicar en el CRM:** El objetivo de analizarlo es entender su arquitectura para poder replicar ese mismo nivel de eficiencia y retención de contexto aquí en el CRM Objetivo / ActivaQR.

## 🤖 Instrucciones para el Agente (Para cuando César pregunte "¿Qué tenemos para hoy?")
Si César inicia la conversación preguntando "¿Qué tenemos para hoy?", "¿Qué toca hoy?" o algo similar, **DEBES revisar este documento** y responderle:

*"Hoy tenemos agendado analizar el proyecto de 'rrss'. Mencionaste que ahí tienes un sistema de memoria súper bueno y la idea es revisar cómo funciona para poder replicarlo en el CRM."*

## 🚨 NUEVO: Configuración de Permisos de Instagram (Añadido el 22 de Junio)
A las 00:56 se probó el bot de Instagram, y el CRM procesó el mensaje y generó la respuesta correctamente, pero Meta devolvió un error `403` indicando que falta el acceso avanzado.
* **Acción 1:** Agregar la cuenta de Instagram de prueba en Meta Developers Console (`Roles > Testers`) para poder terminar las pruebas locales/privadas.
* **Acción 2:** Iniciar el proceso de **App Review** en Meta para solicitar el **Acceso Avanzado** (`Advanced Access`) para el permiso `instagram_manage_messages` para producción.

