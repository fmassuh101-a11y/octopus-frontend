'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function CompanyAnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [analyzedCreator, setAnalyzedCreator] = useState<any>(null)
  const [searchError, setSearchError] = useState('')

  // Demo creator data - will be replaced with real API
  const demoCreator = {
    username: 'maria_creates',
    fullName: 'Maria Garcia',
    profilePic: null,
    followers: 125000,
    following: 892,
    totalVideos: 342,
    totalLikes: 2400000,
    avgViews: 45000,
    avgLikes: 3200,
    avgComments: 420,
    engagementRate: 7.1,
    audienceQualityScore: 87,
    fakeFollowersPercent: 4.2,
    realFollowersPercent: 95.8,
    topCountries: [
      { country: 'Mexico', percent: 35 },
      { country: 'Argentina', percent: 22 },
      { country: 'Colombia', percent: 18 },
      { country: 'Chile', percent: 12 },
      { country: 'Otros', percent: 13 },
    ],
    ageDistribution: [
      { range: '13-17', percent: 8 },
      { range: '18-24', percent: 42 },
      { range: '25-34', percent: 32 },
      { range: '35-44', percent: 12 },
      { range: '45+', percent: 6 },
    ],
    genderDistribution: { female: 72, male: 26, other: 2 },
    growthTrend: 'up', // up, down, stable
    monthlyGrowth: 8.5,
    contentCategories: ['Belleza', 'Lifestyle', 'Fashion'],
    recentVideos: [
      { views: 82000, likes: 5400, comments: 620, date: '2024-01-25' },
      { views: 45000, likes: 3100, comments: 380, date: '2024-01-22' },
      { views: 38000, likes: 2800, comments: 290, date: '2024-01-20' },
    ]
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Ingresa un nombre de usuario')
      return
    }

    setLoading(true)
    setSearchError('')
    setAnalyzedCreator(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    // For demo, show demo creator
    setAnalyzedCreator(demoCreator)
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bueno'
    return 'Bajo'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/company/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analizar Creadores</h1>
              <p className="text-sm text-gray-500">Verifica la autenticidad de creadores antes de contratarlos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Buscar Creador</h2>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                placeholder="nombre_de_usuario"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Analizando...
                </span>
              ) : (
                'Analizar'
              )}
            </button>
          </div>
          {searchError && <p className="text-red-500 text-sm mt-2">{searchError}</p>}
          <p className="text-xs text-gray-400 mt-3">Ingresa el nombre de usuario de TikTok del creador que quieres analizar</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analizando perfil...</h3>
            <p className="text-gray-500">Esto puede tomar unos segundos</p>
          </div>
        )}

        {/* Results */}
        {analyzedCreator && !loading && (
          <div className="space-y-6">
            {/* Creator Overview */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {analyzedCreator.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{analyzedCreator.fullName}</h2>
                    <p className="text-gray-500">@{analyzedCreator.username}</p>
                    <div className="flex gap-2 mt-2">
                      {analyzedCreator.contentCategories.map((cat: string) => (
                        <span key={cat} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{cat}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AQS Score */}
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${getScoreColor(analyzedCreator.audienceQualityScore)}`}>
                    <span className="text-2xl font-bold">{analyzedCreator.audienceQualityScore}</span>
                    <span className="text-xs">AQS</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{getScoreLabel(analyzedCreator.audienceQualityScore)}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{(analyzedCreator.followers / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-gray-500">Seguidores</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{analyzedCreator.engagementRate}%</p>
                  <p className="text-sm text-gray-500">Engagement</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{(analyzedCreator.avgViews / 1000).toFixed(1)}K</p>
                  <p className="text-sm text-gray-500">Views Promedio</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">+{analyzedCreator.monthlyGrowth}%</p>
                  <p className="text-sm text-gray-500">Crecimiento/mes</p>
                </div>
              </div>
            </div>

            {/* Audience Quality */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Calidad de Audiencia</h3>

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Seguidores Reales</span>
                    <span className="font-bold text-green-600">{analyzedCreator.realFollowersPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: `${analyzedCreator.realFollowersPercent}%` }}></div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Seguidores Falsos/Bots</span>
                    <span className="font-bold text-red-600">{analyzedCreator.fakeFollowersPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-red-500 h-3 rounded-full" style={{ width: `${analyzedCreator.fakeFollowersPercent}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-green-800">Audiencia de Alta Calidad</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Este creador tiene una audiencia autentica y comprometida.</p>
                </div>
              </div>

              {/* Demographics */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Demografia de Audiencia</h3>

                {/* Gender */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Genero</p>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div className="bg-pink-500" style={{ width: `${analyzedCreator.genderDistribution.female}%` }}></div>
                    <div className="bg-blue-500" style={{ width: `${analyzedCreator.genderDistribution.male}%` }}></div>
                    <div className="bg-purple-500" style={{ width: `${analyzedCreator.genderDistribution.other}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-pink-600">Mujeres {analyzedCreator.genderDistribution.female}%</span>
                    <span className="text-blue-600">Hombres {analyzedCreator.genderDistribution.male}%</span>
                  </div>
                </div>

                {/* Age */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Edad</p>
                  <div className="space-y-2">
                    {analyzedCreator.ageDistribution.map((age: any) => (
                      <div key={age.range} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-12">{age.range}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${age.percent}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600 w-8">{age.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Countries */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Paises</p>
                  <div className="space-y-2">
                    {analyzedCreator.topCountries.map((c: any) => (
                      <div key={c.country} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{c.country}</span>
                        <span className="text-sm font-medium text-gray-900">{c.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">
                Invitar a Colaborar
              </button>
              <button className="px-6 py-4 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition">
                Guardar
              </button>
              <button className="px-6 py-4 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition">
                Comparar
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!analyzedCreator && !loading && (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Busca un creador para analizar</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Ingresa el nombre de usuario de TikTok de cualquier creador para ver sus estadisticas, calidad de audiencia y detectar seguidores falsos.
            </p>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">Datos de demostracion</p>
              <p className="text-xs text-blue-600 mt-1">Los analytics mostrados son de prueba. La integracion con APIs de TikTok esta en desarrollo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
