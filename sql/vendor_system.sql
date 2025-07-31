-- Script SQL para crear el sistema de vendedores y ventas diarias
-- Ejecutar en Supabase SQL Editor

-- Tabla de vendedores
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones de caja diarias
CREATE TABLE IF NOT EXISTS cash_sessions (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(10,2),
  total_sales DECIMAL(10,2) DEFAULT 0,
  cash_sales DECIMAL(10,2) DEFAULT 0,
  card_sales DECIMAL(10,2) DEFAULT 0,
  digital_sales DECIMAL(10,2) DEFAULT 0,
  cash_to_render DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(10) CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
  -- Se elimina la restricción UNIQUE(vendor_id, date, status) para reemplazarla por un índice parcial más robusto.
  -- La nueva restricción se crea más abajo.
);

-- Tabla de ventas (reemplaza la funcionalidad anterior)
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  cash_session_id INTEGER REFERENCES cash_sessions(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(10) CHECK (payment_method IN ('cash', 'card', 'qr', 'transfer')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para decrementar stock de productos
CREATE OR REPLACE FUNCTION decrement_product_stock(product_id INTEGER, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET stock = stock - quantity 
  WHERE id = product_id AND stock >= quantity;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para el producto ID %', product_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_cash_sessions_vendor_date ON cash_sessions(vendor_id, date);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sales_session ON sales(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

-- Paso 1: Eliminar explícitamente la restricción conflictiva por su nombre.
-- Esto es necesario porque 'CREATE TABLE IF NOT EXISTS' no altera tablas ya existentes.
ALTER TABLE cash_sessions DROP CONSTRAINT IF EXISTS cash_sessions_vendor_id_date_status_key;

-- Paso 2: Crear la nueva restricción mejorada. Solo puede haber UNA caja abierta por vendedor por día.
-- Esto previene el error de 'duplicate key' al cerrar una caja si otra ya fue cerrada el mismo día.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_cash_session ON cash_sessions(vendor_id, date) WHERE status = 'open';

-- Insertar vendedores de ejemplo
INSERT INTO vendors (name, email, active) VALUES 
  ('Vendedor Principal', 'vendedor1@megastock.com', true),
  ('Vendedor Secundario', 'vendedor2@megastock.com', true)
ON CONFLICT (email) DO NOTHING;

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso completo (ajustar según necesidades de seguridad)
DROP POLICY IF EXISTS "Allow all operations on vendors" ON vendors;
CREATE POLICY "Allow all operations on vendors" ON vendors FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on cash_sessions" ON cash_sessions;
CREATE POLICY "Allow all operations on cash_sessions" ON cash_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;
CREATE POLICY "Allow all operations on sales" ON sales FOR ALL USING (true);

-- Comentarios para documentación
COMMENT ON TABLE vendors IS 'Tabla de vendedores de la tienda';
COMMENT ON TABLE cash_sessions IS 'Sesiones diarias de caja por vendedor';
COMMENT ON TABLE sales IS 'Registro de ventas individuales por sesión de caja';
COMMENT ON FUNCTION decrement_product_stock IS 'Función para decrementar stock de productos de forma segura';
