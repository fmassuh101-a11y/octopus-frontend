import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/contexts/AuthContext'
import QueryProvider from '../lib/providers/QueryProvider'
import SupportChatWidget from '../components/support/SupportChatWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'App Octopus - Marketplace Digital Global',
  description: 'Conecta creadores con marcas para tareas de UGC, servicios digitales y más',
  keywords: 'UGC, marketplace, freelance, contenido digital, servicios digitales',
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
            <div id="root" className="min-h-screen bg-gray-50">
              {children}
            </div>
            <SupportChatWidget />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}