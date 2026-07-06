import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Escudo para las API routes: rate limiting + verificación de origen (anti-CSRF).
//
// Rate limiting en 2 modos, automático:
//  - DISTRIBUIDO (blindaje total, todas las instancias comparten el contador):
//    se activa SOLO agregando en Vercel las env vars gratis de Upstash Redis
//    (UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN). Recomendado.
//  - EN MEMORIA (fallback por-instancia): si no hay Upstash, igual corta bursts.
//
// Origen: los POST/PATCH/PUT/DELETE solo se aceptan desde nuestra propia app
// (corta CSRF y bots que peguen directo a la API desde otro sitio).

// --- Redis distribuido (si hay credenciales) ---
const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
const redis = hasRedis ? Redis.fromEnv() : null
const limiters = new Map<number, Ratelimit>()
function distLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null
  if (!limiters.has(limit)) {
    limiters.set(limit, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix: 'oct-rl',
      analytics: false,
    }))
  }
  return limiters.get(limit)!
}

// --- fallback en memoria ---
const buckets = new Map<string, number[]>()

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

interface ShieldOpts {
  limit?: number       // requests por ventana (default 30)
  windowMs?: number    // ventana en ms (default 60s)
  sameOrigin?: boolean // exigir mismo origen en mutaciones (default true)
}

function tooMany(windowMs: number) {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Esperá un momento.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
  )
}

export async function shieldAsync(req: Request, opts: ShieldOpts = {}): Promise<NextResponse | null> {
  const { limit = 30, windowMs = 60_000, sameOrigin = true } = opts

  // 1) mismo origen para mutaciones (anti-CSRF)
  if (sameOrigin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
      } catch {
        return NextResponse.json({ error: 'Origen inválido' }, { status: 403 })
      }
    }
  }

  const key = `${clientIp(req)}:${new URL(req.url).pathname}`

  // 2a) rate limit distribuido (blindaje total)
  const dl = distLimiter(limit, windowMs)
  if (dl) {
    try {
      const { success } = await dl.limit(key)
      return success ? null : tooMany(windowMs)
    } catch {
      // si Redis falla, no dejamos la API sin protección → caemos a memoria
    }
  }

  // 2b) rate limit en memoria (fallback)
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) return tooMany(windowMs)
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    const cutoff = now - windowMs
    buckets.forEach((v, k) => { if (!v.some((t) => t > cutoff)) buckets.delete(k) })
  }
  return null
}

// Versión síncrona (compat con el fallback en memoria) — mantiene la firma
// que ya usan las 22 rutas. Usa memoria; si hay Redis, preferí shieldAsync.
export function shield(req: Request, opts: ShieldOpts = {}): NextResponse | null {
  const { limit = 30, windowMs = 60_000, sameOrigin = true } = opts
  if (sameOrigin && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
      } catch {
        return NextResponse.json({ error: 'Origen inválido' }, { status: 403 })
      }
    }
  }
  const key = `${clientIp(req)}:${new URL(req.url).pathname}`
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) return tooMany(windowMs)
  hits.push(now)
  buckets.set(key, hits)
  return null
}
