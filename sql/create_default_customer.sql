-- Crear cliente "Consumidor Final" por defecto si no existe
INSERT INTO customers (name, customer_type, address, cuit_dni, email, phone, business_name, created_at, updated_at)
SELECT 
  'Consumidor Final',
  'consumidor_final',
  '',
  '',
  '',
  '',
  '',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM customers 
  WHERE name = 'Consumidor Final' 
  AND customer_type = 'consumidor_final'
);

-- Nota: Este script crea el cliente "Consumidor Final" solo si no existe,
-- evitando el error "multiple rows returned" en las búsquedas.
