-- Script para corregir las políticas RLS de user_roles
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;

-- 2. Crear políticas corregidas sin recursión
-- Política simple: usuarios pueden ver todos los roles (necesario para verificación de admin)
CREATE POLICY "Users can view all roles" ON user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para insertar/actualizar: solo usuarios específicos conocidos como admin
CREATE POLICY "Known admins can manage roles" ON user_roles
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email = 'spezialichristian@gmail.com'
    )
  );

-- 3. Alternativamente, si prefieres deshabilitar RLS completamente:
-- ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
