import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/contexts/AuthContext'
import QueryProvider from '../lib/providers/QueryProvider'
import SupportChatWidget from '../components/support/SupportChatWidget'
import SessionRefresher from '../components/SessionRefresher'
import InviteNotifier from '../components/InviteNotifier'
import Toaster from '../components/oct/toast'
import AlertBridge from '../components/oct/AlertBridge'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

// metadataBase + Open Graph/Twitter: sin esto Google no tiene una URL
// canónica clara para asociar al nombre "Octapi", y cualquier link
// compartido (WhatsApp, Twitter, etc.) se veía como texto pelado sin
// preview. También ayuda a que la marca "Octapi" quede asociada a este
// dominio específico en vez de ambigua.
export const metadata: Metadata = {
  metadataBase: new URL('https://octapiapp.com'),
  title: 'Octapi - Marketplace Digital Global',
  description: 'Conecta creadores con marcas para tareas de UGC, servicios digitales y más',
  keywords: 'UGC, marketplace, freelance, contenido digital, servicios digitales, Octapi',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Octapi' },
  openGraph: {
    title: 'Octapi - Marketplace Digital Global',
    description: 'Conecta creadores con marcas para tareas de UGC, servicios digitales y más',
    url: 'https://octapiapp.com',
    siteName: 'Octapi',
    locale: 'es_CL',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Octapi — Creadores que monetizan' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Octapi - Marketplace Digital Global',
    description: 'Conecta creadores con marcas para tareas de UGC, servicios digitales y más',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
}

// Viewport nativo: cubre el notch (safe-area), evita el zoom al enfocar inputs
// en iOS y fija el color de la barra del navegador.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // NO se bloquea el zoom. Antes había maximumScale: 1 para evitar que iOS
  // hiciera zoom al enfocar un campo, pero ese problema no existe acá: iOS solo
  // hace zoom cuando el campo tiene menos de 16px, y ninguno de los nuestros lo
  // tiene. Se estaba pagando una falla de accesibilidad por un problema que no
  // estaba. Si alguna vez reaparece, se arregla poniendo el campo en 16px, no
  // impidiendo que la gente haga zoom.
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <SessionRefresher />
            <InviteNotifier />
            <div id="root" className="min-h-screen bg-neutral-950">
              {children}
            </div>
            <SupportChatWidget />
            <Toaster />
            <AlertBridge />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}