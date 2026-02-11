'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreatorNamePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Load existing data on component mount
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    if (existing.firstName) setFirstName(existing.firstName)
    if (existing.lastName) setLastName(existing.lastName)
  }, [])

  const handleNext = () => {
    if (firstName.trim() && lastName.trim()) {
      // Preservar datos existentes y actualizar solo nombre
      const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
      localStorage.setItem('creatorOnboarding', JSON.stringify({
        ...existing,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        step: 1
      }))
      router.push('/onboarding/creator/phone')
    }
  }

  const isValid = firstName.trim() && lastName.trim()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
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

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <div className="flex space-x-1.5">
          <div className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1 shadow-sm"></div>
          {[2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 1 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          ¿Cuál es tu nombre?
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Así te verán las marcas
        </p>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div>
            <input
              type="text"
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent shadow-sm"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={handleNext}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            isValid
              ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white hover:from-slate-600 hover:to-slate-700 hover:shadow-2xl hover:scale-[1.02]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}