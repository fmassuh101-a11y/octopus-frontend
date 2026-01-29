'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorLevelPage() {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState('')

  const academicLevels = [
    { value: 'highschool', label: 'Preparatoria', emoji: '🎓' },
    { value: 'freshman', label: 'Primer año', emoji: '📚' },
    { value: 'senior', label: 'Último año', emoji: '🎯' },
    { value: 'graduated', label: 'Graduado', emoji: '🏆' },
    { value: 'grad_student', label: 'Posgrado', emoji: '🔬' },
    { value: 'other', label: 'Otro', emoji: '💡' }
  ]

  const handleNext = () => {
    if (selectedLevel) {
      const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
      localStorage.setItem('creatorOnboarding', JSON.stringify({
        ...existing,
        academicLevel: selectedLevel,
        step: 3
      }))
      router.push('/onboarding/creator/location')
    }
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
          {[1,2,3].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1 shadow-sm"></div>
          ))}
          {[4,5,6,7,8].map(i => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 3 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          ¿Qué te describe mejor?
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Selecciona tu nivel educativo
        </p>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {academicLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelectedLevel(level.value)}
              className={`relative p-6 rounded-2xl text-center font-medium transition-all ${
                selectedLevel === level.value
                  ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg'
                  : 'bg-white border border-gray-100 text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <span className="text-2xl">{level.emoji}</span>
                <span className="text-sm font-semibold">{level.label}</span>
              </div>
              {selectedLevel === level.value && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                  <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={handleNext}
          disabled={!selectedLevel}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            selectedLevel
              ? 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-700 text-white hover:shadow-2xl hover:scale-[1.02]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}