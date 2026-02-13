'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

export default function CompanyLogoPage() {
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<any>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth state from localStorage
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const isAuthenticated = !!accessToken && !!user

  useEffect(() => {
    // Load existing company onboarding data
    const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
    setFormData(existing)
    if (existing.logo) setLogo(existing.logo)

    // Check session from localStorage
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (token && userStr) {
      try {
        setAccessToken(token)
        setUser(JSON.parse(userStr))
      } catch (e) {
        console.error('Error parsing user:', e)
      }
    }

    setCheckingSession(false)
  }, [])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Compress image for mobile compatibility
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.onload = () => {
          // Create canvas to resize/compress
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 400 // Max width/height in pixels
          let width = img.width
          let height = img.height

          // Resize if needed
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // Convert to compressed JPEG (0.7 quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)

          setLogo(compressedBase64)
          try {
            const existing = JSON.parse(localStorage.getItem('companyOnboarding') || '{}')
            existing.logo = compressedBase64
            localStorage.setItem('companyOnboarding', JSON.stringify(existing))
          } catch (storageError) {
            console.error('localStorage error:', storageError)
            // Continue without saving to localStorage - logo is in state
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (!isAuthenticated || !user || !accessToken) {
      setError('Debes iniciar sesión para guardar tu perfil')
      setLoading(false)
      return
    }

    try {
      const allData = {
        userType: 'company',
        companyName: formData.companyName || null,
        website: formData.website || null,
        businessType: formData.businessType || null,
        orgType: formData.orgType || null,
        niche: formData.niche || null,
        role: formData.role || null,
        phoneNumber: formData.phoneNumber ? `${formData.countryCode || '+1'}${formData.phoneNumber}` : null,
        tiktok: formData.tiktok || null,
        instagram: formData.instagram || null,
        linkedin: formData.linkedin || null,
        appStoreUrl: formData.appStoreUrl || null,
        hiringRange: formData.hiringRange || null,
        marketingStrategy: formData.marketingStrategy || null,
        logo: logo || null
      }

      const profileData = {
        user_id: user.id,
        user_type: 'company',
        full_name: formData.companyName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Empresa',
        bio: JSON.stringify(allData),
        updated_at: new Date().toISOString()
      }

      // Use API route to save profile (bypasses RLS issues)
      console.log('Saving company profile via API...')
      const saveResponse = await fetch('/api/profile/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          profileData: profileData,
          userToken: accessToken
        })
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        console.error('Save error:', errorData)
        throw new Error(errorData.error || 'No se pudo guardar tu perfil. Por favor intenta de nuevo.')
      }

      const saveResult = await saveResponse.json()
      console.log('Company profile saved successfully:', saveResult)

      // Clear onboarding data
      localStorage.removeItem('companyOnboarding')

      // Redirect to dashboard
      window.location.href = '/company/dashboard'

    } catch (err: any) {
      console.error('[CompanyLogo] Error:', err)
      setError(err.message || 'Error guardando. Intenta de nuevo.')
      setLoading(false)
    }
  }

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-50 flex">
      {/* Left Section */}
      <div className="flex-1 p-8 max-w-2xl">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl text-white">🐙</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Octopus</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 font-medium mb-6">
          Paso 6 de 7
        </div>

        {/* Progress dots */}
        <div className="flex space-x-2 mb-8">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
          ))}
          <div className="w-10 h-2.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Logo de tu Empresa</h1>
        <p className="text-gray-500 mb-8">Sube el logo de tu empresa para que los creadores te reconozcan</p>

        {/* Auth status */}
        {!isAuthenticated ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-800 text-sm text-center">
              No hay sesión activa.{' '}
              <a href="/auth/login" className="font-bold underline">Inicia sesión</a> para guardar tu perfil.
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-800 text-sm text-center">
              ✓ Sesión activa: {user?.email}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-center py-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-36 h-36 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-100 border-3 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:from-slate-200 hover:to-slate-200 transition-all hover:scale-105 overflow-hidden shadow-lg"
          >
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500 font-medium">Subir logo</p>
              </div>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            {logo ? 'Cambiar Foto' : 'Seleccionar Archivo'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          <p className="text-sm text-gray-400 mt-4">PNG, JPG o GIF (max. 5MB)</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Link href="/onboarding/company/terms" className="flex items-center text-gray-500 hover:text-gray-700 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Atras
          </Link>

          <button
            onClick={handleSubmit}
            disabled={loading || !isAuthenticated}
            className={`px-10 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl ${
              loading || !isAuthenticated
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-700'
            } text-white`}
          >
            {loading ? 'Guardando...' : !isAuthenticated ? 'Inicia sesión primero' : 'Finalizar'}
          </button>
        </div>
      </div>

      {/* Right Section - Summary Card */}
      <div className="hidden lg:block w-96 bg-white/50 backdrop-blur-sm p-8 overflow-y-auto border-l border-slate-100">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h3 className="font-bold text-gray-900 text-lg">Tu Empresa</h3>
          <p className="text-sm text-gray-500 mb-6">Resumen de tu informacion</p>

          <div className="border-t border-gray-100 pt-4 space-y-4 text-sm">
            {formData.companyName && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🏢</span>
                <div>
                  <p className="text-xs text-gray-400">Nombre de empresa</p>
                  <p className="font-medium text-gray-800">{formData.companyName}</p>
                </div>
              </div>
            )}
            {formData.website && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🌐</span>
                <div>
                  <p className="text-xs text-gray-400">Sitio web</p>
                  <p className="font-medium text-gray-800">{formData.website}</p>
                </div>
              </div>
            )}
            {formData.phoneNumber && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">📞</span>
                <div>
                  <p className="text-xs text-gray-400">Telefono</p>
                  <p className="font-medium text-gray-800">{formData.countryCode}{formData.phoneNumber}</p>
                </div>
              </div>
            )}
            {formData.orgType && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🏛️</span>
                <div>
                  <p className="text-xs text-gray-400">Tipo de organizacion</p>
                  <p className="font-medium text-gray-800">{formData.orgType}</p>
                </div>
              </div>
            )}
            {formData.niche && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="text-xs text-gray-400">Industria</p>
                  <p className="font-medium text-gray-800">{formData.niche}</p>
                </div>
              </div>
            )}
            {formData.tiktok && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">🎵</span>
                <div>
                  <p className="text-xs text-gray-400">TikTok</p>
                  <p className="font-medium text-gray-800">@{formData.tiktok}</p>
                </div>
              </div>
            )}
            {formData.instagram && (
              <div className="flex items-start space-x-3">
                <span className="text-lg">📸</span>
                <div>
                  <p className="text-xs text-gray-400">Instagram</p>
                  <p className="font-medium text-gray-800">@{formData.instagram}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
