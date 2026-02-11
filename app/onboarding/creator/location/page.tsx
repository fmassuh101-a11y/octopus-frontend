'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCitiesFormatted } from '@/lib/data/countries'

export default function CreatorLocationPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load existing data on component mount
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    if (existing.location) {
      setSelectedLocation(existing.location)
      setSearchQuery(existing.location)
    }
  }, [])

  // Get comprehensive world cities from data file
  const worldCities = getCitiesFormatted()

  const filteredLocations = worldCities.filter(location =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8) // Mostrar máximo 8 resultados

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location)
    setSearchQuery(location)
    setShowSuggestions(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
    if (value === selectedLocation) return
    setSelectedLocation('')
  }

  const handleNext = () => {
    if (selectedLocation) {
      const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
      localStorage.setItem('creatorOnboarding', JSON.stringify({
        ...existing,
        location: selectedLocation,
        step: 4
      }))
      router.push('/onboarding/creator/testimonial')
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
          {[1,2,3,4].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1 shadow-sm"></div>
          ))}
          {[5,6,7,8].map(i => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 4 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          ¿De dónde eres?
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Busca tu ciudad
        </p>

        {/* Location Search */}
        <div className="relative mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              placeholder="Busca tu ciudad (ej: Santiago, Miami, Madrid...)"
              className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 shadow-sm"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Location Suggestions */}
          {showSuggestions && filteredLocations.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl mt-2 shadow-lg z-10 max-h-60 overflow-y-auto">
              {filteredLocations.map((location, index) => (
                <button
                  key={index}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full p-4 text-left hover:bg-gray-50 flex items-center space-x-3 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{location}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 flex items-center space-x-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-slate-700 font-medium">{selectedLocation}</span>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={handleNext}
          disabled={!selectedLocation}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            selectedLocation
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