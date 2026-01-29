'use client'

import { useEffect, useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')
    setHasSession(!!token)

    if (token && userStr) {
      checkUserProfile(token, JSON.parse(userStr))
    }
  }, [])

  const checkUserProfile = async (token: string, user: any) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })
      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0 && profiles[0].user_type) {
          setUserType(profiles[0].user_type)
        }
      }
    } catch (e) {
      console.error('Error checking profile:', e)
    }
  }

  const handleContinue = async () => {
    setIsLoading(true)

    // If we already know the user type, redirect
    if (userType === 'creator') {
      window.location.href = '/creator/dashboard'
      return
    } else if (userType === 'company') {
      window.location.href = '/company/dashboard'
      return
    }

    // Otherwise, try to fetch it again
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (!token || !userStr) {
      window.location.href = '/auth/login'
      return
    }

    try {
      const user = JSON.parse(userStr)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=user_type`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0 && profiles[0].user_type) {
          if (profiles[0].user_type === 'creator') {
            window.location.href = '/creator/dashboard'
          } else if (profiles[0].user_type === 'company') {
            window.location.href = '/company/dashboard'
          } else {
            window.location.href = '/auth/select-type'
          }
          return
        }
      }

      // No profile found, go to select type
      window.location.href = '/auth/select-type'
    } catch (e) {
      console.error('Error:', e)
      window.location.href = '/auth/select-type'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('creatorOnboarding')
    localStorage.removeItem('companyOnboarding')
    window.location.reload()
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-2xl">🐙</span>
            </div>
            <span className="text-2xl font-bold">Octopus</span>
          </div>

          <div className="flex items-center space-x-4">
            {hasSession ? (
              <>
                <button
                  onClick={handleContinue}
                  disabled={isLoading}
                  className="bg-white text-black px-6 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                      Cargando...
                    </span>
                  ) : (
                    userType ? (userType === 'creator' ? 'Mi Panel' : 'Mi Dashboard') : 'Continuar'
                  )}
                </button>
                <button onClick={handleLogout} className="text-white/60 hover:text-white px-4 py-2.5 transition">
                  Salir
                </button>
              </>
            ) : (
              <>
                <a href="/auth/login" className="text-white/80 hover:text-white px-4 py-2.5 transition font-medium">
                  Iniciar Sesion
                </a>
                <a href="/auth/register" className="bg-white text-black px-6 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition">
                  Comenzar
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-sm font-medium text-white/80 mb-8">
            La plataforma #1 para creadores en Latinoamerica
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Conecta con marcas.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Multiplica tus ingresos.
            </span>
          </h1>

          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Unete a miles de creadores que ya estan ganando dinero creando contenido UGC,
            clips y colaboraciones con las mejores marcas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth/register"
              className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition transform hover:scale-105"
            >
              Comenzar Gratis
            </a>
            <a
              href="/gigs"
              className="border border-white/20 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition"
            >
              Ver Oportunidades
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-blue-400 mb-1">10K+</div>
            <div className="text-white/60 text-sm">Creadores Activos</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-purple-400 mb-1">500+</div>
            <div className="text-white/60 text-sm">Marcas Premium</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-pink-400 mb-1">$2M+</div>
            <div className="text-white/60 text-sm">Pagado a Creadores</div>
          </div>
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-3xl font-bold text-emerald-400 mb-1">98%</div>
            <div className="text-white/60 text-sm">Satisfaccion</div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Oportunidades para ti</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4">🎬</div>
              <h3 className="font-bold mb-2">Contenido UGC</h3>
              <p className="text-white/60 text-sm">Crea videos autenticos para marcas</p>
              <p className="text-blue-400 text-sm mt-2 font-medium">$200 - $2,000</p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4">✂️</div>
              <h3 className="font-bold mb-2">Clips & Edicion</h3>
              <p className="text-white/60 text-sm">Edita contenido para creadores</p>
              <p className="text-purple-400 text-sm mt-2 font-medium">$50 - $500</p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="font-bold mb-2">Colaboraciones</h3>
              <p className="text-white/60 text-sm">Trabaja directamente con marcas</p>
              <p className="text-pink-400 text-sm mt-2 font-medium">$500 - $10,000</p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="font-bold mb-2">Redes Sociales</h3>
              <p className="text-white/60 text-sm">Gestiona cuentas de marcas</p>
              <p className="text-emerald-400 text-sm mt-2 font-medium">$300 - $2,000/mes</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-12 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl border border-white/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Crea tu perfil gratis y comienza a recibir ofertas de las mejores marcas de Latinoamerica.
          </p>
          <a
            href="/auth/register"
            className="inline-block bg-white text-black px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition transform hover:scale-105"
          >
            Crear Cuenta Gratis
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/40 text-sm">
          © 2024 Octopus. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
