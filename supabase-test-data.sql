-- =====================================================
-- DATOS DE PRUEBA PARA MÓDULO DE CONTRATOS
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor
-- para crear clientes de prueba
-- =====================================================

-- Insertar clientes de prueba
INSERT INTO clients (id, business_name, contact_name, phone, email, city, business_type, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'Restaurante 200 Millas',
    'Martha Isabel Moncayo Carrión',
    '0987654321',
    'martha@200millas.com',
    'Loja',
    'Restaurante',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Hotel Plaza Grande',
    'Carlos Alberto Jiménez',
    '0998765432',
    'carlos@plazagrande.com',
    'Quito',
    'Hotel',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Cafetería El Buen Sabor',
    'Ana María González',
    '0976543210',
    'ana@buensabor.com',
    'Cuenca',
    'Restaurante',
    NOW(),
    NOW()
  );

-- Verificar que se insertaron
SELECT id, business_name, contact_name, city FROM clients ORDER BY created_at DESC LIMIT 5;
