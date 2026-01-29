'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorTestimonialPage() {
  const router = useRouter()

  const handleNext = () => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    localStorage.setItem('creatorOnboarding', JSON.stringify({
      ...existing,
      step: 5
    }))
    router.push('/onboarding/creator/studies')
  }

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
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1 shadow-sm"></div>
          ))}
          {[6,7,8].map(i => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 5 de 8</p>
      </div>

      <div className="px-6 flex flex-col items-center justify-center flex-1 pb-32">
        {/* Main Message */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            #1 aplicación para ganar dinero
          </h1>

          {/* 5 Star Rating */}
          <div className="flex justify-center space-x-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className="w-10 h-10 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Trusted Message */}
          <p className="text-lg text-gray-600 font-medium">
            Confiado por miles de usuarios
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-slate-600 opacity-10 rounded-3xl"></div>
          <div className="relative p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-slate-700 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-4xl">🎯</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Únete a nuestra comunidad de creadores exitosos que han transformado su pasión en ingresos reales
            </p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white hover:from-slate-600 hover:to-slate-700 hover:shadow-2xl hover:scale-[1.02]"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}