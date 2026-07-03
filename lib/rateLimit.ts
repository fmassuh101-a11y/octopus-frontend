import { NextRequest, NextResponse } from 'next/server'

// Rate limiter simple en memoria (por instancia). Suficiente para frenar
// abuso básico. Para escala real: migrar a Upstash Redis o Vercel WAF.
const buckets = new Map<string, { count: number; reset: number }>()

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  return ip
}

/**
 * Devuelve una respuesta 429 si el cliente superó el límite, o null si puede seguir.
 * @param limit  máximo de peticiones por ventana
 * @param windowMs  ventana en ms (por defecto 60s)
 */
export function rateLimit(
  req: NextRequest,
  { limit = 30, windowMs = 60_000, name = 'default' }: { limit?: number; windowMs?: number; name?: string } = {}
): NextResponse | null {
  const key = `${name}:${clientKey(req)}`
  const now = Date.now()
  const b = buckets.get(key)

  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return null
  }

  b.count++
  if (b.count > limit) {
    const retry = Math.ceil((b.reset - now) / 1000)
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Intenta de nuevo en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    )
  }
  return null
}
