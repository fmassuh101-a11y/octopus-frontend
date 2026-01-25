'use client'

import Link from 'next/link'
import { mockUser, mockStats, mockRecentCampaigns } from '@/data/mockData'

export default function CreatorDashboard() {
  const profile = mockUser

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500">Track your creator performance</p>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {profile.name.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 pb-24">

        {/* Earnings Summary */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">${mockStats.totalEarnings}</div>
            <div className="text-sm text-gray-500">Total Earnings</div>
            <div className="text-xs text-green-600 font-medium mt-1">+12% from last month</div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="h-32 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl mb-4 flex items-center justify-center">
            <span className="text-gray-500">📊 Performance Chart</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{mockStats.totalCampaigns}</div>
              <div className="text-xs text-gray-500">Campaigns</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">24K</div>
              <div className="text-xs text-gray-500">Total Views</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-orange-500">⏳</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{mockStats.pendingApplications}</div>
            <div className="text-xs text-gray-500">Applications</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="text-green-500">💰</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${mockStats.thisMonth}</div>
            <div className="text-xs text-gray-500">Earnings</div>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>

          <div className="space-y-4">
            {mockRecentCampaigns.map((campaign) => {
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'Completed': return 'text-green-600'
                  case 'In Review': return 'text-blue-600'
                  case 'Paid': return 'text-green-600'
                  default: return 'text-gray-600'
                }
              }

              const getBgColor = (platform: string) => {
                switch (platform) {
                  case 'TikTok': return 'bg-blue-100'
                  case 'Instagram': return 'bg-purple-100'
                  case 'YouTube': return 'bg-green-100'
                  default: return 'bg-gray-100'
                }
              }

              return (
                <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${getBgColor(campaign.platform)} rounded-lg flex items-center justify-center`}>
                      <span className="text-sm">{campaign.emoji}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                      <div className="text-xs text-gray-500">{campaign.views} views • ${campaign.earnings}</div>
                    </div>
                  </div>
                  <div className={`${getStatusColor(campaign.status)} font-medium text-sm`}>{campaign.status}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            href="/gigs"
            className="bg-blue-600 text-white rounded-xl p-4 text-center font-semibold shadow-sm"
          >
            <div className="text-lg mb-1">🔍</div>
            <div className="text-sm">Find Jobs</div>
          </Link>

          <Link
            href="/creator/profile"
            className="bg-gray-800 text-white rounded-xl p-4 text-center font-semibold shadow-sm"
          >
            <div className="text-lg mb-1">👤</div>
            <div className="text-sm">Profile</div>
          </Link>
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Pro Tips</h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-700">• Apply to campaigns quickly for better chances</div>
            <div className="text-sm text-gray-700">• Upload high-quality portfolio samples</div>
            <div className="text-sm text-gray-700">• Check your analytics weekly to track growth</div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - SideShift Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <div className="flex justify-around py-3">
          <Link href="/gigs" className="flex flex-col items-center space-y-1 text-gray-400">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Jobs</span>
          </Link>

          <div className="flex flex-col items-center space-y-1 text-blue-600">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Analytics</span>
          </div>

          <button className="flex flex-col items-center space-y-1 text-gray-400">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Earnings</span>
          </button>

          <Link href="/creator/profile" className="flex flex-col items-center space-y-1 text-gray-400">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>
    </div>
  )
}