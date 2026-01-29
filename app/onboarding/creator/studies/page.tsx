'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorStudiesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudy, setSelectedStudy] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const careers = [
    // NEGOCIOS Y ADMINISTRACIÓN
    'Administración de Empresas',
    'Contaduría Pública',
    'Economía',
    'Finanzas',
    'Comercio Internacional',
    'Recursos Humanos',
    'Gestión Empresarial',
    'Emprendimiento',
    'Logística y Cadena de Suministro',

    // MARKETING Y COMUNICACIÓN
    'Marketing y Publicidad',
    'Comunicación Social',
    'Periodismo',
    'Relaciones Públicas',
    'Comunicación Digital',
    'Producción Audiovisual',
    'Community Management',

    // TECNOLOGÍA
    'Ingeniería de Sistemas',
    'Ingeniería de Software',
    'Ciencias de la Computación',
    'Desarrollo Web',
    'Desarrollo de Apps',
    'Ciencia de Datos',
    'Inteligencia Artificial',
    'Ciberseguridad',
    'Redes y Telecomunicaciones',
    'UX/UI Design',

    // INGENIERÍAS
    'Ingeniería Industrial',
    'Ingeniería Civil',
    'Ingeniería Mecánica',
    'Ingeniería Electrónica',
    'Ingeniería Eléctrica',
    'Ingeniería Química',
    'Ingeniería Ambiental',
    'Ingeniería Automotriz',
    'Ingeniería Biomédica',

    // DISEÑO Y ARTES
    'Diseño Gráfico',
    'Diseño Industrial',
    'Diseño de Modas',
    'Diseño de Interiores',
    'Artes Visuales',
    'Bellas Artes',
    'Fotografía',
    'Animación y VFX',
    'Música',
    'Teatro y Actuación',
    'Danza',
    'Cine y Televisión',

    // CIENCIAS DE LA SALUD
    'Medicina',
    'Enfermería',
    'Odontología',
    'Psicología',
    'Fisioterapia',
    'Nutrición',
    'Farmacia',
    'Veterinaria',
    'Terapia Ocupacional',
    'Fonoaudiología',
    'Kinesiología',

    // CIENCIAS SOCIALES
    'Derecho',
    'Ciencias Políticas',
    'Relaciones Internacionales',
    'Sociología',
    'Trabajo Social',
    'Antropología',
    'Historia',
    'Filosofía',

    // EDUCACIÓN
    'Educación',
    'Pedagogía',
    'Educación Inicial',
    'Educación Física',
    'Idiomas y Traducción',

    // CIENCIAS EXACTAS
    'Biología',
    'Química',
    'Física',
    'Matemáticas',
    'Estadística',
    'Geología',
    'Astronomía',

    // TURISMO Y GASTRONOMÍA
    'Turismo y Hotelería',
    'Gastronomía',
    'Gestión de Eventos',
    'Sommelier',

    // ARQUITECTURA Y URBANISMO
    'Arquitectura',
    'Urbanismo',
    'Paisajismo',

    // OTROS
    'Deportes y Entrenamiento',
    'Coaching',
    'Aviación',
    'Ciencias Agrícolas',
    'Teología',
    'Autodidacta',
    'Otro'
  ]

  const filteredCareers = careers.filter(career =>
    career.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCareerSelect = (career: string) => {
    setSelectedStudy(career)
    setSearchQuery(career)
    setShowSuggestions(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
    if (value === selectedStudy) return
    setSelectedStudy('')
  }

  const handleNext = () => {
    if (selectedStudy) {
      const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
      localStorage.setItem('creatorOnboarding', JSON.stringify({
        ...existing,
        studies: selectedStudy,
        step: 6
      }))
      router.push('/onboarding/creator/linkedin')
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
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex-1 shadow-sm"></div>
          ))}
          {[7,8].map(i => (
            <div key={i} className="h-1.5 bg-gray-200 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">Paso 6 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          ¿Qué estás estudiando?
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Selecciona tu carrera o área de estudio
        </p>

        {/* Career Search */}
        <div className="relative mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              placeholder="Busca tu carrera o campo de estudio"
              className="w-full p-4 border border-gray-200 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Career Suggestions */}
          {showSuggestions && filteredCareers.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl mt-2 shadow-lg z-10 max-h-60 overflow-y-auto">
              {filteredCareers.slice(0, 10).map((career, index) => (
                <button
                  key={index}
                  onClick={() => handleCareerSelect(career)}
                  className="w-full p-4 text-left hover:bg-gray-50 flex items-center space-x-3 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18.999 7.5 19s3.332-.522 4.5-1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18.999 16.5 19c-1.746 0-3.332-.522-4.5-1.247" />
                  </svg>
                  <span className="text-gray-700">{career}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Study Display */}
        {selectedStudy && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 flex items-center space-x-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18.999 7.5 19s3.332-.522 4.5-1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18.999 16.5 19c-1.746 0-3.332-.522-4.5-1.247" />
            </svg>
            <span className="text-slate-700 font-medium">{selectedStudy}</span>
          </div>
        )}

        {/* Quick Selection Grid */}
        {!showSuggestions && !selectedStudy && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Carreras populares:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Administración de Empresas',
                'Ingeniería de Sistemas',
                'Marketing y Publicidad',
                'Diseño Gráfico',
                'Comunicación Social',
                'Psicología'
              ].map((career) => (
                <button
                  key={career}
                  onClick={() => handleCareerSelect(career)}
                  className="p-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-700 hover:bg-gray-50 text-center shadow-sm hover:shadow-md transition-all"
                >
                  {career}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={handleNext}
          disabled={!selectedStudy}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            selectedStudy
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