'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface FormData {
  fullName: string
  email: string
  username: string
  password: string
  country: string
  phoneNumber: string
  experience: string
}

export default function CreatorOnboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { refreshProfile } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    username: '',
    password: '',
    country: '',
    phoneNumber: '',
    experience: ''
  })

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = async () => {
    if (step < 6) {
      setStep(step + 1)
    } else {
      await handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned from signup')

      // 2. Sign in immediately after signup to establish session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) throw signInError

      // 3. Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 4. Create profile in database (now with active session)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: formData.email,
            username: formData.username,
            full_name: formData.fullName,
            role: 'creator',
            country: formData.country,
            phone_number: formData.phoneNumber,
            experience_level: formData.experience,
          }
        ])

      if (profileError) throw profileError

      // 5. Refresh profile in AuthContext to ensure it's updated
      console.log('Refreshing profile in AuthContext...')
      await refreshProfile()

      // 6. Small delay to ensure profile is refreshed
      await new Promise(resolve => setTimeout(resolve, 500))

      // 7. Redirect to creator dashboard
      console.log('Redirecting to creator dashboard...')
      try {
        router.push('/creator/dashboard')
      } catch (error) {
        console.error('Router push failed:', error)
        window.location.href = '/creator/dashboard'
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message || 'Error creating account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.fullName.trim() !== ''
      case 2: return formData.email.trim() !== '' && formData.email.includes('@')
      case 3: return formData.username.trim() !== ''
      case 4: return formData.password.length >= 6
      case 5: return formData.country.trim() !== '' && formData.phoneNumber.trim() !== ''
      case 6: return formData.experience !== ''
      default: return true
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L13.09 8.26L20 9.27L15 14.14L16.18 21.02L10 17.77L3.82 21.02L5 14.14L0 9.27L6.91 8.26L10 2Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Creator Account</h1>
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= step ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600">Step {step} of 6</p>
        </div>

        {/* Main Content */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form steps */}
          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">What's your name?</h2>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">What's your email?</h2>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Choose a username</h2>
                <input
                  type="text"
                  placeholder="Your unique username"
                  value={formData.username}
                  onChange={(e) => updateFormData('username', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Create a password</h2>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Where are you from?</h2>
                <select
                  value={formData.country}
                  onChange={(e) => updateFormData('country', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select your country</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                  <option value="BR">Brazil</option>
                  <option value="MX">Mexico</option>
                  <option value="AR">Argentina</option>
                  <option value="CO">Colombia</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Your experience level?</h2>
                <div className="space-y-3">
                  {[
                    { value: 'beginner', label: 'Beginner', desc: 'New to content creation' },
                    { value: 'intermediate', label: 'Intermediate', desc: 'Some experience creating content' },
                    { value: 'expert', label: 'Expert', desc: 'Experienced content creator' }
                  ].map((option) => (
                    <div
                      key={option.value}
                      onClick={() => updateFormData('experience', option.value)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.experience === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{option.label}</div>
                      <div className="text-sm text-slate-600">{option.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex space-x-4 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 px-4 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isStepValid() || loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              {loading ? 'Creating...' : step === 6 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}