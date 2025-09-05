'use client'

import { useEffect } from 'react'

export default function BootstrapClient() {
  useEffect(() => {
    // Cargar el bundle JS de Bootstrap (incluye Popper)
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
  }, [])

  return null
}
