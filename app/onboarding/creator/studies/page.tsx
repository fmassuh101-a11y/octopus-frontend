'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorStudiesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudy, setSelectedStudy] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load existing data on component mount
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('creatorOnboarding') || '{}')
    if (existing.studies) {
      setSelectedStudy(existing.studies)
      setSearchQuery(existing.studies)
    }
  }, [])

  const careers = [
    // NO ESTUDIO / OTRAS SITUACIONES
    'No estudio actualmente',
    'Egresado / Graduado',
    'Trabajando',
    'Buscando oportunidades',

    // NEGOCIOS Y ADMINISTRACIÓN
    'Administración de Empresas',
    'Contaduría Pública',
    'Contabilidad',
    'Economía',
    'Finanzas',
    'Banca y Seguros',
    'Comercio Internacional',
    'Comercio Exterior',
    'Recursos Humanos',
    'Gestión Empresarial',
    'Gestión de Negocios',
    'Emprendimiento',
    'Logística y Cadena de Suministro',
    'Administración Pública',
    'Gestión de Proyectos',
    'Negocios Digitales',
    'E-Commerce',
    'Consultoría Empresarial',
    'Auditoría',

    // MARKETING Y COMUNICACIÓN
    'Marketing',
    'Marketing Digital',
    'Marketing y Publicidad',
    'Publicidad',
    'Comunicación Social',
    'Periodismo',
    'Relaciones Públicas',
    'Comunicación Digital',
    'Comunicación Corporativa',
    'Producción Audiovisual',
    'Community Management',
    'Redes Sociales',
    'Content Creation',
    'Creación de Contenido',
    'Branding',
    'Copywriting',
    'SEO y SEM',
    'Growth Marketing',

    // TECNOLOGÍA
    'Ingeniería de Sistemas',
    'Ingeniería de Software',
    'Ingeniería Informática',
    'Ciencias de la Computación',
    'Desarrollo Web',
    'Desarrollo Frontend',
    'Desarrollo Backend',
    'Desarrollo Full Stack',
    'Desarrollo de Apps',
    'Desarrollo Móvil',
    'Ciencia de Datos',
    'Data Science',
    'Data Analytics',
    'Big Data',
    'Inteligencia Artificial',
    'Machine Learning',
    'Deep Learning',
    'Ciberseguridad',
    'Seguridad Informática',
    'Redes y Telecomunicaciones',
    'Cloud Computing',
    'DevOps',
    'UX Design',
    'UI Design',
    'UX/UI Design',
    'Product Design',
    'Diseño de Producto Digital',
    'QA Testing',
    'Game Development',
    'Desarrollo de Videojuegos',
    'Blockchain',
    'Web3',
    'Robotica',
    'IoT',
    'Realidad Virtual',
    'Realidad Aumentada',

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
    'Ingeniería de Sonido',
    'Ingeniería de Audio',
    'Ingeniería Naval',
    'Ingeniería Aeronáutica',
    'Ingeniería Aeroespacial',
    'Ingeniería Petrolera',
    'Ingeniería de Minas',
    'Ingeniería Agrónoma',
    'Ingeniería de Alimentos',
    'Ingeniería Textil',
    'Ingeniería Geológica',

    // DISEÑO Y ARTES
    'Diseño Gráfico',
    'Diseño Industrial',
    'Diseño de Modas',
    'Diseño de Interiores',
    'Diseño Publicitario',
    'Diseño Editorial',
    'Diseño Web',
    'Diseño de Videojuegos',
    'Artes Visuales',
    'Artes Plásticas',
    'Bellas Artes',
    'Fotografía',
    'Fotografía Profesional',
    'Fotografía de Moda',
    'Animación',
    'Animación 3D',
    'Animación 2D',
    'VFX',
    'Efectos Especiales',
    'Motion Graphics',
    'Música',
    'Producción Musical',
    'Composición Musical',
    'Canto',
    'Instrumentación',
    'Teatro',
    'Actuación',
    'Artes Escénicas',
    'Danza',
    'Ballet',
    'Danza Contemporánea',
    'Cine',
    'Cine y Televisión',
    'Dirección de Cine',
    'Guión',
    'Producción de TV',
    'Edición de Video',
    'Post-Producción',
    'Ilustración',
    'Comic y Manga',
    'Concept Art',
    'Character Design',

    // CIENCIAS DE LA SALUD
    'Medicina',
    'Medicina General',
    'Cirugía',
    'Enfermería',
    'Odontología',
    'Psicología',
    'Psicología Clínica',
    'Psiquiatría',
    'Fisioterapia',
    'Terapia Física',
    'Nutrición',
    'Dietética',
    'Farmacia',
    'Veterinaria',
    'Medicina Veterinaria',
    'Terapia Ocupacional',
    'Fonoaudiología',
    'Kinesiología',
    'Optometría',
    'Radiología',
    'Biomedicina',
    'Biotecnología',
    'Laboratorio Clínico',
    'Salud Pública',
    'Epidemiología',
    'Medicina Deportiva',
    'Dermatología',
    'Cardiología',
    'Neurología',
    'Pediatría',
    'Geriatría',
    'Obstetricia',
    'Ginecología',

    // CIENCIAS SOCIALES
    'Derecho',
    'Abogacía',
    'Ciencias Políticas',
    'Relaciones Internacionales',
    'Diplomacia',
    'Sociología',
    'Trabajo Social',
    'Antropología',
    'Historia',
    'Filosofía',
    'Criminología',
    'Criminalística',
    'Geografía',
    'Arqueología',
    'Bibliotecología',
    'Ciencias de la Información',

    // EDUCACIÓN
    'Educación',
    'Pedagogía',
    'Educación Inicial',
    'Educación Primaria',
    'Educación Secundaria',
    'Educación Especial',
    'Educación Física',
    'Psicopedagogía',
    'Idiomas',
    'Traducción',
    'Interpretación',
    'Inglés',
    'Francés',
    'Alemán',
    'Portugués',
    'Italiano',
    'Chino Mandarín',
    'Japonés',
    'Coreano',
    'Árabe',
    'Enseñanza de Idiomas',
    'Literatura',
    'Lingüística',
    'Letras',

    // CIENCIAS EXACTAS
    'Biología',
    'Biología Marina',
    'Microbiología',
    'Genética',
    'Química',
    'Bioquímica',
    'Física',
    'Física Teórica',
    'Matemáticas',
    'Matemáticas Aplicadas',
    'Estadística',
    'Actuaría',
    'Geología',
    'Geofísica',
    'Astronomía',
    'Astrofísica',
    'Oceanografía',
    'Meteorología',
    'Ciencias Ambientales',
    'Ecología',

    // TURISMO Y GASTRONOMÍA
    'Turismo',
    'Turismo y Hotelería',
    'Administración Hotelera',
    'Gestión Turística',
    'Gastronomía',
    'Cocina',
    'Chef',
    'Pastelería',
    'Panadería',
    'Bartender',
    'Mixología',
    'Gestión de Eventos',
    'Organización de Eventos',
    'Sommelier',
    'Enología',
    'Catering',

    // ARQUITECTURA Y URBANISMO
    'Arquitectura',
    'Urbanismo',
    'Planeación Urbana',
    'Paisajismo',
    'Diseño de Espacios',
    'Restauración de Patrimonio',
    'Construcción',

    // MODA Y BELLEZA
    'Moda',
    'Diseño de Moda',
    'Styling',
    'Maquillaje',
    'Maquillaje Profesional',
    'Cosmetología',
    'Estética',
    'Barbería',
    'Peluquería',
    'Estilismo',
    'Personal Shopper',
    'Image Consulting',

    // FITNESS Y BIENESTAR
    'Educación Física',
    'Ciencias del Deporte',
    'Entrenamiento Personal',
    'Fitness',
    'CrossFit',
    'Yoga',
    'Pilates',
    'Nutrición Deportiva',
    'Fisioterapia Deportiva',
    'Preparación Física',
    'Coaching Deportivo',

    // NEGOCIOS CREATIVOS
    'Influencer Marketing',
    'Personal Branding',
    'Emprendimiento Digital',
    'Startups',
    'Venture Capital',
    'Business Development',
    'Sales',
    'Ventas',
    'Negociación',
    'Customer Success',
    'Atención al Cliente',

    // OTROS
    'Deportes y Entrenamiento',
    'Coaching',
    'Life Coaching',
    'Coaching Ejecutivo',
    'Aviación',
    'Piloto Comercial',
    'Tripulante de Cabina',
    'Ciencias Agrícolas',
    'Agronomía',
    'Zootecnia',
    'Teología',
    'Ciencias Religiosas',
    'Seguridad y Defensa',
    'Ciencias Militares',
    'Criminalística',
    'Investigación Privada',
    'Autodidacta',
    'En Formación',
    'Estudiante de Secundaria',
    'Técnico',
    'Tecnólogo',
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
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex-1 shadow-sm"></div>
          ))}
          {[7,8].map(i => (
            <div key={i} className="h-1.5 bg-neutral-800 rounded-full flex-1"></div>
          ))}
        </div>
        <p className="text-center text-sm text-neutral-500 mt-2">Paso 6 de 8</p>
      </div>

      <div className="px-6">
        {/* Question */}
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          ¿Qué estás estudiando?
        </h1>
        <p className="text-neutral-500 text-center mb-8">
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
              className="w-full p-4 border border-neutral-800 rounded-2xl text-lg focus:outline-none bg-neutral-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Career Suggestions */}
          {showSuggestions && filteredCareers.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-2xl mt-2 shadow-lg z-10 max-h-60 overflow-y-auto text-white placeholder-neutral-500">
              {filteredCareers.slice(0, 10).map((career, index) => (
                <button
                  key={index}
                  onClick={() => handleCareerSelect(career)}
                  className="w-full p-4 text-left hover:bg-neutral-950 flex items-center space-x-3 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18.999 7.5 19s3.332-.522 4.5-1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18.999 16.5 19c-1.746 0-3.332-.522-4.5-1.247" />
                  </svg>
                  <span className="text-neutral-200">{career}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Study Display */}
        {selectedStudy && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-8 flex items-center space-x-3 text-white placeholder-neutral-500">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18.999 7.5 19s3.332-.522 4.5-1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18.999 16.5 19c-1.746 0-3.332-.522-4.5-1.247" />
            </svg>
            <span className="text-neutral-200 font-medium">{selectedStudy}</span>
          </div>
        )}

        {/* Quick Selection Grid */}
        {!showSuggestions && !selectedStudy && (
          <div>
            <p className="text-sm text-neutral-500 mb-4">Carreras populares:</p>
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
                  className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-200 hover:bg-neutral-950 text-center shadow-sm hover:shadow-md transition-all"
                >
                  {career}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800">
        <button
          onClick={handleNext}
          disabled={!selectedStudy}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
            selectedStudy
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-600 hover:shadow-2xl hover:scale-[1.02]'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          } placeholder-neutral-500`}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}