'use client'

import { useState, useEffect } from 'react'
import { getCurrentUserWithRole, UserWithRole, UserRole } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<UserWithRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const userData = await getCurrentUserWithRole()
        setUser(userData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener usuario')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const isAdmin = user?.role === 'admin'
  const isViewer = user?.role === 'viewer'
  const hasAccess = (requiredRole: UserRole) => {
    if (!user) return false
    if (requiredRole === 'viewer') return true // Todos pueden ver
    if (requiredRole === 'admin') return user.role === 'admin'
    return false
  }

  return {
    user,
    loading,
    error,
    isAdmin,
    isViewer,
    hasAccess,
    isAuthenticated: !!user
  }
}
