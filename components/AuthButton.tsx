'use client'

import { User, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/actions/auth'
import { useTransition } from 'react'

export default function AuthButton() {
  const { user, loading } = useAuth()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center">
        <span className="navbar-text me-3 text-white">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </span>
      </div>
    )
  }

  return user ? (
    <div className="d-flex align-items-center">
      <span className="navbar-text me-3 d-flex align-items-center text-white">
        <User className="me-2" size={20} />
        {user.email}
      </span>
      <button 
        onClick={handleSignOut}
        disabled={isPending}
        className="btn btn-outline-danger d-flex align-items-center"
      >
        {isPending ? (
          <>
            <div className="spinner-border spinner-border-sm me-1" role="status">
              <span className="visually-hidden">Cerrando...</span>
            </div>
            Cerrando...
          </>
        ) : (
          <>
            <LogOut className="me-1" size={16} />
            Salir
          </>
        )}
      </button>
    </div>
  ) : null
}
