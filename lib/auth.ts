import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'viewer'

export interface AppUser {
  id: string
  email: string
  role: UserRole | null
}

export interface UserWithRole {
  id: string
  email: string
  role: UserRole
}

// Cliente - para uso en componentes
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fallback para admin principal
    const adminEmails = ['spezialichristian@gmail.com', 'admin@megastock.com']
    if (adminEmails.includes(user.email || '')) {
      return 'admin'
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    return roleData?.role || 'viewer'
  } catch (error) {
    console.error('Error getting user role:', error)
    // Fallback para admin principal en caso de error
    const { data: { user } } = await supabase.auth.getUser()
    if (user && ['spezialichristian@gmail.com', 'admin@megastock.com'].includes(user.email || '')) {
      return 'admin'
    }
    return null
  }
}



// Verificar si el usuario es admin
export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === 'admin'
}

// Obtener usuario completo con rol
export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Auth user:', user?.email)
    
    if (!user) {
      console.log('No authenticated user found')
      return null
    }

    // SOLUCIÓN TEMPORAL: Asignar roles basado en email hasta que se configure la BD
    let role: UserRole = 'viewer' // Por defecto viewer
    
    // Emails de admin
    const adminEmails = [
      'spezialichristian@gmail.com',
      'admin@megastock.com'
    ]
    
    if (adminEmails.includes(user.email || '')) {
      role = 'admin'
      console.log('User is admin based on email:', user.email)
    }

    // Intentar obtener rol de la base de datos (si existe)
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (!roleError && roleData) {
        role = roleData.role
        console.log('Role from database:', role)
      } else {
        console.log('Using temporary role assignment:', role)
      }
    } catch (dbError) {
      console.log('Database not configured, using temporary roles')
    }

    return {
      id: user.id,
      email: user.email || '',
      role: role
    }
  } catch (error) {
    console.error('Error getting user with role:', error)
    return null
  }
}










