export type UserRole = 'admin' | 'viewer'

export interface UserWithRole {
  id: string
  email: string
  role: UserRole | null
  created_at: string
  last_sign_in_at: string | null
}

export interface CreateUserRequest {
  email: string
  password: string
  role: UserRole
}

export interface ApiResponse<T = any> {
  success?: boolean
  message?: string
  error?: string
  users?: T[]
  user?: T
}

// Obtener todos los usuarios
export async function getAllUsers(): Promise<UserWithRole[]> {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data: ApiResponse<UserWithRole> = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al obtener usuarios')
    }

    return data.users || []
  } catch (error) {
    console.error('Error en getAllUsers:', error)
    throw error
  }
}

// Crear nuevo usuario
export async function createUser(userData: CreateUserRequest): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    const data: ApiResponse = await response.json()

    if (!response.ok) {
      return { success: false, message: data.error || 'Error al crear usuario' }
    }

    return { success: true, message: data.message || 'Usuario creado exitosamente' }
  } catch (error) {
    console.error('Error en createUser:', error)
    return { success: false, message: 'Error de conexión al crear usuario' }
  }
}

// Eliminar usuario
export async function deleteUser(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data: ApiResponse = await response.json()

    if (!response.ok) {
      return { success: false, message: data.error || 'Error al eliminar usuario' }
    }

    return { success: true, message: data.message || 'Usuario eliminado exitosamente' }
  } catch (error) {
    console.error('Error en deleteUser:', error)
    return { success: false, message: 'Error de conexión al eliminar usuario' }
  }
}
