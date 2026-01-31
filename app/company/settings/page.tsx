'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

type SettingsTab = 'payment' | 'paymentMethods' | 'profile' | 'team' | 'notifications'

export default function CompanySettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Profile form state
  const [companyName, setCompanyName] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  // Notifications state
  const [notifications, setNotifications] = useState({
    allNotifications: true,
    emailNotifications: true,
    applicants: true,
    interviewReminders: true,
    paymentFailures: true,
    jobs: true,
    payouts: true,
    videoReviews: true,
    team: true,
    alerts: true,
    analytics: true,
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)
      setEmail(userData.email || '')

      // Try to fetch profile
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const profiles = await response.json()
        if (profiles.length > 0) {
          const profileData = profiles[0]
          setProfile(profileData)
          setCompanyName(profileData.full_name || '')
          setProfileImage(profileData.avatar_url || null)

          // Parse bio for additional data
          if (profileData.bio) {
            try {
              const bioData = JSON.parse(profileData.bio)
              if (bioData.companyName) setCompanyName(bioData.companyName)
              if (bioData.logo) setProfileImage(bioData.logo)
            } catch (e) {}
          }
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token || !profile) return

      // Get existing bio data
      let bioData = {}
      if (profile.bio) {
        try {
          bioData = JSON.parse(profile.bio)
        } catch (e) {}
      }

      // Update bio with new values
      const updatedBio = {
        ...bioData,
        companyName,
        logo: profileImage,
      }

      // Update profile in Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          full_name: companyName,
          avatar_url: profileImage,
          bio: JSON.stringify(updatedBio)
        })
      })

      if (response.ok) {
        alert('Perfil guardado correctamente')
      } else {
        alert('Error al guardar el perfil')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error al guardar el perfil')
    }
    setSaving(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuracion...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'payment' as SettingsTab, label: 'Payment Plans' },
    { id: 'paymentMethods' as SettingsTab, label: 'Payment Methods' },
    { id: 'profile' as SettingsTab, label: 'Profile' },
    { id: 'team' as SettingsTab, label: 'Team Members' },
    { id: 'notifications' as SettingsTab, label: 'Notifications' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/company/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500">Manage your account and platform preferences</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Payment Plans Tab */}
        {activeTab === 'payment' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Plans</h2>
            <p className="text-gray-500 mb-6">Upgrade, cancel or renew current options from here</p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Plan */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Current Plan</h3>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">👑</span>
                  <span className="font-medium text-gray-900">Free Plan</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-4">$0.00</p>
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
                >
                  Change (Coming Soon)
                </button>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Payment Method</h3>
                  <button
                    disabled
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    Change
                  </button>
                </div>
                <p className="text-gray-500">No payment method on file</p>
              </div>
            </div>

            {/* Tax Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Tax / VAT Information</h3>
                  <p className="text-gray-500 text-sm">Add your tax ID for invoices</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Payment History */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment history</h3>
              <p className="text-gray-500 mb-4">View your payment history</p>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Payment Invoice</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Delivery date</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No payment history yet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Tab */}
        {activeTab === 'paymentMethods' && (
          <div>
            <div className="flex gap-4 mb-6">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscriptions
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Pay-ins
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Subscription Payment Methods</h3>
                  <p className="text-gray-500 text-sm">Keep cards on file for subscription billing via Stripe.</p>
                </div>
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              <p className="text-gray-500 text-sm mb-4">Saved methods are secured with Stripe and can be reused across your account.</p>

              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-center text-blue-700 mb-4">
                No payment methods yet. Add one to simplify future payments and manual bank disbursements.
              </div>

              <button
                disabled
                className="w-full py-3 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add payment method (Coming Soon)
              </button>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Profile</h2>
            <p className="text-gray-500 mb-6">Update your information here. This is how you will appear in chats and conversations.</p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-1">Company Account</h3>
              <p className="text-gray-500 text-sm mb-6">Update how your company appears to creators and in conversations.</p>

              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {companyName?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-2">Profile Picture</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
                    >
                      Upload Image
                    </button>
                    <button
                      onClick={() => setProfileImage(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">We support PNGs, JPGs and JPEGs under 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="block font-medium text-gray-900 mb-2">Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block font-medium text-gray-900 mb-2">Email *</label>
                <div className="flex gap-3 max-w-md">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    disabled
                  />
                  <button
                    disabled
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="block font-medium text-gray-900 mb-2">Password *</label>
                <div className="flex gap-3 max-w-md">
                  <input
                    type="password"
                    value="••••••••••••"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                  <button
                    disabled
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full max-w-md py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* Team Members Tab */}
        {activeTab === 'team' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invite new user</h2>
                <p className="text-gray-500">Invite multiple admins to your Octopus account</p>
              </div>
              <button
                disabled
                className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
              >
                Invite (Coming Soon)
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Team Members</h3>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-gray-400">
                        {companyName?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{companyName || 'Company'}</p>
                    <p className="text-gray-500 text-sm">@{companyName?.toLowerCase().replace(/\s/g, '') || 'company'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-gray-500">{email}</p>
                  <div className="flex flex-col gap-1">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Admin</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Full platform access</span>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700">
                    Manage Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
            <p className="text-gray-500 mb-6">Choose how you'd like to receive notifications for different types of updates</p>

            {/* Notification Preferences Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Notification type</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">SMS</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        All notifications
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.allNotifications}
                        onChange={(val) => setNotifications({...notifications, allNotifications: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.emailNotifications}
                        onChange={(val) => setNotifications({...notifications, emailNotifications: val})}
                      />
                    </td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Applicants
                      </div>
                      <p className="text-gray-500 text-sm ml-8">Get updates when new applications are submitted.</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.applicants}
                        onChange={(val) => setNotifications({...notifications, applicants: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch enabled={true} onChange={() => {}} />
                    </td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Interview Reminders
                      </div>
                      <p className="text-gray-500 text-sm ml-8">Stay on track with reminders before upcoming interviews.</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.interviewReminders}
                        onChange={(val) => setNotifications({...notifications, interviewReminders: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch enabled={true} onChange={() => {}} />
                    </td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Payment Failures
                      </div>
                      <p className="text-gray-500 text-sm ml-8">Get alerts when payments fail due to insufficient funds.</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        enabled={notifications.paymentFailures}
                        onChange={(val) => setNotifications({...notifications, paymentFailures: val})}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch enabled={true} onChange={() => {}} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* In-App Notifications */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">In-App Notifications</h3>
            <p className="text-gray-500 mb-4">Choose which notifications appear in your notification center</p>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Category</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'jobs', icon: '💼', label: 'Jobs', desc: 'Job applicant milestones (100, 500, 1000 applicants)' },
                    { key: 'payouts', icon: '💵', label: 'Payouts', desc: 'Balance alerts, payment due reminders, and payout status' },
                    { key: 'videoReviews', icon: '📹', label: 'Video Reviews', desc: 'Notifications when videos are pending review' },
                    { key: 'team', icon: '👥', label: 'Team', desc: 'Team member joins, contracts, and collaborations' },
                    { key: 'alerts', icon: '🔔', label: 'Alerts', desc: 'System alerts, new features, and announcements' },
                    { key: 'analytics', icon: '📊', label: 'Analytics', desc: 'Video view milestones (10K, 100K, 1M views)' },
                  ].map((item) => (
                    <tr key={item.key} className="border-t border-gray-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-gray-500 text-sm">{item.desc}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ToggleSwitch
                          enabled={(notifications as any)[item.key]}
                          onChange={(val) => setNotifications({...notifications, [item.key]: val})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Toggle Switch Component
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
