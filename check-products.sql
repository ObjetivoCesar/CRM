-- Verificar cuántos productos hay realmente
SELECT COUNT(*) as total FROM products;

-- Ver si hay productos sin nombre
SELECT COUNT(*) as sin_nombre FROM products WHERE "Nombre del Producto o Servicio" IS NULL OR "Nombre del Producto o Servicio" = '';

-- Ver los primeros 5 productos
SELECT id, "Nombre del Producto o Servicio", "Categoría para Blog" FROM products LIMIT 5;
