'use client'

import { useEffect } from 'react'
import { toast } from '@/components/oct/toast'

// NUNCA MÁS el alert() nativo del navegador (el cartel negro "…vercel.app says"
// se ve poco profesional). Este puente lo reemplaza globalmente por nuestro
// toast en TODA la app — cubre los 61 alert() existentes sin tocar cada archivo.
export default function AlertBridge() {
  useEffect(() => {
    window.alert = (msg?: unknown) => {
      const text = String(msg ?? '').trim()
      if (!text) return
      // heurística simple: errores en rojo, el resto neutro
      const isError = /no se pudo|error|inválid|invalid|falló|fallo|rechaz/i.test(text)
      toast(text.slice(0, 180), isError ? 'error' : 'ok')
    }
  }, [])
  return null
}
