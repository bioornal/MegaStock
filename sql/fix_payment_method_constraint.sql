-- Corregir restricción not-null en payment_method de tabla tickets
-- Ejecutar en Supabase SQL Editor

-- 1. Remover la restricción not-null de payment_method
-- Esto permite que payment_method sea null, ya que ahora usamos ticket_payments para múltiples pagos
ALTER TABLE public.tickets 
ALTER COLUMN payment_method DROP NOT NULL;

-- 2. Verificar que el constraint check permite null
-- (Si existe un constraint que no permite null, lo recreamos)
DO $$
BEGIN
    -- Intentar eliminar constraint existente si existe
    BEGIN
        ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_payment_method_check;
    EXCEPTION 
        WHEN OTHERS THEN NULL;
    END;
    
    -- Crear nuevo constraint que permite null o valores válidos
    ALTER TABLE public.tickets 
    ADD CONSTRAINT tickets_payment_method_check 
    CHECK (payment_method IS NULL OR payment_method IN ('cash','card','qr','transfer'));
END $$;

-- 3. Verificar que la función create_ticket_with_items funciona correctamente
-- (La función ya está preparada para manejar payment_method = null)

SELECT 'Corrección aplicada exitosamente. La columna payment_method ahora puede ser null.' as resultado;
