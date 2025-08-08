-- Script para agregar las columnas necesarias para tickets agrupados
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas para tickets a la tabla sales
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
  -- Formato: YYYYMMDD-NNNN (ej: 20250808-0001)
  current_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Obtener el siguiente número de secuencia para hoy
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_number, '-', 2) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM sales 
  WHERE ticket_number LIKE current_date_str || '-%'
  AND ticket_number IS NOT NULL;
  
  ticket_num := current_date_str || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar automáticamente el número de ticket
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo generar ticket_number si needs_ticket es true y ticket_number está vacío
  IF NEW.needs_ticket = true AND (NEW.ticket_number IS NULL OR NEW.ticket_number = '') THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_set_ticket_number ON sales;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Mensaje de confirmación
SELECT 'Migración completada: columnas ticket_number y needs_ticket agregadas a la tabla sales' as resultado;
