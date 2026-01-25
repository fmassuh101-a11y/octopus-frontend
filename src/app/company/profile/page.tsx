'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { DebugNavbar } from '@/components/DebugNavbar'

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile && profile.role !== 'company') {
        router.push('/auth/login')
        return
      }

      setProfile(profile)
      setAvatarUrl(profile?.avatar_url || null)
    } catch (error) {
      console.error('Error loading profile:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true)

      if (!profile) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)

    } catch (error: any) {
      console.error('Error uploading avatar:', error.message || 'Unknown error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatar(file)
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <DebugNavbar
        showBackToDashboard={true}
        dashboardPath="/company/dashboard"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Company Profile</h1>
          <p className="mt-2 text-slate-600">Manage your company information and avatar</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-green-500 px-8 py-8">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white/20 border-4 border-white/30">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {profile?.company_name?.charAt(0) || profile?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? '...' : '📷'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Company Info */}
              <div className="text-white">
                <h2 className="text-2xl font-bold">
                  {profile?.company_name || profile?.full_name}
                </h2>
                <p className="text-blue-100">@{profile?.username}</p>
                <p className="text-blue-100 capitalize">{profile?.role} Account</p>
                <p className="text-blue-100 capitalize">{profile?.company_type}</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>

                <div>
                  <label className="text-sm font-medium text-slate-500">Contact Person</label>
                  <div className="text-slate-900">{profile?.full_name}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Email</label>
                  <div className="text-slate-900">{profile?.email}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Username</label>
                  <div className="text-slate-900">@{profile?.username}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Country</label>
                  <div className="text-slate-900">{profile?.country || 'Not specified'}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Phone</label>
                  <div className="text-slate-900">{profile?.phone_number || 'Not specified'}</div>
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">Company Information</h3>

                <div>
                  <label className="text-sm font-medium text-slate-500">Company Name</label>
                  <div className="text-slate-900">{profile?.company_name || 'Not specified'}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Company Type</label>
                  <div className="text-slate-900 capitalize">{profile?.company_type || 'Not specified'}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Description</label>
                  <div className="text-slate-900">
                    {profile?.company_description || 'No description provided'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500">Account Created</label>
                  <div className="text-slate-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  Profile complete • Ready to post gigs and hire creators
                </div>
                <div className="space-x-4">
                  <button className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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