-- Agregar el campo business_name (razón social) a la tabla customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Crear índice para búsquedas más rápidas por razón social
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_name);

-- Nota: Después de ejecutar este script en tu base de datos de Supabase,
-- el campo razón social estará disponible para todos los clientes.
