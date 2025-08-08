-- Sistema de órdenes/compras con múltiples productos
-- Ejecutar en Supabase SQL Editor

-- Tabla principal de órdenes/compras
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  cash_session_id INTEGER REFERENCES cash_sessions(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  ticket_number VARCHAR(50) UNIQUE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'qr', 'transfer')),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos dentro de cada orden
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  apply_promotion BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para generar número de ticket único para órdenes
CREATE OR REPLACE FUNCTION generate_order_ticket_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  ticket_num VARCHAR(50);
  current_date_str VARCHAR(8);
  sequence_num INTEGER;
BEGIN
  -- Formato: YYYYMMDD-NNNN (ej: 20250808-0001)
  current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Obtener el siguiente número de secuencia para hoy
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_number, '-', 2) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders 
  WHERE ticket_number LIKE current_date_str || '-%';
  
  ticket_num := current_date_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar automáticamente el número de ticket en órdenes
CREATE OR REPLACE FUNCTION set_order_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_order_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_ticket_number ON orders;
CREATE TRIGGER trigger_set_order_ticket_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_ticket_number();

-- Función para actualizar totales de la orden cuando se modifican los items
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  order_subtotal DECIMAL(10,2);
  order_iva DECIMAL(10,2);
  order_total DECIMAL(10,2);
BEGIN
  -- Calcular totales de la orden
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(subtotal * 0.21), 0),
    COALESCE(SUM(subtotal * 1.21), 0)
  INTO order_subtotal, order_iva, order_total
  FROM order_items 
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Actualizar la orden
  UPDATE orders 
  SET 
    subtotal = order_subtotal,
    iva_amount = order_iva,
    total_amount = order_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_totals ON order_items;
CREATE TRIGGER trigger_update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_totals();

-- Función para decrementar stock cuando se confirma una orden
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo decrementar stock si la orden está completada
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Decrementar stock para todos los items de la orden
    UPDATE products 
    SET stock = stock - oi.quantity
    FROM order_items oi 
    WHERE products.id = oi.product_id 
    AND oi.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decrement_stock_on_order ON orders;
CREATE TRIGGER trigger_decrement_stock_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock_on_order();

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_orders_cash_session ON orders(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ticket_number ON orders(ticket_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Comentarios
COMMENT ON TABLE orders IS 'Órdenes/compras principales - una por transacción';
COMMENT ON TABLE order_items IS 'Productos dentro de cada orden';
COMMENT ON FUNCTION generate_order_ticket_number IS 'Genera números únicos de ticket por día para órdenes';
COMMENT ON FUNCTION set_order_ticket_number IS 'Trigger para asignar número de ticket automáticamente a órdenes';
COMMENT ON FUNCTION update_order_totals IS 'Actualiza totales de la orden cuando se modifican los items';
COMMENT ON FUNCTION decrement_stock_on_order IS 'Decrementa stock cuando se confirma una orden';
