// Helpers de seguridad reutilizables.

// Devuelve una URL segura para usar en href. Solo http(s); bloquea
// javascript:, data:, vbscript: (evita XSS por links de usuario).
export function safeExternalUrl(url?: string | null): string {
  if (!url) return '#'
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href
    return '#'
  } catch {
    return '#'
  }
}

// Sanitiza un término de búsqueda antes de meterlo en un filtro PostgREST
// (ilike / or=). Quita los metacaracteres del mini-lenguaje ( , ) ( * & ) y
// deja solo caracteres seguros. Evita inyección de filtros para leer datos ajenos.
export function pgSearchTerm(s?: string | null): string {
  if (!s) return ''
  // solo letras (incl. acentos á-ú/ñ), números, espacio, . _ -
  // elimina los metacaracteres de PostgREST: , ( ) * & % : etc.
  return s
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s._-]/g, '')
    .trim()
    .slice(0, 60)
}

// Valida que un string sea un UUID (para filtros in.() y eq. con ids de datos)
export function isUuid(s?: string | null): boolean {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
