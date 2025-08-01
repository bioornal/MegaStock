-- Script para restaurar la función de decremento de stock
-- Ejecutar en Supabase SQL Editor

-- Eliminar cualquier versión anterior de la función
DROP FUNCTION IF EXISTS decrement_product_stock(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS decrement_product_stock(UUID, INTEGER);

-- Crear la función correcta para decrementar stock
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

-- Verificar que la función se creó correctamente
SELECT proname, proargtypes::regtype[] as argument_types 
FROM pg_proc 
WHERE proname = 'decrement_product_stock';
