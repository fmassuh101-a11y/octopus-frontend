'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [bioData, setBioData] = useState<any>({})
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        window.location.href = '/auth/login'
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      // Fetch profile using REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY || ''
        }
      })

      if (!response.ok) {
        window.location.href = '/auth/login'
        return
      }

      const profiles = await response.json()

      if (profiles.length === 0) {
        window.location.href = '/auth/select-type'
        return
      }

      const profileData = profiles[0]

      if (profileData.user_type !== 'company') {
        window.location.href = '/creator/dashboard'
        return
      }

      setProfile(profileData)

      // Parse bio JSON to get all the data
      if (profileData.bio) {
        try {
          const parsed = JSON.parse(profileData.bio)
          setBioData(parsed)
        } catch (e) {
          console.log('Bio is not JSON')
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading profile:', error)
      window.location.href = '/auth/login'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('companyOnboarding')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  const companyName = profile?.full_name || bioData.companyName || 'Empresa'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/company/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-slate-900">Perfil de Empresa</h1>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-8">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden">
            {bioData.logo ? (
              <img src={bioData.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">
                {companyName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{companyName}</h2>
            <p className="text-slate-300">{user?.email}</p>
            {bioData.website && (
              <p className="text-slate-400 text-sm mt-1">🌐 {bioData.website}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 py-6 pb-20">
        {/* Company Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Informacion de la Empresa</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Nombre de Empresa</span>
              <span className="font-medium text-slate-900">{bioData.companyName || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Sitio Web</span>
              <span className="font-medium text-slate-900">{bioData.website || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Tipo de Negocio</span>
              <span className="font-medium text-slate-900">{bioData.businessType || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Tipo de Organizacion</span>
              <span className="font-medium text-slate-900">{bioData.orgType || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Industria</span>
              <span className="font-medium text-slate-900">{bioData.niche || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-slate-600">Tu Rol</span>
              <span className="font-medium text-slate-900">{bioData.role || 'Sin configurar'}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Informacion de Contacto</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Email</span>
              <span className="font-medium text-slate-900">{user?.email || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-slate-600">Telefono</span>
              <span className="font-medium text-slate-900">{bioData.phoneNumber || 'Sin configurar'}</span>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Redes Sociales</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.432-1.884-1.432-3.052V.621h-3.714v14.325c0 1.568-1.277 2.845-2.845 2.845s-2.845-1.277-2.845-2.845 1.277-2.845 2.845-2.845c.195 0 .39.02.579.058V8.539c-.193-.013-.386-.02-.579-.02-3.462 0-6.265 2.803-6.265 6.265s2.803 6.265 6.265 6.265 6.265-2.803 6.265-6.265V8.317a9.14 9.14 0 0 0 5.125 1.553V6.538a5.549 5.549 0 0 1-2.119-.976z"/>
                  </svg>
                </div>
                <span className="text-slate-600">TikTok</span>
              </div>
              <span className="font-medium text-slate-900">
                {bioData.tiktok ? `@${bioData.tiktok}` : 'Sin configurar'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span className="text-slate-600">Instagram</span>
              </div>
              <span className="font-medium text-slate-900">
                {bioData.instagram ? `@${bioData.instagram}` : 'Sin configurar'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <span className="text-slate-600">LinkedIn</span>
              </div>
              <span className="font-medium text-slate-900">
                {bioData.linkedin || 'Sin configurar'}
              </span>
            </div>
          </div>
        </div>

        {/* Marketing Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Marketing & Contratacion</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Rango de Contratacion</span>
              <span className="font-medium text-slate-900">{bioData.hiringRange || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-slate-600">Estrategia de Marketing</span>
              <span className="font-medium text-slate-900">{bioData.marketingStrategy || 'Sin configurar'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-slate-600">App Store URL</span>
              <span className="font-medium text-slate-900 text-right max-w-[180px] truncate">
                {bioData.appStoreUrl || 'Sin configurar'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <button className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl font-semibold hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg">
          Editar Perfil
        </button>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cerrar sesion</h3>
              <p className="text-slate-600">¿Estas seguro de que quieres cerrar tu sesion?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
