'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(profile)
    } catch (error: any) {
      console.error('Error loading profile:', error)
      setError(error.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href={profile?.role === 'company' ? '/company/dashboard' : '/creator/dashboard'}>
                <span className="text-2xl font-bold text-slate-900">App Octopus</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={profile?.role === 'company' ? '/company/dashboard' : '/creator/dashboard'}
                className="text-slate-600 hover:text-slate-900"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-slate-600 hover:text-slate-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
          <p className="mt-2 text-slate-600">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {profile?.full_name?.charAt(0) || profile?.username?.charAt(0)}
                </span>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                <p className="text-blue-100">@{profile?.username}</p>
                <p className="text-blue-100 capitalize">{profile?.role} Account</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>

                <div>
                  <label className="text-sm text-slate-500">Full Name</label>
                  <div className="font-medium text-slate-900">{profile?.full_name}</div>
                </div>

                <div>
                  <label className="text-sm text-slate-500">Email</label>
                  <div className="font-medium text-slate-900">{profile?.email}</div>
                </div>

                <div>
                  <label className="text-sm text-slate-500">Username</label>
                  <div className="font-medium text-slate-900">@{profile?.username}</div>
                </div>

                <div>
                  <label className="text-sm text-slate-500">Country</label>
                  <div className="font-medium text-slate-900">{profile?.country || 'Not specified'}</div>
                </div>

                <div>
                  <label className="text-sm text-slate-500">Phone</label>
                  <div className="font-medium text-slate-900">{profile?.phone_number || 'Not specified'}</div>
                </div>
              </div>

              {/* Role-specific Information */}
              <div className="space-y-4">
                {profile?.role === 'creator' && (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900">Creator Information</h3>
                    <div>
                      <label className="text-sm text-slate-500">Experience Level</label>
                      <div className="font-medium text-slate-900 capitalize">
                        {profile?.experience_level || 'Not specified'}
                      </div>
                    </div>
                  </>
                )}

                {profile?.role === 'company' && (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900">Company Information</h3>
                    <div>
                      <label className="text-sm text-slate-500">Company Name</label>
                      <div className="font-medium text-slate-900">
                        {profile?.company_name || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Company Type</label>
                      <div className="font-medium text-slate-900 capitalize">
                        {profile?.company_type || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Description</label>
                      <div className="font-medium text-slate-900">
                        {profile?.company_description || 'Not specified'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-500">Account created</p>
                  <p className="font-medium text-slate-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div className="space-x-4">
                  <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}