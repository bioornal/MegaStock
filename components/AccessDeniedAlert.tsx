'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function AccessDeniedAlert() {
  const searchParams = useSearchParams()
  const [showAccessDenied, setShowAccessDenied] = useState(false)

  useEffect(() => {
    if (searchParams.get('access') === 'denied') {
      setShowAccessDenied(true)
      // Ocultar mensaje después de 5 segundos
      setTimeout(() => setShowAccessDenied(false), 5000)
    }
  }, [searchParams])

  if (!showAccessDenied) return null

  return (
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
  )
}
