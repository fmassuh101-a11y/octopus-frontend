'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorLinkedInPage() {
  const router = useRouter()
  const [linkedInUrl, setLinkedInUrl] = useState('')

  const handleNext = () => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    localStorage.setItem('creatorOnboarding', JSON.stringify({
      ...existing,
      linkedInUrl: linkedInUrl.trim(),
      step: 7
    }))
    router.push('/onboarding/creator/socials')
  }

  const handleSkip = () => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    localStorage.setItem('creatorOnboarding', JSON.stringify({
      ...existing,
      linkedInUrl: '',
      step: 7
    }))
    router.push('/onboarding/creator/socials')
  }

  const isValidLinkedInUrl = (url: string) => {
    if (!url) return false
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|profile)\/[a-zA-Z0-9-]+\/?$/
    return linkedinRegex.test(url)
  }

  const canProceed = linkedInUrl === '' || isValidLinkedInUrl(linkedInUrl)

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 to-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white font-black">O</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">OCTOPUS</span>
        </div>

        <div className="w-8"></div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <div className="flex space-x-1.5">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex-1 shadow-sm"></div>
          ))}
          <div className="h-1.5 bg-neutral-800 rounded-full flex-1"></div>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-2">Paso 7 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Agrega tu LinkedIn
        </h1>

        <p className="text-neutral-400 text-center mb-8">
          Comparte tu perfil profesional <span className="text-sm text-neutral-500">(Opcional)</span>
        </p>

        {/* LinkedIn Input */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-3 z-10">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">in</span>
              </div>
            </div>
            <input
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/tu-nombre"
              className="w-full pl-16 pr-4 py-4 border border-neutral-800 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-900 text-white placeholder-neutral-500"
            />
          </div>

          {linkedInUrl && !isValidLinkedInUrl(linkedInUrl) && (
            <p className="text-red-500 text-sm mt-2 ml-2">
              Por favor ingresa un URL válido de LinkedIn
            </p>
          )}

          <p className="text-neutral-500 text-sm mt-2 ml-2">
            Ejemplo: https://linkedin.com/in/tu-nombre
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-8 text-white placeholder-neutral-500">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">¿Por qué agregar LinkedIn?</h3>
              <ul className="text-sm text-neutral-400 space-y-1">
                <li>* Aumenta la confianza de las marcas</li>
                <li>* Muestra tu experiencia profesional</li>
                <li>* Mejora tus posibilidades de ser contratado</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800 space-y-3">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            canProceed
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-600 hover:shadow-2xl hover:scale-[1.02]'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          } placeholder-neutral-500`}
        >
          {linkedInUrl ? 'Continuar' : 'Continuar sin LinkedIn'}
        </button>

        {linkedInUrl === '' && (
          <button
            onClick={handleSkip}
            className="w-full py-3 text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            Saltar por ahora
          </button>
        )}
      </div>
    </div>
  )
}