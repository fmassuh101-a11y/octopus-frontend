import { NextResponse, type NextRequest } from 'next/server'

// Escudo en el BORDE (corre en el edge de Vercel, antes de tocar la app).
// Activo en producción sin ninguna configuración. Capa extra sobre lib/shield.ts
// (que ya protege las API routes con rate-limit + anti-CSRF).
//
// Bloquea sondas de ataque comunes en la URL: SQL injection, XSS, path
// traversal, y archivos sensibles que ningún usuario legítimo pide.

// Patrones maliciosos en la ruta o el query string
const ATTACK = [
  /(\.\.[/\\])/,                                   // path traversal  ../
  /(union[\s/*]+select|select.+from\s|insert\s+into\s|drop\s+table|;\s*--)/i, // SQLi
  /(<script|javascript:|onerror\s*=|onload\s*=)/i, // XSS
  /(\/etc\/passwd|\/proc\/self|\bcmd\.exe\b)/i,    // LFI / RCE
  /(\.(env|git|sql|bak|htaccess|aws)\b)/i,         // archivos sensibles
  /(\$\{jndi:|\bwget\b|\bcurl\s+http)/i,           // log4shell / command inj
]

// User-agents de herramientas de hacking/escaneo conocidas
const BAD_UA = /(sqlmap|nikto|nmap|masscan|acunetix|nessus|havij|dirbuster|wpscan)/i

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const target = decodeURIComponent(url.pathname + url.search)

  // 1) sondas de ataque en la URL → 400
  if (ATTACK.some((rx) => rx.test(target))) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // 2) herramientas de escaneo → 403
  const ua = req.headers.get('user-agent') || ''
  if (BAD_UA.test(ua)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // 3) refuerzo de headers en cada respuesta del edge
  const res = NextResponse.next()
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  return res
}

export const config = {
  // corre en todo menos assets estáticos e imágenes de Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)'],
}
