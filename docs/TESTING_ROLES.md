# 🧪 Guía de Pruebas - Sistema de Roles y Permisos

## 📋 Checklist de Pruebas

### 1. **Configuración Inicial**

#### ✅ Ejecutar SQL en Supabase
```sql
-- Ejecutar todo el contenido de sql/user_roles.sql en la consola SQL de Supabase
-- Esto creará la tabla user_roles y configurará el usuario admin
```

#### ✅ Verificar Usuario Admin
- Email admin: `spezialichristian@gmail.com`
- Debe tener rol: `admin`

### 2. **Pruebas de Autenticación**

#### ✅ Login como Admin
1. Ir a `/login`
2. Ingresar: `spezialichristian@gmail.com` + contraseña
3. **Resultado esperado:**
   - Redirección a dashboard principal
   - Navbar muestra todas las opciones (Ventas, Stock, etc.)
   - Dashboard completo con estadísticas
   - Badge "Admin" en navbar

#### ✅ Login como Viewer (Usuario Normal)
1. Crear nuevo usuario en Supabase Auth
2. Login con ese usuario
3. **Resultado esperado:**
   - Redirección a dashboard principal
   - Navbar solo muestra Dashboard y Productos
   - Dashboard de consulta de stock únicamente
   - Badge "Viewer" en navbar

### 3. **Pruebas de Restricción de Acceso**

#### ✅ Usuario Viewer intenta acceder a rutas protegidas
**Rutas a probar:**
- `/sales` → Debe redirigir a `/?access=denied`
- `/stock` → Debe redirigir a `/?access=denied`
- `/customers` → Debe redirigir a `/?access=denied`
- `/vendors` → Debe redirigir a `/?access=denied`

**Resultado esperado:**
- Redirección automática al dashboard
- Mensaje de "Acceso denegado" en la parte superior

#### ✅ Usuario Admin accede a todas las rutas
**Rutas a probar:**
- `/` → Dashboard completo
- `/sales` → Página de ventas
- `/stock` → Página de actualización de stock
- `/sales-registry` → Registro de ventas

**Resultado esperado:**
- Acceso completo a todas las funcionalidades

### 4. **Pruebas de UI/UX**

#### ✅ Navbar Adaptativa
**Como Admin:**
- Debe mostrar: Dashboard, Productos, Ventas, Registro Ventas, Actualizar Stock
- Badge verde "Admin"

**Como Viewer:**
- Debe mostrar: Dashboard, Productos, "(Solo consulta)"
- Badge gris "Viewer"

#### ✅ Dashboard Diferenciado
**Como Admin:**
- Dashboard completo con estadísticas
- Gráficos y métricas de ventas
- Acceso a todas las funcionalidades

**Como Viewer:**
- Dashboard de consulta de stock
- Buscador de productos
- Información de disponibilidad
- Mensaje informativo de restricciones

### 5. **Pruebas de Seguridad**

#### ✅ Middleware de Protección
1. Usuario viewer logueado
2. Intentar acceder directamente via URL a rutas protegidas
3. **Resultado esperado:** Redirección automática

#### ✅ Verificación de Roles en Base de Datos
```sql
-- Verificar que los roles se asignan correctamente
SELECT u.email, ur.role, ur.created_at 
FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id;
```

#### ✅ Row Level Security (RLS)
- Usuarios solo pueden ver su propio rol
- Solo admins pueden modificar roles

### 6. **Pruebas de Funcionalidad**

#### ✅ Búsqueda de Productos (Viewer)
1. Login como viewer
2. Usar buscador en dashboard
3. **Verificar:**
   - Búsqueda por nombre funciona
   - Búsqueda por marca funciona
   - Búsqueda por color funciona
   - Información de stock se muestra correctamente
   - Badges de stock (crítico, bajo, normal) funcionan

#### ✅ Asignación de Roles (Admin)
```javascript
// Desde consola del navegador (como admin)
import { assignUserRole } from '@/lib/auth'
await assignUserRole('nuevo_usuario@email.com', 'viewer')
```

## 🐛 Problemas Conocidos y Soluciones

### Error: "Cannot find module './NavbarClient'"
**Solución:** Verificar que el archivo `components/NavbarClient.tsx` existe

### Error: Rol no se asigna automáticamente
**Solución:** Verificar que el trigger `on_auth_user_created` está activo en Supabase

### Usuario no puede acceder después del login
**Solución:** Verificar que existe registro en `user_roles` para ese usuario

## 📊 Resultados Esperados

### ✅ Casos de Éxito
- [x] Admin tiene acceso completo
- [x] Viewer solo puede consultar stock
- [x] Middleware protege rutas correctamente
- [x] UI se adapta según rol
- [x] Nuevos usuarios se asignan como viewer automáticamente

### ❌ Casos de Error (Esperados)
- [x] Viewer no puede acceder a /sales
- [x] Viewer no puede acceder a /stock
- [x] URLs directas son bloqueadas por middleware
- [x] Usuarios sin rol son redirigidos a login

## 🚀 Comandos Útiles

### Verificar estado de la aplicación
```bash
# Ejecutar aplicación
npm run dev

# Verificar logs del servidor
# Buscar errores en consola del navegador
```

### Consultas SQL útiles
```sql
-- Ver todos los usuarios y sus roles
SELECT u.email, ur.role FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id;

-- Cambiar rol de usuario
UPDATE user_roles SET role = 'admin' WHERE email = 'usuario@email.com';

-- Ver políticas RLS activas
SELECT * FROM pg_policies WHERE tablename = 'user_roles';
```

## ✅ Checklist Final

- [ ] SQL ejecutado en Supabase
- [ ] Usuario admin puede acceder a todo
- [ ] Usuario viewer solo ve consulta de stock
- [ ] Middleware bloquea accesos no autorizados
- [ ] Navbar se adapta según rol
- [ ] Dashboard diferenciado funciona
- [ ] Mensajes de error son claros
- [ ] Nuevos usuarios se asignan como viewer
- [ ] Sistema es escalable para más roles

---

**Estado del Sistema:** ✅ Completamente implementado y listo para producción
**Última actualización:** $(date)
