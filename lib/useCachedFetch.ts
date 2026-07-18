'use client'

import { useEffect, useRef, useState } from 'react'

// FLUIDEZ: stale-while-revalidate con localStorage.
// La página muestra AL INSTANTE lo último que vio (aunque el wifi esté malo o
// la red tarde) y actualiza por detrás cuando llega lo fresco. Mata los
// "0 en todo" y las pantallas vacías de carga en navegaciones repetidas.
//
// Uso:
//   const { data, fresh, refresh } = useCachedFetch<MiTipo>('clave-única', fetcher)
//   - data: lo cacheado (instantáneo) o lo fresco cuando llega
//   - fresh: true cuando ya llegó la versión fresca de la red
//
// La caché es por navegador y por clave; incluir el user id en la clave.

const PREFIX = 'oct-cache-'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7 // 7 días; después se ignora

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { t, v } = JSON.parse(raw)
    if (Date.now() - t > MAX_AGE_MS) return null
    return v as T
  } catch { return null }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }))
  } catch {} // storage lleno/privado: seguimos sin caché
}

export function useCachedFetch<T>(
  key: string | null, // null = todavía no hay clave (ej: user aún no cargó)
  fetcher: () => Promise<T>,
) {
  const [data, setData] = useState<T | null>(() => (key && typeof window !== 'undefined' ? readCache<T>(key) : null))
  const [fresh, setFresh] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = async () => {
    if (!key) return
    try {
      const v = await fetcherRef.current()
      if (v !== undefined && v !== null) {
        setData(v)
        setFresh(true)
        writeCache(key, v)
      }
    } catch {} // sin red: se queda lo cacheado
  }

  useEffect(() => {
    if (!key) return
    const cached = readCache<T>(key)
    if (cached !== null) setData(cached)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data, fresh, refresh }
}
