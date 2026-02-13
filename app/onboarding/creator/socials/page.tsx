'use client'

import { useState, useRef, useEffect } from 'react'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

export default function CreatorSocialsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [instagram, setInstagram] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [youtube, setYoutube] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Auth state from localStorage
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Load saved data
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    if (existing.instagram) setInstagram(existing.instagram)
    if (existing.tiktok) setTiktok(existing.tiktok)
    if (existing.youtube) setYoutube(existing.youtube)
    if (existing.profilePhoto) setProfilePhoto(existing.profilePhoto)

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

  const isAuthenticated = !!accessToken && !!user

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

          setProfilePhoto(compressedBase64)
          try {
            const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
            existing.profilePhoto = compressedBase64
            localStorage.setItem('creatorOnboarding', JSON.stringify(existing))
          } catch (storageError) {
            console.error('localStorage error:', storageError)
            // Continue without saving to localStorage - photo is in state
          }
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFinish = async () => {
    setError('')
    setLoading(true)

    if (!profilePhoto) {
      setError('La foto de perfil es obligatoria.')
      setLoading(false)
      return
    }

    if (!isAuthenticated || !user || !accessToken) {
      setError('Debes iniciar sesión para guardar tu perfil.')
      setLoading(false)
      return
    }

    try {
      const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')

      const allData = {
        userType: 'creator',
        firstName: existing.firstName || null,
        lastName: existing.lastName || null,
        location: existing.location || null,
        phoneNumber: existing.phoneNumber ? `${existing.countryCode || '+56'}${existing.phoneNumber}` : null,
        academicLevel: existing.academicLevel || null,
        studies: existing.studies || null,
        linkedInUrl: existing.linkedInUrl || null,
        instagram: instagram.trim() || null,
        tiktok: tiktok.trim() || null,
        youtube: youtube.trim() || null,
        profilePhoto: profilePhoto || null
      }

      const profileData = {
        user_id: user.id,
        user_type: 'creator',
        full_name: `${existing.firstName || ''} ${existing.lastName || ''}`.trim() || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
        location: existing.location || null,
        phone_number: existing.phoneNumber ? `${existing.countryCode || '+56'}${existing.phoneNumber}` : null,
        academic_level: existing.academicLevel || null,
        studies: existing.studies || null,
        linkedin_url: existing.linkedInUrl || null,
        instagram: instagram.trim() || null,
        tiktok: tiktok.trim() || null,
        youtube: youtube.trim() || null,
        profile_photo_url: profilePhoto || null,
        bio: JSON.stringify(allData),
        updated_at: new Date().toISOString()
      }

      // Use API route to save profile (bypasses RLS issues)
      console.log('Saving profile via API...')
      const saveResponse = await fetch('/api/profile/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          profileData: profileData
        })
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        console.error('Save error:', errorData)
        throw new Error(errorData.error || 'No se pudo guardar tu perfil. Por favor intenta de nuevo.')
      }

      const saveResult = await saveResponse.json()
      console.log('Profile saved successfully:', saveResult)

      // IMPORTANT: Keep onboarding data in localStorage as backup
      localStorage.setItem('creatorOnboarding', JSON.stringify(allData))
      console.log('Saved to localStorage:', allData)

      // Redirect to dashboard
      window.location.href = '/creator/dashboard'

    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Error guardando tu perfil.')
      setLoading(false)
    }
  }

  const removePhoto = () => {
    setProfilePhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    delete existing.profilePhoto
    localStorage.setItem('creatorOnboarding', JSON.stringify(existing))
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">🐙</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">OCTOPUS</span>
        </div>
        <div className="w-8"></div>
      </div>

      {/* Progress */}
      <div className="px-6 py-4">
        <div className="flex space-x-1.5">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 8 de 8 - ¡Último paso!</p>
      </div>

      <div className="px-6 pb-32">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Foto y Redes Sociales</h1>
        <p className="text-gray-500 text-center mb-8">Las marcas quieren conocerte mejor</p>

        {/* Auth status */}
        {!isAuthenticated ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-yellow-800 text-sm text-center">
              No hay sesión activa. <a href="/auth/login" className="font-bold underline">Inicia sesión</a> para guardar tu perfil.
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
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform relative overflow-hidden"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Perfil" className="w-full h-full object-cover rounded-full" />
              ) : (
                <>
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex items-center justify-center absolute -bottom-0 -right-0 shadow-lg border-2 border-white">
                    <span className="text-white text-lg font-bold">+</span>
                  </div>
                </>
              )}
            </div>
            {profilePhoto && (
              <button onClick={removePhoto} className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 shadow-lg border-2 border-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        </div>

        <p className="text-center text-sm text-slate-600 mb-8 font-medium">* Foto de perfil obligatoria</p>

        {/* Social Media Inputs */}
        <div className="space-y-4">
          {/* Instagram */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-slate-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium mb-1">Instagram</p>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-1">@</span>
                  <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="tu_usuario" className="flex-1 text-gray-800 font-medium focus:outline-none bg-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* TikTok */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.432-1.884-1.432-3.052V.621h-3.714v14.325c0 1.568-1.277 2.845-2.845 2.845s-2.845-1.277-2.845-2.845 1.277-2.845 2.845-2.845c.195 0 .39.02.579.058V8.539c-.193-.013-.386-.02-.579-.02-3.462 0-6.265 2.803-6.265 6.265s2.803 6.265 6.265 6.265 6.265-2.803 6.265-6.265V8.317a9.14 9.14 0 0 0 5.125 1.553V6.538a5.549 5.549 0 0 1-2.119-.976z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium mb-1">TikTok</p>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-1">@</span>
                  <input type="text" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="tu_usuario" className="flex-1 text-gray-800 font-medium focus:outline-none bg-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* YouTube */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium mb-1">YouTube</p>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-1">@</span>
                  <input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="tu_canal" className="flex-1 text-gray-800 font-medium focus:outline-none bg-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">Las redes sociales son opcionales</p>
      </div>

      {/* Fixed Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={handleFinish}
          disabled={loading || !isAuthenticated}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            loading || !isAuthenticated
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-700'
          } text-white`}
        >
          {loading ? 'Guardando...' : !isAuthenticated ? 'Inicia sesión primero' : '¡Completar Perfil!'}
        </button>
      </div>
    </div>
  )
}
