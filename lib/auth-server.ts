import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'viewer'

// Cliente admin para operaciones administrativas
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Servidor - para uso en API routes
export async function getCurrentUserRoleServer(): Promise<UserRole | null> {
  const supabase = createServerClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Server auth user:', user?.email)
    
    if (!user) {
      console.log('No authenticated user found on server')
      return null
    }

    // Fallback para admin principal
    const adminEmails = ['spezialichristian@gmail.com', 'admin@megastock.com']
    if (adminEmails.includes(user.email || '')) {
      console.log('User is admin based on email (server):', user.email)
      return 'admin'
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.log('Error fetching role from DB, using fallback:', roleError.message)
      return 'viewer'
    }

    console.log('Role from database (server):', roleData?.role)
    return roleData?.role || 'viewer'
  } catch (error) {
    console.error('Error getting user role on server:', error)
    // Fallback para admin principal en caso de error
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && ['spezialichristian@gmail.com', 'admin@megastock.com'].includes(user.email || '')) {
        console.log('Using admin fallback due to error')
        return 'admin'
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }
    return null
  }
}

// Función para crear un nuevo usuario (solo admins) - SERVIDOR
export async function createInvitationServer(email: string, role: UserRole): Promise<{ success: boolean; message: string; invitationLink?: string }> {
  try {
    const currentUserRole = await getCurrentUserRoleServer();
    if (currentUserRole !== 'admin') {
      return { success: false, message: 'Solo los administradores pueden crear usuarios.' };
    }

    // Usar cliente admin con service role key
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: { role: role },
        // Opcional: Redirigir a una página específica después del registro
        // redirectTo: 'http://localhost:3000/welcome'
      },
    });

    if (error) {
      console.error('Error generating invitation link:', error.message);
      if (error.message.includes('already registered')) {
        return { success: false, message: 'Un usuario con este email ya está registrado.' };
      }
      return { success: false, message: `Error al generar la invitación: ${error.message}` };
    }

    return {
      success: true,
      message: 'Enlace de invitación generado. Compártelo con el nuevo usuario.',
      invitationLink: data.properties.action_link,
    };

  } catch (e: any) {
    console.error('Unexpected error in createInvitation:', e);
    return { success: false, message: `Error inesperado: ${e.message}` };
  }
}

// Función para eliminar un usuario (solo admins) - SERVIDOR
export async function deleteUserServer(userEmail: string): Promise<{ success: boolean; message: string }> {
  const supabase = createServerClient()
  
  try {
    // Verificar que el usuario actual es admin
    const currentUserRole = await getCurrentUserRoleServer()
    if (currentUserRole !== 'admin') {
      return { success: false, message: 'Solo los administradores pueden eliminar usuarios' }
    }

    // No permitir eliminar al admin principal
    if (userEmail === 'spezialichristian@gmail.com') {
      return { success: false, message: 'No se puede eliminar al administrador principal' }
    }

    // Usar cliente admin para operaciones administrativas
    const adminClient = createAdminClient()

    // Buscar el usuario por email
    const { data: userData } = await adminClient.auth.admin.listUsers()
    const targetUser = userData.users.find(u => u.email === userEmail)
    
    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' }
    }

    // Eliminar de user_roles primero
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUser.id)

    if (roleError) {
      return { success: false, message: 'Error al eliminar rol del usuario' }
    }

    // Eliminar el usuario de Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUser.id)

    if (authError) {
      return { success: false, message: 'Error al eliminar usuario de autenticación' }
    }

    return { success: true, message: `Usuario ${userEmail} eliminado exitosamente` }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, message: 'Error interno al eliminar usuario' }
  }
}

// Función para asignar rol a un usuario (solo admins) - SERVIDOR
export async function updateUserRoleServer(userId: string, role: UserRole): Promise<{ success: boolean; message: string }> {
  const supabase = createServerClient()
  try {
    const currentRole = await getCurrentUserRoleServer()
    if (currentRole !== 'admin') {
      return { success: false, message: 'Solo los administradores pueden actualizar roles' }
    }

    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role })

    if (error) {
      return { success: false, message: 'Error al actualizar el rol' }
    }
    return { success: true, message: 'Rol actualizado' }
  } catch (e) {
    return { success: false, message: 'Error inesperado' }
  }
}

export async function getAllUsersWithRolesServer(): Promise<Array<{id: string, email: string, role: UserRole | null}>> {
  const adminClient = createAdminClient()
  const supabase = createServerClient()
  
  const { data: userList } = await adminClient.auth.admin.listUsers()
  const users = userList.users

  // Fetch roles in one query
  const { data: roles } = await supabase.from('user_roles').select('user_id, role')
  const roleMap = new Map(roles?.map(r => [r.user_id, r.role]))

  return users.map(u => ({
    id: u.id,
    email: u.email || '',
    role: roleMap.get(u.id) || null
  }))
}

export async function assignUserRoleServer(userEmail: string, role: UserRole): Promise<boolean> {
  const supabase = createServerClient()
  const adminClient = createAdminClient()
  
  try {
    // Verificar que el usuario actual es admin
    const currentUserRole = await getCurrentUserRoleServer()
    if (currentUserRole !== 'admin') {
      throw new Error('Solo los administradores pueden asignar roles')
    }

    // Buscar el usuario por email
    const { data: userData } = await adminClient.auth.admin.listUsers()
    const targetUser = userData.users.find(u => u.email === userEmail)
    
    if (!targetUser) {
      throw new Error('Usuario no encontrado')
    }

    // Actualizar o insertar el rol
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: targetUser.id,
        email: userEmail,
        role: role
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error assigning role:', error)
    return false
  }
}
