'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState<'creator' | 'company' | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refreshProfile, signInWithGoogle } = useAuth()

  useEffect(() => {
    // Get role from URL params if available
    const roleParam = searchParams.get('role') as 'creator' | 'company'
    if (roleParam) {
      setSelectedRole(roleParam)
    }
  }, [searchParams])

  const handleGoogleSignUp = async () => {
    if (!selectedRole) return

    setLoading(true)
    setError('')

    try {
      // Store selected role in localStorage so we can use it after OAuth
      localStorage.setItem('selectedRole', selectedRole)
      await signInWithGoogle()
    } catch (error: any) {
      console.error('Google sign-up error:', error)
      setError(error.message || 'Failed to sign up with Google')
      setLoading(false)
    }
  }

  // Don't require user login first - this is the signup flow

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L13.09 8.26L20 9.27L15 14.14L16.18 21.02L10 17.77L3.82 21.02L5 14.14L0 9.27L6.91 8.26L10 2Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Complete your signup</h1>
          <p className="text-sm text-slate-600">
            {selectedRole
              ? `Great! You selected ${selectedRole}. Now sign in with Google to complete your account.`
              : 'Choose your role and sign in with Google to complete your account.'
            }
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {!selectedRole ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 mb-6 text-center">Choose your role:</h3>

              <button
                type="button"
                onClick={() => setSelectedRole('creator')}
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🎨 I'M A CREATOR
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('company')}
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🏢 I'M A COMPANY
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className={`inline-block px-4 py-2 rounded-full text-white font-semibold ${
                  selectedRole === 'creator' ? 'bg-purple-600' : 'bg-green-600'
                }`}>
                  {selectedRole === 'creator' ? '🎨 CREATOR' : '🏢 COMPANY'}
                </div>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="ml-3 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Change
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Skip Google OAuth for now - go directly to dashboard
                  const redirectPath = selectedRole === 'creator' ? '/creator/dashboard' : '/company/dashboard'
                  router.push(redirectPath)
                }}
                className="w-full flex justify-center items-center py-4 px-6 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all font-semibold text-lg"
              >
                Continue to Dashboard →
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-500">Demo mode - Skip OAuth for now</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}