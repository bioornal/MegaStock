'use client'

import Link from 'next/link'
import { Home, Package, Plus, ShoppingCart, FileText, Users, BarChart3, Tag } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import AuthButton from './AuthButton'
import { Suspense } from 'react'
import AccessDeniedAlert from './AccessDeniedAlert'

export default function NavbarClient() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          <li className="nav-item">
            <span className="nav-link" style={{ color: 'var(--ms-text-muted)' }}>Cargando...</span>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={null}>
        <AccessDeniedAlert />
      </Suspense>

      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
          <li className="nav-item">
            <Link href="/" className="nav-link d-flex align-items-center gap-1">
              <Home size={16} />
              <span>Dashboard</span>
            </Link>
          </li>

          <li className="nav-item">
            <Link href="/" className="nav-link d-flex align-items-center gap-1">
              <Package size={16} />
              <span>Productos</span>
            </Link>
          </li>

          {isAdmin && (
            <>
              <li className="nav-item">
                <Link href="/sales" className="nav-link d-flex align-items-center gap-1">
                  <ShoppingCart size={16} />
                  <span>Ventas</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/sales-registry" className="nav-link d-flex align-items-center gap-1">
                  <FileText size={16} />
                  <span>Registro</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/top-selling" className="nav-link d-flex align-items-center gap-1">
                  <BarChart3 size={16} />
                  <span>Top Ventas</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/stock" className="nav-link d-flex align-items-center gap-1">
                  <Plus size={16} />
                  <span>Stock</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/price-update" className="nav-link d-flex align-items-center gap-1">
                  <Tag size={16} />
                  <span>Precios</span>
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/admin/users" className="nav-link d-flex align-items-center gap-1">
                  <Users size={16} />
                  <span>Usuarios</span>
                </Link>
              </li>
            </>
          )}

          {user && !isAdmin && (
            <li className="nav-item">
              <span className="nav-link" style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
                (Solo consulta)
              </span>
            </li>
          )}
        </ul>

        <div className="d-flex align-items-center gap-3">
          {user && (
            <div className="d-flex align-items-center gap-2">
              <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
                {user.email}
              </span>
              <span
                className="badge"
                style={{
                  background: isAdmin ? 'var(--ms-green-dim)' : 'var(--ms-bg-overlay)',
                  color: isAdmin ? 'var(--ms-green)' : 'var(--ms-text-muted)',
                  fontSize: '0.7rem',
                  padding: '0.3em 0.6em'
                }}
              >
                {isAdmin ? 'Admin' : 'Viewer'}
              </span>
            </div>
          )}
          <AuthButton />
        </div>
      </div>
    </>
  )
}
