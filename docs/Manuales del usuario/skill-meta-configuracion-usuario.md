---
name: meta-configuracion-usuarios
description: Documentación clara para usuarios, roles de administración y gerencia sobre cómo activar, validar y solucionar problemas de conectividad con Facebook e Instagram en el CRM.
---

# Manual de Configuración: Conexión de Redes Sociales (Meta) al CRM

Este manual está diseñado para instruir al equipo administrativo sobre cómo preparar las cuentas sociales del negocio (Facebook e Instagram) para que la Inteligencia Artificial del CRM (Donna) pueda responder automáticamente a los clientes.

Es fundamental seguir estos pasos al pie de la letra, ya que Meta (la empresa matriz de Facebook e Instagram) tiene estrictas reglas de privacidad y seguridad antes de permitir que un Bot responda en tu nombre.

---

## 1. Requisitos Indispensables (Checklist Inicial)

Antes de intentar conectar el CRM a las redes de un negocio, **debes tener listo lo siguiente**:

1. [ ] **Página de Facebook Empresarial:** Creada y activa.
2. [ ] **Cuenta Profesional de Instagram:** 
   - Debe estar en estado "Empresa" o "Creador".
   - **Crucial:** Debe ser Pública (Meta bloquea las cuentas Privadas).
3. [ ] **Vinculación Oficial:** La cuenta de Instagram debe estar ligada a esa misma página de Facebook desde el *Centro de Cuentas de Meta Business Suite*.

---

## 2. Modo de Pruebas (Cómo probar el bot de inmediato)

Mientras esperas los permisos oficiales de Meta para hablar con todo el público, puedes usar un modo seguro llamado **Modo Tester**, que le permite a tus empleados hacer pruebas reales conversando con el bot hoy mismo.

1. Ingresa al panel de creador de [Meta for Developers](https://developers.facebook.com/).
2. En el menú izquierdo, ve a **Roles de la Aplicación > Roles**.
3. Haz clic en **"Agregar personas"** y selecciona **Tester** (o Probador).
4. Escribe el nombre de usuario de Facebook de las personas del equipo que van a hacer las pruebas.
5. Esas personas deberán aceptar la invitación en sus notificaciones.
> 💡 *A partir de ese momento, solo esas personas elegidas podrán enviarle un mensaje a la página de la empresa y la Inteligencia Artificial (Donna) les responderá inmediatamente.*

---

## 3. El Salto a Producción: Permisos de Acceso Avanzado

Para que cualquier prospecto desconocido en el mundo pueda hablar con Donna, hay que solicitar a Meta un permiso formal conocido como **Acceso Avanzado**.

1. En tu aplicación de desarrollador, ve a **Revisión de la aplicación > Permisos y API**.
2. Dale al botón azul que dice **Solicitar acceso avanzado** para los dos permisos más importantes:
   * `pages_messaging`: Le permite a Donna hablar por Messenger (Facebook).
   * `instagram_manage_messages`: Le permite a Donna acceder a los Direct Messages (DMs) de Instagram.
3. Se generará un formulario donde deberás explicar que se usa para "Un CRM propio de atención automatizada a clientes y prospectos".

---

## 4. Verificación del Negocio por Parte de Meta

A Meta no le gustan las cuentas anónimas manejando automatizaciones masivas. Para que te aprueben el paso 3, Meta te forzará a **Verificar la Identidad Legal de tu Negocio**.

1. Ve a tu [Business Manager](https://business.facebook.com/settings/) y luego haz clic en **Centro de Seguridad**.
2. Pulsa en el botón para **Iniciar la verificación de Negocio**.
3. Sube los documentos solicitados. Por lo general, Meta te pedirá:
   * Número y extracto del RUC / Registro Mercantil de la empresa.
   * Planilla de servicios básicos que confirme la dirección legal del negocio a ese nombre.
> ⏱️ *Este proceso suele ser manual por parte de Meta y se demora entre 2 a 3 días laborables (o más si los documentos no coinciden exactamente).*

---

## 5. Módulo de Solución de Errores (Troubleshooting)

Si ves que un cliente escribe, pero el bot nunca le contesta:

* **SITUACIÓN:** El cliente comenta pero Donna lo ignora.
  * *Razón general:* Instagram puede no estar en modo Público.
* **SITUACIÓN:** Puedes ver los mensajes del cliente llegando a la plataforma (los "Lees" en pantalla), pero cuando Donna intenta enviar el texto de vuelta, se bloquea (Meta lo reporta internamente como "Error #3 - Capability").
  * *Razón:* Tu aplicación aún está configurada en **Acceso Estándar** y no ha recibido el **Acceso Avanzado** explicado en el Punto 3, o aún no está Verificado el Negocio (Punto 4). El cliente no está registrado como "Tester", así que Meta le "cierra la puerta en la cara" al bot.
