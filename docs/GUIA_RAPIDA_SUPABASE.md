# 📝 Guía Rápida: Crear Tablas en Supabase

## Paso 1: Acceder al SQL Editor

1. Ve a [https://supabase.com/dashboard/project/sxsdmjpaqgmpmvozoicj](https://supabase.com/dashboard/project/sxsdmjpaqgmpmvozoicj)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**

## Paso 2: Ejecutar el Script

1. Abre el archivo [`supabase-schema.sql`](file:///c:/Users/Cesar/Documents/GRUPO%20EMPRESARIAL%20REYES/PROYECTOS/CRM%20OBJETIVO/CRM%20V2/supabase-schema.sql)
2. Copia TODO el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona `Ctrl+Enter`)

## Paso 3: Verificar

Después de ejecutar el script, deberías ver:
- ✅ Mensaje de éxito
- 12 tablas creadas

Para verificar, ve a **Table Editor** en el menú lateral y deberías ver todas estas tablas:

- `prospects` - Contactos importados de CSV
- `leads` - Leads de Recorridos
- `clients` - Clientes convertidos
- `quotations` - Cotizaciones
- `campaigns` - Campañas de marketing
- `tasks` - Tareas
- `events` - Eventos/Citas
- `interactions` - Historial de interacciones
- `transactions` - Transacciones financieras
- `financial_goals` - Metas financieras
- `products` - Catálogo de productos
- `contracts` - Contratos (nuevo módulo)

## Paso 4: Probar la Aplicación

Una vez creadas las tablas, ejecuta:

```bash
npm run dev
```

La aplicación debería conectarse correctamente a Supabase.

## ⚠️ Nota Importante

Si ya ejecutaste el script antes y ves errores de "table already exists", es normal. El script usa `CREATE TABLE IF NOT EXISTS`, así que es seguro ejecutarlo múltiples veces.
