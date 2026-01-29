'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getGigById, applyToGig, formatTimeAgo, formatDeadline, type DBGig } from '../../../lib/database'
import { useAuth } from '../../../lib/contexts/AuthContext'


export default function GigDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [gig, setGig] = useState<DBGig | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [application, setApplication] = useState('')
  const [error, setError] = useState('')
  const gigId = params.id as string

  useEffect(() => {
    async function loadGig() {
      try {
        const gigData = await getGigById(gigId)
        setGig(gigData)
      } catch (error) {
        console.error('Error loading gig:', error)
        setError('Failed to load gig')
      } finally {
        setLoading(false)
      }
    }

    if (gigId) {
      loadGig()
    }
  }, [gigId])

  const handleApply = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    setIsApplying(true)
    setError('')

    try {
      await applyToGig(gigId, application)
      setHasApplied(true)
    } catch (error: any) {
      setError(error.message || 'Failed to submit application')
    } finally {
      setIsApplying(false)
    }
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


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading gig...</div>
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷‍♀️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Gig not found</h1>
          <button
            onClick={() => router.push('/gigs')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to gigs
          </button>
        </div>
      </div>
    )
  }

  if (hasApplied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Your application for <strong>{gig.title}</strong> has been sent to {getCompanyName(gig)}.
            They'll review it and get back to you soon.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/gigs')}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse More Jobs
            </button>
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/gigs')}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Gig Details</h1>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {profile?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Card */}
      <div className="px-0">
        <div className="bg-white">
          {/* Compact Header Image */}
          <div className="h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 relative overflow-hidden">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
              <div className="text-center text-white">
                <div className="text-5xl mb-3">
                  {getCategoryEmoji(gig.category)}
                </div>
                <div className="text-lg font-bold">
                  {gig.category}
                </div>
              </div>
            </div>

            {/* Company Logo/Avatar */}
            <div className="absolute top-4 left-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                <span className="text-gray-800 font-bold text-sm">
                  {getCompanyName(gig).charAt(0)}
                </span>
              </div>
            </div>

            {/* Payment Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-black/70 text-white px-3 py-1 rounded-full">
                <span className="text-sm font-bold">{gig.budget}</span>
              </div>
            </div>
          </div>

          {/* Job Header Info */}
          <div className="bg-white px-6 py-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{gig.title}</h1>
            <p className="text-gray-600 mb-3">{getCompanyName(gig)}</p>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(gig.category)}`}>
              {gig.category}
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white px-6 py-6">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">
                {gig.description}
              </p>
            </div>

            {/* Job Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Budget</div>
                <div className="text-lg font-bold text-gray-900">{gig.budget}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-sm text-gray-500 mb-1">Deadline</div>
                <div className="text-lg font-bold text-gray-900">
                  {gig.deadline ? formatDeadline(gig.deadline) : 'No deadline'}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>📅 Posted {formatTimeAgo(gig.created_at)}</div>
                <div>🏢 {getCompanyName(gig)}</div>
              </div>
            </div>

            {/* Requirements Section */}
            {gig.requirements && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{gig.requirements}</p>
              </div>
            )}

            {/* Deliverables Section */}
            {gig.deliverables && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Deliverables</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{gig.deliverables}</p>
              </div>
            )}
          </div>
        </div>

        {/* Apply Section */}
        <div className="bg-white px-6 py-6 border-t border-gray-100">
          {!user ? (
            <div className="text-center py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to apply?</h3>
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Sign In to Apply
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Apply for this gig</h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <textarea
                value={application}
                onChange={(e) => setApplication(e.target.value)}
                placeholder="Tell the company why you're perfect for this collaboration. Mention your experience, audience demographics, and creative ideas..."
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={6}
              />
              <button
                onClick={handleApply}
                disabled={isApplying || !application.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom spacer for mobile */}
        <div className="h-20"></div>
      </div>
    </div>
  )
}