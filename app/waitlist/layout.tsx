import type { Metadata } from 'next'

// app/waitlist/page.tsx es 'use client' (tiene animaciones, formularios,
// contador en vivo) — un componente cliente no puede exportar `metadata`
// directo, por eso va acá, en un layout servidor que envuelve la página.
// Esta es HOY la única página pública real (todo lo demás está detrás del
// muro de la lista de espera), así que es la que más le importa a Google.
export const metadata: Metadata = {
  title: 'Octapi — Creadores que monetizan, marcas que crecen',
  description: 'El marketplace que conecta creadores de contenido (UGC) con marcas de toda Latinoamérica. Campañas pagas, contratos claros y cobros seguros. Únete a la lista de espera.',
  openGraph: {
    title: 'Octapi — Creadores que monetizan, marcas que crecen',
    description: 'El marketplace que conecta creadores de contenido (UGC) con marcas de toda Latinoamérica.',
    url: 'https://octapiapp.com/waitlist',
    siteName: 'Octapi',
    locale: 'es_CL',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Octapi — Creadores que monetizan' }],
  },
  // El layout raíz pone un twitter.title genérico ("Marketplace Digital
  // Global") que pisaba a este; se repite acá para que la tarjeta al
  // compartir diga lo mismo que el resto de la página.
  twitter: {
    card: 'summary_large_image',
    title: 'Octapi — Creadores que monetizan, marcas que crecen',
    description: 'El marketplace que conecta creadores de contenido (UGC) con marcas de toda Latinoamérica.',
    images: ['/og.png'],
  },
  alternates: { canonical: 'https://octapiapp.com/waitlist' },
}

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children
}
