'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Wallet, TrendingUp, Rocket, Gem, ArrowLeftRight, Target, Check, Clock, RefreshCw } from 'lucide-react'

export default function CreatorEarnings() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month')

  // Check authentication and redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      console.log('[Earnings] No authenticated user, redirecting to login')
      router.replace('/auth/login')
    }
  }, [loading, user, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if no user (will redirect)
  if (!user) {
    return null
  }

  const earningsData = {
    week: { total: 892, previous: 734, growth: '+21.5%', transactions: 12 },
    month: { total: 3247, previous: 2891, growth: '+12.3%', transactions: 45 },
    year: { total: 28943, previous: 19847, growth: '+45.8%', transactions: 287 }
  }

  const currentData = earningsData[timeFilter]

  const recentTransactions = [
    { id: 1, campaign: 'TikTok Fashion UGC', amount: 847, date: '2024-01-22', status: 'paid' },
    { id: 2, campaign: 'Instagram Beauty Reel', amount: 325, date: '2024-01-21', status: 'paid' },
    { id: 3, campaign: 'YouTube Tech Review', amount: 1200, date: '2024-01-20', status: 'pending' },
    { id: 4, campaign: 'Brand Ambassador - Fashion', amount: 2500, date: '2024-01-19', status: 'processing' },
    { id: 5, campaign: 'Podcast Clipping Project', amount: 150, date: '2024-01-18', status: 'paid' }
  ]

  const upcomingPayouts = [
    { campaign: 'Beauty Campaign Q1', amount: 3500, date: '2024-02-01', type: 'milestone' },
    { campaign: 'Tech Review Series', amount: 1800, date: '2024-02-05', type: 'completion' },
    { campaign: 'Social Media Management', amount: 2500, date: '2024-02-15', type: 'monthly' }
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 sticky top-0 z-10 border-b border-neutral-800">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="w-10 h-10 bg-gradient-to-r from-neutral-800 to-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition-all"
            >
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-emerald-600 bg-clip-text text-transparent">Ganancias</h1>
              <p className="text-xs text-neutral-500">Tu panel financiero</p>
            </div>

            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 pb-24 space-y-6">

        {/* Time Filter */}
        <div className="flex justify-center">
          <div className="bg-neutral-900 rounded-2xl p-2 shadow-sm border border-neutral-800 text-white placeholder-neutral-500">
            <div className="flex space-x-1">
              {[
                { key: 'week', label: '7 Days' },
                { key: 'month', label: '30 Days' },
                { key: 'year', label: '12 Months' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTimeFilter(tab.key as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    timeFilter === tab.key
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-950'
                  } placeholder-neutral-500`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Earnings Card */}
        <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="text-center mb-6">
            <div className="text-sm font-medium text-green-100 mb-2">Total Earnings ({timeFilter})</div>
            <div className="text-5xl font-black mb-3">${currentData.total.toLocaleString()}</div>
            <div className="flex items-center justify-center space-x-2">
              <div className="bg-neutral-900/20 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-sm font-bold">{currentData.growth}</span>
              </div>
              <span className="text-green-100 text-sm">vs previous {timeFilter}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-neutral-900/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold">{currentData.transactions}</div>
              <div className="text-xs text-green-100">Transactions</div>
            </div>
            <div className="bg-neutral-900/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold">${Math.round(currentData.total / currentData.transactions)}</div>
              <div className="text-xs text-green-100">Avg Per Job</div>
            </div>
            <div className="bg-neutral-900/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-xs text-green-100">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Chart Placeholder - Revolutionary Design */}
        <div className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800 text-white placeholder-neutral-500">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4"><TrendingUp className="w-5 h-5 text-emerald-400" strokeWidth={2} /> Tendencia de Ganancias</h3>
          <div className="h-48 bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-800 rounded-2xl flex items-center justify-center relative overflow-hidden">
            {/* Fake Chart Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: '#06b6d4', stopOpacity: 0.8}} />
                  <stop offset="50%" style={{stopColor: '#8b5cf6', stopOpacity: 0.8}} />
                  <stop offset="100%" style={{stopColor: '#ec4899', stopOpacity: 0.8}} />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="url(#chartGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="20,160 80,140 140,100 200,80 260,60 320,40 380,20"
              />
              <circle cx="380" cy="20" r="4" fill="#ec4899" />
            </svg>
            <div className="text-center z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                +{currentData.growth}
              </div>
              <div className="text-neutral-400 font-medium">Growth This {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}</div>
            </div>
          </div>
        </div>

        {/* Upcoming Payouts */}
        <div className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800 text-white placeholder-neutral-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Rocket className="w-5 h-5 text-emerald-400" strokeWidth={2} /> Pagos Próximos</h3>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ${upcomingPayouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} Expected
            </span>
          </div>
          <div className="space-y-3">
            {upcomingPayouts.map((payout, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Gem className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{payout.campaign}</div>
                    <div className="text-sm text-neutral-400">{payout.date} • {payout.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">+${payout.amount.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800 text-white placeholder-neutral-500">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4"><ArrowLeftRight className="w-5 h-5 text-emerald-400" strokeWidth={2} /> Transacciones Recientes</h3>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl hover:bg-neutral-800 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400' :
                    transaction.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-blue-500/15 text-blue-400'
                  }`}>
                    {transaction.status === 'paid' ? <Check className="w-4 h-4" strokeWidth={2.5} /> :
                     transaction.status === 'pending' ? <Clock className="w-4 h-4" strokeWidth={2} /> :
                     <RefreshCw className="w-4 h-4" strokeWidth={2} />}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{transaction.campaign}</div>
                    <div className="text-sm text-neutral-400">
                      {transaction.date} • {transaction.status}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    transaction.status === 'paid' ? 'text-green-600' : 'text-neutral-400'
                  }`}>
                    ${transaction.amount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-500 to-red-500 rounded-3xl p-6 text-white shadow-xl">
          <h3 className="flex items-center gap-2 text-lg font-bold mb-4"><Target className="w-5 h-5" strokeWidth={2} /> Métricas de Desempeño</h3>
          <div className="space-y-4">
            <div className="bg-neutral-900/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-2xl font-bold mb-2">Top Performing Category</div>
              <div className="text-emerald-100">UGC Content • $1,247 avg</div>
            </div>
            <div className="bg-neutral-900/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-2xl font-bold mb-2">Best Time to Post</div>
              <div className="text-emerald-100">Tuesdays 2-4 PM • +34% engagement</div>
            </div>
            <div className="bg-neutral-900/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-2xl font-bold mb-2">Growth Potential</div>
              <div className="text-emerald-100">+67% possible with optimization</div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/gigs')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-blue-500 transition-colors">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Jobs</span>
          </button>
          <button onClick={() => router.push('/creator/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-emerald-500 transition-colors">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Analytics</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-green-600">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Earnings</span>
          </div>
          <button onClick={() => router.push('/creator/profile')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-emerald-500 transition-colors">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
        <div className="h-1 bg-neutral-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>
    </div>
  )
}