'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Navigation Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-bold">🐙</span>
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Octopus
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => {
                  console.log('Login button clicked')
                  try {
                    router.push('/auth/login')
                  } catch (error) {
                    console.error('Navigation error:', error)
                    window.location.href = '/auth/login'
                  }
                }}
                className="text-white/90 hover:text-white px-6 py-3 rounded-xl font-semibold transition-all hover:bg-white/10"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Get Started button clicked')
                  try {
                    router.push('/auth/register')
                  } catch (error) {
                    console.error('Navigation error:', error)
                    window.location.href = '/auth/register'
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500 px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-24">

        {/* Hero Section */}
        <div className="text-center mb-24 relative">
          {/* Floating Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>

          <div className="relative z-10">
            <div className="mb-8">
              <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-cyan-300 text-sm font-semibold border border-cyan-400/20 mb-6">
                ✨ The Future of Creator Economy
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">
                Multiply Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Creative Income
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
              Join <span className="text-cyan-400 font-bold">1M+ creators</span> earning serious money through
              <span className="text-purple-400 font-bold"> UGC</span>,
              <span className="text-pink-400 font-bold"> Clipping</span>,
              <span className="text-emerald-400 font-bold"> Brand Partnerships</span> & more.
              <br />
              <span className="text-white/60">Apply to exclusive campaigns with one tap. No applications, no waiting.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <button
                type="button"
                onClick={() => {
                  console.log('Start Earning Today button clicked')
                  try {
                    router.push('/auth/register')
                  } catch (error) {
                    console.error('Navigation error:', error)
                    window.location.href = '/auth/register'
                  }
                }}
                className="group bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:from-cyan-400 hover:to-purple-500 transition-all transform hover:scale-105 shadow-xl shadow-purple-500/25 border border-cyan-400/20"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>🚀 Start Earning Today</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Browse Creator Jobs button clicked')
                  try {
                    router.push('/gigs')
                  } catch (error) {
                    console.error('Navigation error:', error)
                    window.location.href = '/gigs'
                  }
                }}
                className="border border-white/20 bg-white/5 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all transform hover:scale-105"
              >
                🎯 Explore Opportunities
              </button>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">1M+</div>
                <div className="text-white/80 font-semibold">Active Creators</div>
                <div className="text-white/40 text-sm">Worldwide</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">5K+</div>
                <div className="text-white/80 font-semibold">Premium Brands</div>
                <div className="text-white/40 text-sm">Fortune 500</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent mb-2">$50M+</div>
                <div className="text-white/80 font-semibold">Creator Earnings</div>
                <div className="text-white/40 text-sm">This year</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">98%</div>
                <div className="text-white/80 font-semibold">Success Rate</div>
                <div className="text-white/40 text-sm">Campaigns</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Categories */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-6">
              Multiple Revenue Streams
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Access thousands of opportunities across every major content category
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* UGC Content */}
            <div className="group bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎬</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">UGC Content</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Create authentic user-generated content for brands across all platforms
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $500-$5k per video</div>
                <div>• Brand partnerships</div>
                <div>• Product reviews</div>
              </div>
            </div>

            {/* Content Clipping */}
            <div className="group bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-3xl p-8 border border-cyan-500/20 hover:border-cyan-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">✂️</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Content Clipping</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Turn long-form content into viral clips for creators and brands
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $50-$300 per clip</div>
                <div>• Podcast highlights</div>
                <div>• Stream moments</div>
              </div>
            </div>

            {/* Brand Partnerships */}
            <div className="group bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-3xl p-8 border border-emerald-500/20 hover:border-emerald-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Brand Partnerships</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Long-term collaborations with premium brands and agencies
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $1k-$50k contracts</div>
                <div>• Exclusive deals</div>
                <div>• Ambassador programs</div>
              </div>
            </div>

            {/* Live Streaming */}
            <div className="group bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm rounded-3xl p-8 border border-orange-500/20 hover:border-orange-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📺</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Live Streaming</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Monetize your live streams with sponsored segments and product demos
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $100-$2k per stream</div>
                <div>• Product launches</div>
                <div>• Live collaborations</div>
              </div>
            </div>

            {/* Social Media Management */}
            <div className="group bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-sm rounded-3xl p-8 border border-violet-500/20 hover:border-violet-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Social Management</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Manage social media accounts for busy creators and businesses
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $500-$3k monthly</div>
                <div>• Content planning</div>
                <div>• Community management</div>
              </div>
            </div>

            {/* Photography & Design */}
            <div className="group bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-sm rounded-3xl p-8 border border-pink-500/20 hover:border-pink-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Photo & Design</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Create stunning visuals, thumbnails, and brand assets for creators
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $50-$500 per design</div>
                <div>• Custom thumbnails</div>
                <div>• Brand graphics</div>
              </div>
            </div>

            {/* Writing & Copywriting */}
            <div className="group bg-gradient-to-br from-indigo-500/10 to-blue-600/10 backdrop-blur-sm rounded-3xl p-8 border border-indigo-500/20 hover:border-indigo-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">✍️</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Content Writing</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Write scripts, captions, and marketing copy for top creators and brands
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $100-$1k per project</div>
                <div>• Script writing</div>
                <div>• Marketing copy</div>
              </div>
            </div>

            {/* Consulting & Strategy */}
            <div className="group bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-3xl p-8 border border-yellow-500/20 hover:border-yellow-400/40 transition-all hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">💡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Creator Consulting</h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Help emerging creators grow their audience and monetization strategies
              </p>
              <div className="space-y-2 text-xs text-white/60">
                <div>• $200-$2k per session</div>
                <div>• Growth strategies</div>
                <div>• Monetization plans</div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="relative bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-3xl p-16 text-center border border-white/10 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5"></div>
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent mb-6">
              Ready to 10x Your Income?
            </h2>
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-4xl mx-auto">
              Join <span className="text-cyan-400 font-bold">1M+ creators</span> already earning life-changing money through Octopus.
              <br />
              <span className="text-white/60">No experience required. Start earning in 24 hours.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <button
                type="button"
                onClick={() => {
                  console.log('Get Started Free button clicked')
                  try {
                    router.push('/auth/register')
                  } catch (error) {
                    console.error('Navigation error:', error)
                    window.location.href = '/auth/register'
                  }
                }}
                className="group bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-12 py-6 rounded-2xl font-bold text-xl hover:from-cyan-400 hover:to-purple-500 transition-all transform hover:scale-110 shadow-2xl shadow-purple-500/25 border border-cyan-400/30"
              >
                <span className="flex items-center justify-center space-x-3">
                  <span>🚀 Start Earning Today</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center space-x-3 text-white/80">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-xl">✓</span>
                </div>
                <span className="font-semibold">100% Free to Join</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-white/80">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400 text-xl">⚡</span>
                </div>
                <span className="font-semibold">Instant Payouts</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-white/80">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 text-xl">🛡️</span>
                </div>
                <span className="font-semibold">Secure & Trusted</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}