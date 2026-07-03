'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/supabase'
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
        .eq('user_id', user.id)
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
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-xl text-neutral-400">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navigation */}
      <nav className="bg-neutral-900 shadow-sm border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href={profile?.role === 'company' ? '/company/dashboard' : '/creator/dashboard'}>
                <span className="text-2xl font-bold text-white">App Octopus</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={profile?.role === 'company' ? '/company/dashboard' : '/creator/dashboard'}
                className="text-neutral-400 hover:text-white"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-neutral-400 hover:text-white"
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
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="mt-2 text-neutral-400">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-neutral-900 rounded-lg shadow-sm border border-neutral-800 overflow-hidden text-white placeholder-neutral-500">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center">
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
                <h3 className="text-lg font-semibold text-white">Basic Information</h3>

                <div>
                  <label className="text-sm text-neutral-500">Full Name</label>
                  <div className="font-medium text-white">{profile?.full_name}</div>
                </div>

                <div>
                  <label className="text-sm text-neutral-500">Email</label>
                  <div className="font-medium text-white">{profile?.email}</div>
                </div>

                <div>
                  <label className="text-sm text-neutral-500">Username</label>
                  <div className="font-medium text-white">@{profile?.username}</div>
                </div>

                <div>
                  <label className="text-sm text-neutral-500">Country</label>
                  <div className="font-medium text-white">{profile?.country || 'Not specified'}</div>
                </div>

                <div>
                  <label className="text-sm text-neutral-500">Phone</label>
                  <div className="font-medium text-white">{profile?.phone_number || 'Not specified'}</div>
                </div>
              </div>

              {/* Role-specific Information */}
              <div className="space-y-4">
                {profile?.role === 'creator' && (
                  <>
                    <h3 className="text-lg font-semibold text-white">Creator Information</h3>
                    <div>
                      <label className="text-sm text-neutral-500">Experience Level</label>
                      <div className="font-medium text-white capitalize">
                        {profile?.experience_level || 'Not specified'}
                      </div>
                    </div>
                  </>
                )}

                {profile?.role === 'company' && (
                  <>
                    <h3 className="text-lg font-semibold text-white">Company Information</h3>
                    <div>
                      <label className="text-sm text-neutral-500">Company Name</label>
                      <div className="font-medium text-white">
                        {profile?.company_name || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-500">Company Type</label>
                      <div className="font-medium text-white capitalize">
                        {profile?.company_type || 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-500">Description</label>
                      <div className="font-medium text-white">
                        {profile?.company_description || 'Not specified'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="mt-8 pt-6 border-t border-neutral-800">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-neutral-500">Account created</p>
                  <p className="font-medium text-white">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div className="space-x-4">
                  <button className="px-4 py-2 border border-neutral-700 text-neutral-200 rounded-lg hover:bg-neutral-950 transition-colors">
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