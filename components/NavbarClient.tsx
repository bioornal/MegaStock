'use client'

import Link from 'next/link'
import { Home, Package, Plus, ShoppingCart, FileText, AlertTriangle, Users } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import AuthButton from './AuthButton'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavbarClient() {
  const { user, loading, isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const [showAccessDenied, setShowAccessDenied] = useState(false)

  useEffect(() => {
    if (searchParams.get('access') === 'denied') {
      setShowAccessDenied(true)
      // Ocultar mensaje después de 5 segundos
      setTimeout(() => setShowAccessDenied(false), 5000)
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          <li className="nav-item">
            <span className="nav-link">Cargando...</span>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <>
      {/* Mensaje de acceso denegado */}
      {showAccessDenied && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 1050 }}>
          <div className="alert alert-warning alert-dismissible fade show d-flex align-items-center" role="alert">
            <AlertTriangle className="me-2" size={16} />
            <span>Acceso denegado. Solo los administradores pueden acceder a esa sección.</span>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setShowAccessDenied(false)}
            ></button>
          </div>
        </div>
      )}

      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          {/* Dashboard - Todos pueden acceder */}
          <li className="nav-item">
            <Link href="/" className="nav-link d-flex align-items-center">
              <Home className="me-1" size={20} />
              Dashboard
            </Link>
          </li>

          {/* Productos - Solo para referencia, redirige al dashboard */}
          <li className="nav-item">
            <Link href="/" className="nav-link d-flex align-items-center">
              <Package className="me-1" size={20} />
              Productos
            </Link>
          </li>

          {/* Opciones solo para administradores */}
          {isAdmin && (
            <>
              <li className="nav-item">
                <Link href="/sales" className="nav-link d-flex align-items-center">
                  <ShoppingCart className="me-1" size={20} />
                  Ventas
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/sales-registry" className="nav-link d-flex align-items-center">
                  <FileText className="me-1" size={20} />
                  Registro Ventas
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/stock" className="nav-link d-flex align-items-center">
                  <Plus className="me-1" size={20} />
                  Actualizar Stock
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/admin/users" className="nav-link d-flex align-items-center">
                  <Users className="me-1" size={20} />
                  Gestión Usuarios
                </Link>
              </li>
            </>
          )}

          {/* Indicador de rol para usuarios no admin */}
          {user && !isAdmin && (
            <li className="nav-item">
              <span className="nav-link text-muted">
                <small>(Solo consulta)</small>
              </span>
            </li>
          )}
        </ul>

        {/* Mostrar rol del usuario y botón de logout */}
        <div className="d-flex align-items-center">
          {user && (
            <span className="navbar-text me-3 text-white-50">
              <small>
                {user.email} 
                <span className={`badge ms-2 ${isAdmin ? 'bg-success' : 'bg-secondary'}`}>
                  {isAdmin ? 'Admin' : 'Viewer'}
                </span>
              </small>
            </span>
          )}
          <AuthButton />
        </div>
      </div>
    </>
  )
}
