// Validación de email: formato + TLD válido + detección de errores de tipeo
// comunes (gmail.comp, hotmial, etc.). No garantiza que la casilla exista
// (para eso hace falta confirmación por correo), pero frena la basura obvia.

const VALID_TLDS = new Set([
  'com', 'net', 'org', 'edu', 'gov', 'io', 'co', 'app', 'dev', 'me', 'info',
  'biz', 'xyz', 'online', 'site', 'store', 'tech', 'cl', 'ar', 'mx', 'es',
  'pe', 'br', 'uy', 'py', 'bo', 'ec', 'co', 've', 'gt', 'cr', 'pa', 'do',
  'us', 'ca', 'uk', 'de', 'fr', 'it', 'pt', 'nl', 'se', 'no', 'fi',
])

// Dominios populares y sus typos frecuentes → sugerencia correcta
const COMMON_DOMAINS: Record<string, string> = {
  'gmail.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.comp': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com', 'gnail.com': 'gmail.com',
  'hotmail.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'outlook.com': 'outlook.com', 'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com',
  'yahoo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'icloud.com': 'icloud.com', 'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com',
  'live.com': 'live.com', 'proton.me': 'proton.me', 'protonmail.com': 'protonmail.com',
}

export function validateEmail(raw: string): { valid: boolean; message?: string; suggestion?: string } {
  const email = raw.trim().toLowerCase()

  // Formato básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: 'Ingresa un email válido (ej. nombre@gmail.com)' }
  }

  const domain = email.split('@')[1]
  const parts = domain.split('.')
  const tld = parts[parts.length - 1]

  // TLD válido (o código de país de 2 letras)
  if (!VALID_TLDS.has(tld) && tld.length !== 2) {
    return { valid: false, message: `El dominio ".${tld}" no parece válido. Revisa tu email.` }
  }

  // Detección de typo en dominios populares
  if (COMMON_DOMAINS[domain] && COMMON_DOMAINS[domain] !== domain) {
    const fixed = email.replace(domain, COMMON_DOMAINS[domain])
    return { valid: false, message: `¿Quisiste decir ${fixed}?`, suggestion: fixed }
  }

  return { valid: true }
}
