# Diagnóstico Técnico: Error de Conexión Supabase (ENOTFOUND)

## 1. Descripción del Problema
Al intentar conectar la aplicación Next.js (usando Drizzle ORM y `postgres.js`) a la base de datos de Supabase, se produce el siguiente error persistente en el entorno local:

```
Error: getaddrinfo ENOTFOUND db.sxsdmjpaqgmpmvozoicj.supabase.co
```

Este error bloquea completamente el módulo Discovery y cualquier otra funcionalidad que requiera acceso directo a la base de datos desde el backend (API Routes).

---

## 2. Análisis de la Causa Raíz
Supabase ha migrado su infraestructura de conexión directa a **IPv6 nativo** (registros DNS de tipo AAAA).

*   **Evidencia**: El comando `nslookup` confirma que el dominio `db.sxsdmjpaqgmpmvozoicj.supabase.co` solo devuelve una dirección IPv6 (`2600:1f18:2e13:9d26:e2c8:ddef:d9a5:bb60`). No existe un registro IPv4 (A) asociado.
*   **Conflicto**: Node.js en entornos Windows/Redes locales que no tienen IPv6 configurado de extremo a extremo falla al intentar resolver el hostname. Al no encontrar una IPv4, lanza `ENOTFOUND`.

---

## 3. Intentos de Solución y Resultados

### Intento 1: Conexión IPv6 Directa (con Corchetes)
*   **Acción**: Se intentó usar la IP directa en el string de conexión: `postgresql://user:pass@[2600:1f18:2e13:9d26:e2c8:ddef:d9a5:bb60]:5432/postgres`.
*   **Resultado**: Falla con `getaddrinfo ENOTFOUND [2600`.
*   **Conclusión**: El driver de conexión (`postgres.js`) o el entorno de red tiene dificultades para interpretar el formato de corchetes de IPv6 o la red local no sabe cómo rutear ese paquete.

### Intento 2: Uso de Connection Pooler (Supavisor) - Host US-EAST-1
*   **Acción**: Se intentó conectar a través del pooler de Supabase que sí soporta IPv4.
*   **Configuración**:
    *   Host: `aws-0-us-east-1.pooler.supabase.com`
    *   Puerto: `6543` (Transaction Mode)
    *   Usuario: `postgres.sxsdmjpaqgmpmvozoicj` (Formato requerido por el pooler)
*   **Resultado**: Error `Tenant or user not found`.
*   **Conclusión**: A pesar de que la red llega al host del pooler, Supabase rechaza la conexión indicando que no reconoce al usuario/proyecto en esa región específica.

### Intento 3: Cambio de Región del Pooler (SA-EAST-1)
*   **Acción**: Se probó con el host de la región de Sudamérica (Brasil).
*   **Resultado**: Error `Tenant or user not found`.
*   **Conclusión**: El proyecto `sxsdmjpaqgmpmvozoicj` no parece estar accesible a través del hostname genérico del pooler en estas regiones con el usuario proporcionado.

### Intento 4: IP Directa del Pooler (Multiplexado)
*   **Acción**: Se extrajo la IPv4 de `aws-0-us-east-1.pooler.supabase.com` (`52.45.94.125`) y se intentó la conexión IP directa.
*   **Resultado**: Error `Tenant or user not found`.
*   **Conclusión**: Confirmado que no es un problema de DNS con el pooler, sino de autenticación/reconocimiento del proyecto dentro de la red de Supavisor.

---

## 4. Estado Actual del Código
1.  **Protección de Ejecución**: Se aplicaron cambios en `app/discovery/page.tsx` para evitar que la aplicación se "rompa" (crash visual) cuando la API falla, añadiendo comprobaciones de nulidad en la paginación.
2.  **Verificación Supabase-JS**: El cliente oficial `@supabase/supabase-js` (que usa API HTTP/REST) **SÍ FUNCIONA**. Esto confirma que las credenciales son correctas y que la tabla `discovery_leads` existe (30,823 registros).

---

## 5. Puntos Críticos para Investigación
*   **¿En qué región exacta está el proyecto?**: Diferentes regiones requieren diferentes hostnames de pooler. Necesitamos el hostname exacto que aparece en: *Supabase Dashboard -> Settings -> Database -> Connection String (Pooler)*.
*   **Password**: Confirmar si el password `VhTQvB608MDLHoHs` es el actual o si fue reseteado.
*   **Modo de Conexión del Pooler**: Diferenciar entre el puerto `5432` (Session Mode) y `6543` (Transaction Mode).
*   **Soporte IPv4**: Si se desea conexión directa, es posible que se requiera el "IPv4 Add-on" de Supabase (que tiene un costo de $4/mes) o configurar un túnel/VPN.

---
**Elaborado por**: Antigravity AI  
**Fecha**: 20 de Diciembre, 2024
