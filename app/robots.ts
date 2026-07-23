import { MetadataRoute } from 'next'

// Sin esto, un rastreador nuevo no tiene ninguna señal explícita de que
// puede indexar el sitio — Next.js lo sirve automáticamente en /robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: 'https://octapiapp.com/sitemap.xml',
  }
}
