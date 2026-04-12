'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { Package, LogIn } from 'lucide-react'

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
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        background: 'var(--ms-bg-deep)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,92,231,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,206,201,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div className="ms-animate-slide" style={{ width: '100%', maxWidth: '400px', padding: '0 1.5rem' }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--ms-radius-md)',
              background: 'linear-gradient(135deg, var(--ms-accent) 0%, #a29bfe 100%)',
              boxShadow: '0 8px 32px rgba(108, 92, 231, 0.3)'
            }}
          >
            <Package size={28} color="#fff" />
          </div>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--ms-text-primary)',
            marginBottom: '0.25rem'
          }}>
            MegaStock
          </h2>
          <p style={{ color: 'var(--ms-text-muted)', fontSize: '0.9rem' }}>
            Ingresa a tu cuenta
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--ms-bg-raised)',
            border: '1px solid var(--ms-border)',
            borderRadius: 'var(--ms-radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--ms-shadow-lg)'
          }}
        >
          <form onSubmit={handleSignIn}>
            <div className="mb-3">
              <label
                htmlFor="email"
                className="form-label"
                style={{
                  color: 'var(--ms-text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="tu@email.com"
                style={{
                  background: 'var(--ms-bg-surface)',
                  border: '1px solid var(--ms-border)',
                  color: 'var(--ms-text-primary)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--ms-radius-sm)'
                }}
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="form-label"
                style={{
                  color: 'var(--ms-text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Contrasena
              </label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                style={{
                  background: 'var(--ms-bg-surface)',
                  border: '1px solid var(--ms-border)',
                  color: 'var(--ms-text-primary)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--ms-radius-sm)'
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--ms-red-dim)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  color: 'var(--ms-red)',
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--ms-radius-sm)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}
              >
                {error === 'Invalid login credentials' ? 'Credenciales incorrectas.' : error}
              </div>
            )}

            <button
              type="submit"
              className="btn w-100"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, var(--ms-accent) 0%, #a29bfe 100%)',
                color: '#fff',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                padding: '0.75rem',
                borderRadius: 'var(--ms-radius-sm)',
                border: 'none',
                fontSize: '1rem',
                boxShadow: '0 4px 16px rgba(108, 92, 231, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status" />
                  Ingresando...
                </span>
              ) : (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <LogIn size={18} />
                  Ingresar
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
