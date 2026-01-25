'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError) throw authError

        if (session?.user) {
          // Check if user already has a profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (existingProfile) {
            // User already has profile, redirect to appropriate dashboard
            const redirectPath = existingProfile.role === 'creator'
              ? '/creator/dashboard'
              : '/company/dashboard'
            router.push(redirectPath)
          } else {
            // New user - check if they selected a role before OAuth
            const selectedRole = localStorage.getItem('selectedRole') as 'creator' | 'company'

            if (selectedRole) {
              // Create profile with the pre-selected role
              const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: session.user.id,
                    email: session.user.email,
                    username: session.user.user_metadata?.name?.toLowerCase().replace(/\s+/g, '') || session.user.email?.split('@')[0],
                    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
                    avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                    role: selectedRole,
                  }
                ])

              if (profileError) throw profileError

              // Clear stored role
              localStorage.removeItem('selectedRole')

              // Redirect to appropriate dashboard
              const redirectPath = selectedRole === 'creator' ? '/creator/dashboard' : '/company/dashboard'
              router.push(redirectPath)
            } else {
              // No pre-selected role, go to role selection
              router.push('/auth/select-role')
            }
          }
        } else {
          // No session, redirect to login
          router.push('/auth/login')
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setError(error.message || 'Authentication failed')
        setTimeout(() => router.push('/auth/login'), 3000)
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return null
}