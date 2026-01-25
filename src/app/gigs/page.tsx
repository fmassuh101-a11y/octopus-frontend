'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveGigs, formatTimeAgo, formatDeadline, type DBGig } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'

export default function GigsPage() {
  const [filter, setFilter] = useState<'for-you' | 'ugc' | 'clipping' | 'partnerships' | 'highest-paying' | 'trending'>('for-you')
  const [allGigs, setAllGigs] = useState<DBGig[]>([])
  const [gigsLoading, setGigsLoading] = useState(true)
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function loadGigs() {
      try {
        const gigsData = await getActiveGigs()
        setAllGigs(gigsData)
      } catch (error) {
        console.error('Error loading gigs:', error)
      } finally {
        setGigsLoading(false)
      }
    }
    loadGigs()
  }, [])

  const loading = authLoading || gigsLoading

  // Filtrar gigs basado en la categoría seleccionada
  const getFilteredGigs = () => {
    switch (filter) {
      case 'ugc':
        return allGigs.filter(gig => gig.category.toLowerCase().includes('ugc'))
      case 'clipping':
        return allGigs.filter(gig => gig.category.toLowerCase().includes('clipping') || gig.category.toLowerCase().includes('editing'))
      case 'partnerships':
        return allGigs.filter(gig => gig.category.toLowerCase().includes('partnership') || gig.category.toLowerCase().includes('brand'))
      case 'highest-paying':
        return allGigs.sort((a, b) => {
          const paymentA = parseInt(a.budget.replace(/[^0-9]/g, '')) || 0
          const paymentB = parseInt(b.budget.replace(/[^0-9]/g, '')) || 0
          return paymentB - paymentA
        })
      case 'trending':
        return allGigs.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
      case 'for-you':
      default:
        return allGigs
    }
  }

  const gigs = getFilteredGigs()

  const formatPayment = (gig: DBGig) => {
    return gig.budget
  }

  const getCompanyName = (gig: DBGig) => {
    return gig.profiles?.company_name || gig.profiles?.full_name || 'Anonymous Company'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'UGC': 'bg-purple-100 text-purple-800',
      'Clipping': 'bg-cyan-100 text-cyan-800',
      'Brand Partnership': 'bg-emerald-100 text-emerald-800',
      'Social Management': 'bg-violet-100 text-violet-800',
      'Live Streaming': 'bg-orange-100 text-orange-800',
      'Design': 'bg-pink-100 text-pink-800',
      'Writing': 'bg-indigo-100 text-indigo-800',
      'Consulting': 'bg-yellow-100 text-yellow-800',
      'default': 'bg-blue-100 text-blue-800'
    }
    return colors[category as keyof typeof colors] || colors.default
  }

  const getCategoryEmoji = (category: string) => {
    const emojis = {
      'UGC': '🎬',
      'Clipping': '✂️',
      'Brand Partnership': '🤝',
      'Social Management': '📱',
      'Live Streaming': '📺',
      'Design': '📸',
      'Writing': '✍️',
      'Consulting': '💡',
      'default': '🎯'
    }
    return emojis[category as keyof typeof emojis] || emojis.default
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - SideShift Clean Style */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">🐙</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 bg-clip-text text-transparent">Octopus</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Tabs - Enhanced Categories */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {[
              { key: 'for-you', label: 'For You', count: allGigs.length },
              { key: 'ugc', label: 'UGC', count: allGigs.filter(g => g.category.toLowerCase().includes('ugc')).length },
              { key: 'clipping', label: 'Clipping', count: allGigs.filter(g => g.category.toLowerCase().includes('clipping') || g.category.toLowerCase().includes('editing')).length },
              { key: 'partnerships', label: 'Partnerships', count: allGigs.filter(g => g.category.toLowerCase().includes('partnership') || g.category.toLowerCase().includes('brand')).length },
              { key: 'highest-paying', label: 'Top Paying', count: allGigs.length },
              { key: 'trending', label: 'New', count: allGigs.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    filter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-gray-500">
            {gigs.length > 0 ? (
              <span>
                {gigs.length} {gigs.length === 1 ? 'opportunity' : 'opportunities'}
                {filter !== 'for-you' && ` in ${
                  filter === 'ugc' ? 'UGC' :
                  filter === 'clipping' ? 'Clipping' :
                  filter === 'partnerships' ? 'Partnerships' :
                  filter === 'highest-paying' ? 'Top Paying' :
                  filter === 'trending' ? 'New' : filter
                }`}
              </span>
            ) : (
              <span>No opportunities found</span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading gigs...</div>
        </div>
      ) : (
        /* Job Feed - SideShift Visual Style */
        <div className="px-0 py-0 space-y-0">
        {gigs.map((gig) => (
          <div
            key={gig.id}
            className="bg-white border-b border-gray-100"
          >
            {/* Job Card with Image */}
            <div className="relative">
              {/* Compact Header Image */}
              <div className="h-40 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 relative overflow-hidden rounded-t-xl">
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2">
                      {getCategoryEmoji(gig.category)}
                    </div>
                    <div className="text-sm font-medium">
                      {gig.category}
                    </div>
                  </div>
                </div>

                {/* Company Logo/Avatar */}
                <div className="absolute top-3 left-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-gray-800 font-bold text-sm">
                      {getCompanyName(gig).charAt(0)}
                    </span>
                  </div>
                </div>

                {/* Payment Badge */}
                <div className="absolute top-3 right-3">
                  <div className="bg-black/70 text-white px-2 py-1 rounded-full">
                    <span className="text-xs font-bold">{formatPayment(gig)}</span>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{gig.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{getCompanyName(gig)}</p>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {gig.description}
                  </p>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Apply Now clicked for:', gig.title)
                    try {
                      router.push(`/gigs/${gig.id}`)
                    } catch (error) {
                      console.error('Navigation error:', error)
                      window.location.href = `/gigs/${gig.id}`
                    }
                  }}
                  className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                >
                  Apply Now
                </button>
              </div>
            </div>

            {/* Interaction Bar */}
            <div className="px-6 py-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-red-500">
                    <span className="text-xl">♡</span>
                    <span className="text-sm">Like</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-500">
                    <span className="text-xl">💬</span>
                    <span className="text-sm">Comment</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-green-500">
                    <span className="text-xl">↗</span>
                    <span className="text-sm">Share</span>
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(gig.created_at)} • {formatDeadline(gig.deadline)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {gigs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">
              {filter === 'ugc' ? '🎬' :
               filter === 'clipping' ? '✂️' :
               filter === 'partnerships' ? '🤝' : '💼'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'ugc' ? 'No UGC jobs available' :
               filter === 'clipping' ? 'No clipping jobs available' :
               filter === 'partnerships' ? 'No partnership opportunities' :
               'No creator jobs available'}
            </h3>
            <p className="text-gray-600">
              {filter === 'for-you'
                ? 'New paid campaigns are added daily. Check back soon!'
                : `Try switching to "For You" to see all available opportunities, or check back soon for new ${filter} gigs!`
              }
            </p>
          </div>
        )}
        </div>
      )}

      {/* Bottom Navigation - SideShift Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="flex justify-around py-3">
          <button
            type="button"
            onClick={() => {
              console.log('Jobs nav button clicked')
              try {
                router.push('/gigs')
              } catch (error) {
                console.error('Navigation error:', error)
                window.location.href = '/gigs'
              }
            }}
            className="flex flex-col items-center space-y-1 text-blue-600"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Jobs</span>
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('Analytics nav button clicked')
              const dashboardPath = profile?.role === 'creator' ? '/creator/dashboard' : '/company/dashboard'
              try {
                router.push(dashboardPath)
              } catch (error) {
                console.error('Navigation error:', error)
                window.location.href = dashboardPath
              }
            }}
            className="flex flex-col items-center space-y-1 text-gray-400"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('Earnings nav button clicked')
              try {
                router.push('/creator/earnings')
              } catch (error) {
                console.error('Navigation error:', error)
                window.location.href = '/creator/earnings'
              }
            }}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-green-500 transition-colors"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Earnings</span>
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('Profile nav button clicked')
              try {
                router.push('/creator/profile')
              } catch (error) {
                console.error('Navigation error:', error)
                window.location.href = '/creator/profile'
              }
            }}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-purple-500 transition-colors"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>
    </div>
  )
}