'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockUser, mockStats, mockRecentCampaigns } from '@/data/mockData'

export default function ProfilePage() {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const socialStats = {
    instagram: { followers: '127K', engagement: '4.2%', verified: true },
    tiktok: { followers: '89K', engagement: '6.8%', verified: true },
    youtube: { subscribers: '45K', views: '2.1M', verified: false },
    twitter: { followers: '23K', engagement: '3.1%', verified: false }
  }

  const achievements = [
    { icon: '🏆', title: 'Top Creator', desc: 'Ranked #1 in Fashion category' },
    { icon: '🎯', title: '98% Success Rate', desc: 'Campaigns delivered on time' },
    { icon: '💎', title: 'Premium Creator', desc: 'Verified professional status' },
    { icon: '🚀', title: 'Viral Expert', desc: '10+ videos over 1M views' }
  ]

  const portfolioItems = [
    { platform: 'TikTok', brand: 'Nike', views: '2.4M', engagement: '8.2%', thumbnail: '👟' },
    { platform: 'Instagram', brand: 'Sephora', views: '890K', engagement: '12.1%', thumbnail: '💄' },
    { platform: 'YouTube', brand: 'Apple', views: '1.2M', engagement: '6.8%', thumbnail: '📱' },
    { platform: 'TikTok', brand: 'Starbucks', views: '3.1M', engagement: '15.3%', thumbnail: '☕' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Creator Profile</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-20">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 mt-6">
          <div className="h-32 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/80 via-pink-600/80 to-red-600/80"></div>
            <div className="absolute -bottom-16 left-6">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {mockUser.name.charAt(0)}
                </span>
              </div>
            </div>
            <div className="absolute top-4 right-4">
              <div className="bg-black/30 backdrop-blur-lg px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">✨ Premium Creator</span>
              </div>
            </div>
          </div>

          <div className="pt-20 pb-6 px-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{mockUser.name}</h1>
              <div className="flex items-center space-x-1">
                <span className="text-blue-500">✓</span>
                <span className="text-sm text-blue-500 font-medium">Verified</span>
              </div>
            </div>
            <p className="text-gray-600 mb-1">Fashion & Lifestyle Creator</p>
            <p className="text-sm text-gray-500 mb-4">📍 Los Angeles, CA • 🎂 23 years old</p>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">127K</div>
                <div className="text-xs text-gray-500">Total Reach</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">89</div>
                <div className="text-xs text-gray-500">Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">4.8⭐</div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              Passionate creator specializing in fashion, beauty & lifestyle content. Worked with 50+ brands including Nike, Sephora, and Starbucks. Expert in viral content creation and authentic storytelling.
            </p>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <div className="text-sm font-bold text-gray-900 mb-1">{achievement.title}</div>
                <div className="text-xs text-gray-600">{achievement.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
          <div className="border-b border-gray-100">
            <div className="flex">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'social', label: 'Social', icon: '📱' },
                { id: 'portfolio', label: 'Portfolio', icon: '🎬' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-4 text-center font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                    <div className="text-green-600 text-sm font-medium mb-1">Total Earnings</div>
                    <div className="text-2xl font-bold text-green-700">${mockStats.totalEarnings.toLocaleString()}</div>
                    <div className="text-xs text-green-600">+${mockStats.thisMonth} this month</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                    <div className="text-blue-600 text-sm font-medium mb-1">Success Rate</div>
                    <div className="text-2xl font-bold text-blue-700">{mockStats.approvalRate}%</div>
                    <div className="text-xs text-blue-600">{mockStats.totalCampaigns} campaigns completed</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {mockRecentCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg">{campaign.emoji}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                            <div className="text-xs text-gray-500">{campaign.views} views • {campaign.platform}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">${campaign.earnings}</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            campaign.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            campaign.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {campaign.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-4">
                {Object.entries(socialStats).map(([platform, stats]) => (
                  <div key={platform} className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {platform.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 capitalize">{platform}</div>
                          <div className="text-xs text-gray-500">@maria_creates</div>
                        </div>
                      </div>
                      {stats.verified && (
                        <span className="text-blue-500 text-sm">✓ Verified</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">
                          {platform === 'youtube' ? 'Subscribers' : 'Followers'}
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {platform === 'youtube' ? stats.subscribers : stats.followers}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">
                          {platform === 'youtube' ? 'Total Views' : 'Engagement'}
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {platform === 'youtube' ? stats.views : stats.engagement}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {portfolioItems.map((item, index) => (
                    <div key={index} className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl border border-cyan-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{item.thumbnail}</div>
                          <div>
                            <div className="font-bold text-gray-900">{item.brand}</div>
                            <div className="text-xs text-gray-500">{item.platform} Campaign</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{item.views} views</div>
                          <div className="text-xs text-gray-500">{item.engagement} engagement</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1 rounded-full"
                          style={{ width: `${Math.min(parseFloat(item.engagement), 20) * 5}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 text-center">
                  <div className="text-3xl mb-3">🎬</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Portfolio Highlights</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    50+ successful brand collaborations with a combined reach of 10M+ views
                  </p>
                  <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl font-medium">
                    View Full Portfolio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings & Actions */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⚙️</span>
            Settings & Actions
          </h2>
          <div className="space-y-3">
            {[
              { icon: '📊', label: 'Analytics Dashboard', desc: 'View detailed performance metrics' },
              { icon: '💰', label: 'Payout Settings', desc: 'Manage payment methods' },
              { icon: '🔔', label: 'Notifications', desc: 'Configure alerts and updates' },
              { icon: '🛡️', label: 'Privacy & Security', desc: 'Account security settings' },
              { icon: '📋', label: 'Media Kit', desc: 'Download professional media kit' },
              { icon: '📞', label: 'Support Center', desc: 'Get help and contact support' }
            ].map((item, index) => (
              <button key={index} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}