import { MetadataRoute } from 'next'

// Sin esto Google no tiene forma fácil de descubrir qué páginas indexar —
// Next.js sirve esto automáticamente en /sitemap.xml. middleware.ts ya
// dejaba pasar esa ruta sin el candado de la waitlist, pero el archivo
// nunca había existido.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://octapiapp.com'
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/waitlist`, lastModified: now, changeFrequency: 'daily', priority: 1 },
  ]
}
