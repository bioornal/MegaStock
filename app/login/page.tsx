'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-lg" style={{ width: '24rem' }}>
        <div className="card-body p-5">
          <h3 className="card-title text-center mb-4">MegaStock Login</h3>
          <form onSubmit={handleSignIn}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="alert alert-danger p-2" role="alert">
                {error === 'Invalid login credentials' ? 'Credenciales incorrectas.' : error}
              </div>
            )}
            <div className="d-grid">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

