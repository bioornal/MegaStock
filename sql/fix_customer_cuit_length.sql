-- Aumentar el límite de caracteres para el campo cuit_dni en la tabla customers
ALTER TABLE customers
ALTER COLUMN cuit_dni TYPE VARCHAR(30);

-- Nota: Después de ejecutar este script en tu base de datos de Supabase,
-- el problema de "valor demasiado largo" quedará resuelto.
