import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/contexts/AuthContext'
import QueryProvider from '../lib/providers/QueryProvider'
import SupportChatWidget from '../components/support/SupportChatWidget'
import SessionRefresher from '../components/SessionRefresher'
import InviteNotifier from '../components/InviteNotifier'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'App Octopus - Marketplace Digital Global',
  description: 'Conecta creadores con marcas para tareas de UGC, servicios digitales y más',
  keywords: 'UGC, marketplace, freelance, contenido digital, servicios digitales',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Octopus' },
}

// Viewport nativo: cubre el notch (safe-area), evita el zoom al enfocar inputs
// en iOS y fija el color de la barra del navegador.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}