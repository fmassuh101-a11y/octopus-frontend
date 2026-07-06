/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    domains: ['localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Security headers (aplican a todas las rutas)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Evita que la app se embeba en un iframe de otro sitio (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Evita que el navegador "adivine" tipos de contenido (MIME sniffing)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No filtrar la URL completa como referrer a otros sitios
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desactiva APIs sensibles del navegador que no usamos
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Fuerza HTTPS en el futuro (HSTS)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // CSP: nadie puede inyectar scripts externos ni conectar a servidores ajenos
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src * data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.whop.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
