-- Script para agregar funcionalidad de clientes y tickets
-- Ejecutar en Supabase SQL Editor

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  cuit_dni VARCHAR(20), -- CUIT o DNI
  email VARCHAR(255),
  phone VARCHAR(50),
  customer_type VARCHAR(20) DEFAULT 'consumidor_final' CHECK (customer_type IN ('consumidor_final', 'responsable_inscripto', 'monotributista')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columna customer_id a la tabla sales (opcional)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);

-- Agregar campos adicionales para el ticket
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS needs_ticket BOOLEAN DEFAULT false;

-- Función para generar número de ticket único
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  ticket_num VARCHAR(50);
  current_date_str VARCHAR(8);
  sequence_num INTEGER;
BEGIN
  -- Formato: YYYYMMDD-NNNN (ej: 20250731-0001)
  current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Obtener el siguiente número de secuencia para hoy
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_number, '-', 2) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM sales 
  WHERE ticket_number LIKE current_date_str || '-%';
  
  ticket_num := current_date_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar automáticamente el número de ticket
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.needs_ticket = true AND NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON sales;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_customers_cuit_dni ON customers(cuit_dni);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_ticket_number ON sales(ticket_number);

-- Insertar cliente por defecto para "Consumidor Final"
INSERT INTO customers (name, customer_type) VALUES 
  ('Consumidor Final', 'consumidor_final')
ON CONFLICT DO NOTHING;

-- Comentarios
COMMENT ON TABLE customers IS 'Tabla de clientes para generar tickets';
COMMENT ON FUNCTION generate_ticket_number IS 'Genera números únicos de ticket por día';
COMMENT ON FUNCTION set_ticket_number IS 'Trigger para asignar número de ticket automáticamente';
