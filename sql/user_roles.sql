-- Crear tabla para gestionar roles de usuarios
CREATE TABLE user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Habilitar Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver su propio rol
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que solo admins puedan insertar/actualizar roles
CREATE POLICY "Only admins can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Insertar el usuario admin principal
INSERT INTO user_roles (user_id, email, role) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'spezialichristian@gmail.com'),
  'spezialichristian@gmail.com',
  'admin'
);

-- Función para asignar rol automáticamente a nuevos usuarios
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_roles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para asignar rol 'viewer' por defecto a nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM user_roles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
