'use client'

import { useEffect } from 'react'
import { ensureFreshToken } from '@/lib/session'

// Mantiene el access token fresco en toda la app: lo renueva al cargar y
// cada 10 minutos. Sin esto el token vence a la hora y todo falla con
// "JWT expired". No renderiza nada.
export default function SessionRefresher() {
  useEffect(() => {
    ensureFreshToken()
    const id = setInterval(() => { ensureFreshToken() }, 10 * 60 * 1000)
    const onFocus = () => ensureFreshToken()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [])
  return null
}
