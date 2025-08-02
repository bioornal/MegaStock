-- Agregar los campos city y province a la tabla customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS province VARCHAR(100);

-- Crear índices para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_province ON customers(province);

-- Nota: Después de ejecutar este script en tu base de datos de Supabase,
-- los campos ciudad y provincia estarán disponibles para todos los clientes.
