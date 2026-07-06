import { NextResponse } from 'next/server'

// Escudo para las API routes: rate limiting por IP + verificación de origen.
// - Rate limit: ventana deslizante en memoria (por instancia serverless; en
//   Vercel cada instancia limita lo suyo — suficiente contra abuso/burst).
// - Origen: los POST/PATCH solo se aceptan desde nuestra propia app
//   (corta CSRF y bots que peguen directo a la API desde otros sitios).

const buckets = new Map<string, number[]>()

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

interface ShieldOpts {
  /** máximo de requests por ventana (default 30) */
  limit?: number
  /** ventana en ms (default 60s) */
  windowMs?: number
  /** exigir mismo origen en métodos que mutan (default true) */
  sameOrigin?: boolean
}

export function shield(req: Request, opts: ShieldOpts = {}): NextResponse | null {
  const { limit = 30, windowMs = 60_000, sameOrigin = true } = opts

  // 1) mismo origen para mutaciones
  if (sameOrigin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Origen inválido' }, { status: 403 })
      }
    }
  }

  // 2) rate limit por IP + ruta
  const key = `${clientIp(req)}:${new URL(req.url).pathname}`
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Esperá un momento.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
    )
  }
  hits.push(now)
  buckets.set(key, hits)
  // limpieza ocasional para no crecer sin límite
  if (buckets.size > 5000) {
    const cutoff = now - windowMs
    buckets.forEach((v, k) => { if (!v.some((t) => t > cutoff)) buckets.delete(k) })
  }
  return null
}
