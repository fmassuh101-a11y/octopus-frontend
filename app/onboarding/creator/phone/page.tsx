'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorPhonePage() {
  const router = useRouter()
  const [countryCode, setCountryCode] = useState('+56') // Chile por defecto
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showCountrySearch, setShowCountrySearch] = useState(false)
  const [countrySearchQuery, setCountrySearchQuery] = useState('')

  // Load existing data on component mount
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    if (existing.countryCode) setCountryCode(existing.countryCode)
    if (existing.phoneNumber) setPhoneNumber(existing.phoneNumber)
  }, [])

  // Close country search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCountrySearch) {
        setShowCountrySearch(false)
      }
    }

    if (showCountrySearch) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showCountrySearch])

  const handleNext = () => {
    if (phoneNumber.trim()) {
      // Obtener datos anteriores
      const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
      localStorage.setItem('creatorOnboarding', JSON.stringify({
        ...existing,
        countryCode,
        phoneNumber: phoneNumber.trim(),
        step: 2
      }))
      router.push('/onboarding/creator/level')
    }
  }

  const countries = [
    // Américas
    { code: '+1', name: 'Estados Unidos', flag: '🇺🇸', minLength: 10, maxLength: 10, format: '(XXX) XXX-XXXX', searchKeys: ['us', 'usa', 'united', 'states', 'estados unidos'] },
    { code: '+1', name: 'Canadá', flag: '🇨🇦', minLength: 10, maxLength: 10, format: '(XXX) XXX-XXXX', searchKeys: ['ca', 'canada', 'canadá'] },
    { code: '+52', name: 'México', flag: '🇲🇽', minLength: 10, maxLength: 10, format: 'XX XXXX XXXX', searchKeys: ['mx', 'mexico', 'méxico'] },
    { code: '+54', name: 'Argentina', flag: '🇦🇷', minLength: 8, maxLength: 11, format: 'XX XXXX XXXX', searchKeys: ['ar', 'argentina'] },
    { code: '+55', name: 'Brasil', flag: '🇧🇷', minLength: 10, maxLength: 11, format: '(XX) XXXXX-XXXX', searchKeys: ['br', 'brazil', 'brasil'] },
    { code: '+56', name: 'Chile', flag: '🇨🇱', minLength: 8, maxLength: 9, format: 'X XXXX XXXX', searchKeys: ['cl', 'chile'] },
    { code: '+57', name: 'Colombia', flag: '🇨🇴', minLength: 10, maxLength: 10, format: 'XXX XXX XXXX', searchKeys: ['co', 'colombia'] },
    { code: '+51', name: 'Perú', flag: '🇵🇪', minLength: 9, maxLength: 9, format: 'XXX XXX XXX', searchKeys: ['pe', 'peru', 'perú'] },
    { code: '+58', name: 'Venezuela', flag: '🇻🇪', minLength: 10, maxLength: 10, format: 'XXX XXX XXXX', searchKeys: ['ve', 'venezuela'] },
    { code: '+506', name: 'Costa Rica', flag: '🇨🇷', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['cr', 'costa', 'rica'] },
    { code: '+503', name: 'El Salvador', flag: '🇸🇻', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['sv', 'salvador'] },
    { code: '+504', name: 'Honduras', flag: '🇭🇳', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['hn', 'honduras'] },
    { code: '+502', name: 'Guatemala', flag: '🇬🇹', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['gt', 'guatemala'] },
    { code: '+505', name: 'Nicaragua', flag: '🇳🇮', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['ni', 'nicaragua'] },
    { code: '+507', name: 'Panamá', flag: '🇵🇦', minLength: 7, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['pa', 'panama', 'panamá'] },
    { code: '+593', name: 'Ecuador', flag: '🇪🇨', minLength: 8, maxLength: 9, format: 'XX XXX XXXX', searchKeys: ['ec', 'ecuador'] },
    { code: '+591', name: 'Bolivia', flag: '🇧🇴', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['bo', 'bolivia'] },
    { code: '+595', name: 'Paraguay', flag: '🇵🇾', minLength: 8, maxLength: 9, format: 'XXX XXX XXX', searchKeys: ['py', 'paraguay'] },
    { code: '+598', name: 'Uruguay', flag: '🇺🇾', minLength: 8, maxLength: 9, format: 'XX XXX XXXX', searchKeys: ['uy', 'uruguay'] },
    { code: '+53', name: 'Cuba', flag: '🇨🇺', minLength: 8, maxLength: 8, format: 'XXXX XXXX', searchKeys: ['cu', 'cuba'] },
    // Europa
    { code: '+34', name: 'España', flag: '🇪🇸', minLength: 9, maxLength: 9, format: 'XXX XXX XXX', searchKeys: ['es', 'spain', 'españa'] },
    { code: '+33', name: 'Francia', flag: '🇫🇷', minLength: 9, maxLength: 10, format: 'XX XX XX XX XX', searchKeys: ['fr', 'france', 'francia'] },
    { code: '+49', name: 'Alemania', flag: '🇩🇪', minLength: 10, maxLength: 12, format: 'XXX XXXXXXXX', searchKeys: ['de', 'germany', 'deutschland', 'alemania'] },
    { code: '+44', name: 'Reino Unido', flag: '🇬🇧', minLength: 10, maxLength: 10, format: 'XXXX XXXXXX', searchKeys: ['uk', 'gb', 'britain', 'england', 'reino unido'] },
    { code: '+39', name: 'Italia', flag: '🇮🇹', minLength: 9, maxLength: 11, format: 'XXX XXX XXXX', searchKeys: ['it', 'italy', 'italia'] },
    // Asia
    { code: '+81', name: 'Japón', flag: '🇯🇵', minLength: 10, maxLength: 11, format: 'XXX XXXX XXXX', searchKeys: ['jp', 'japan', 'japón'] },
    { code: '+82', name: 'Corea del Sur', flag: '🇰🇷', minLength: 9, maxLength: 10, format: 'XXX XXXX XXXX', searchKeys: ['kr', 'korea', 'corea'] },
    { code: '+86', name: 'China', flag: '🇨🇳', minLength: 11, maxLength: 11, format: 'XXX XXXX XXXX', searchKeys: ['cn', 'china'] },
    { code: '+91', name: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10, format: 'XXXXX XXXXX', searchKeys: ['in', 'india'] },
    // Oceanía
    { code: '+61', name: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9, format: 'XXX XXX XXX', searchKeys: ['au', 'australia'] }
  ]

  const getPhoneConfig = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode)
    if (country) {
      return {
        minLength: country.minLength,
        maxLength: country.maxLength,
        format: country.format,
        // Flexible validation - allows any length between min and max
        pattern: new RegExp(`^\\d{${country.minLength},${country.maxLength}}$`)
      }
    }
    // Default to US format
    return { minLength: 10, maxLength: 10, format: '(XXX) XXX-XXXX', pattern: /^\d{10}$/ }
  }

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.code.includes(countrySearchQuery) ||
    country.searchKeys.some(key => key.includes(countrySearchQuery.toLowerCase()))
  )

  const selectedCountry = countries.find(c => c.code === countryCode) || countries[0]

  const handleCountrySelect = (country: typeof countries[0]) => {
    setCountryCode(country.code)
    setPhoneNumber('')
    setShowCountrySearch(false)
    setCountrySearchQuery('')
  }

  const config = getPhoneConfig(countryCode)
  // Flexible validation - phone is valid if it's between min and max length
  const phoneNumbers = phoneNumber.replace(/\D/g, '')
  const isValid = phoneNumbers.length >= config.minLength && phoneNumbers.length <= config.maxLength

  const formatPhoneNumber = (value: string) => {
    // Solo números
    const numbers = value.replace(/\D/g, '')

    // Validación especial para Chile - debe empezar con 9
    if (countryCode === '+56') {
      if (numbers.length > 0 && numbers[0] !== '9') {
        return // No permitir números que no empiecen con 9 para Chile
      }
    }

    // Limitar según el máximo del país
    const limited = numbers.slice(0, config.maxLength)
    setPhoneNumber(limited)
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
          {[1,2].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1 shadow-sm"></div>
          ))}
          {[3,4,5,6,7,8].map(i => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 2 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          ¿Cuál es tu número?
        </h1>

        {/* Phone Input */}
        <div className="mb-8 relative">
          <div className="flex border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Country Selector */}
            <button
              onClick={() => setShowCountrySearch(!showCountrySearch)}
              className="px-4 py-4 border-r border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors flex items-center space-x-2 min-w-[120px]"
            >
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="font-medium text-gray-700">{selectedCountry.code}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => formatPhoneNumber(e.target.value)}
              placeholder={config.format.replace(/X/g, '0')}
              className="flex-1 px-4 py-4 text-lg focus:outline-none bg-white"
            />
          </div>

          {/* Country Search Dropdown */}
          {showCountrySearch && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl mt-2 shadow-xl z-20 max-h-80 overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b border-gray-100">
                <input
                  type="text"
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  placeholder="Buscar país o código (ej: CL, Chile, +56)..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Countries List */}
              <div className="max-h-60 overflow-y-auto">
                {filteredCountries.map((country, index) => (
                  <button
                    key={`${country.code}-${country.name}-${index}`}
                    onClick={() => handleCountrySelect(country)}
                    className="w-full p-4 text-left hover:bg-blue-50 flex items-center space-x-3 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    <span className="text-lg">{country.flag}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{country.name}</div>
                      <div className="text-sm text-gray-500">{country.code}</div>
                    </div>
                    {country.code === countryCode && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}

                {filteredCountries.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron países
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="text-center text-sm text-gray-500 px-4">
          Al ingresar tu número, aceptas nuestros{' '}
          <a href="/terms" target="_blank" className="text-blue-500 underline hover:text-blue-600">términos de servicio</a>{' '}
          y{' '}
          <a href="/privacy" target="_blank" className="text-blue-500 underline hover:text-blue-600">política de privacidad</a>.{' '}
          ¡Gracias!
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