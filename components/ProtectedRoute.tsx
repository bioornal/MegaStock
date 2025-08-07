'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { UserRole } from '@/lib/auth'
import { ReactNode } from 'react'
import { AlertTriangle, Lock } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole: UserRole
  fallback?: ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { user, loading, hasAccess } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning d-flex align-items-center" role="alert">
          <AlertTriangle className="me-2" size={20} />
          <div>
            <h5 className="alert-heading">Acceso Denegado</h5>
            <p className="mb-0">Debes iniciar sesión para acceder a esta página.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAccess(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="container mt-5">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <Lock className="me-2" size={20} />
          <div>
            <h5 className="alert-heading">Acceso Restringido</h5>
            <p className="mb-0">
              No tienes permisos para acceder a esta funcionalidad. 
              Solo los administradores pueden realizar esta acción.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
