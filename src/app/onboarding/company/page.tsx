'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface FormData {
  fullName: string
  email: string
  username: string
  password: string
  country: string
  phoneNumber: string
  companyName: string
  companyType: string
  companyDescription: string
}

export default function CompanyOnboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    username: '',
    password: '',
    country: '',
    phoneNumber: '',
    companyName: '',
    companyType: '',
    companyDescription: ''
  })

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = async () => {
    if (step < 8) {
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
            role: 'company',
            country: formData.country,
            phone_number: formData.phoneNumber,
            company_name: formData.companyName,
            company_type: formData.companyType,
            company_description: formData.companyDescription,
          }
        ])

      if (profileError) throw profileError

      // 5. Redirect to company dashboard
      router.push('/company/dashboard')
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
      case 6: return formData.companyName.trim() !== ''
      case 7: return formData.companyType !== ''
      case 8: return formData.companyDescription.trim() !== ''
      default: return true
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2h6v8H7V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Company Account</h1>
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= step ? 'bg-green-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600">Step {step} of 8</p>
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
                  placeholder="Your full name"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">What's your email?</h2>
                <input
                  type="email"
                  placeholder="Enter your business email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  placeholder="Business phone number"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Company name</h2>
                <input
                  type="text"
                  placeholder="Enter your company name"
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Company type</h2>
                <div className="space-y-3">
                  {[
                    { value: 'startup', label: 'Startup', desc: 'Early stage company' },
                    { value: 'agency', label: 'Agency', desc: 'Marketing or creative agency' },
                    { value: 'brand', label: 'Brand', desc: 'Established brand or corporation' },
                    { value: 'ecommerce', label: 'E-commerce', desc: 'Online retail business' },
                    { value: 'other', label: 'Other', desc: 'Different type of business' }
                  ].map((option) => (
                    <div
                      key={option.value}
                      onClick={() => updateFormData('companyType', option.value)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.companyType === option.value
                          ? 'border-green-500 bg-green-50'
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

            {step === 8 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Tell us about your company</h2>
                <textarea
                  placeholder="Describe what your company does and what kind of content you're looking for..."
                  value={formData.companyDescription}
                  onChange={(e) => updateFormData('companyDescription', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={4}
                  autoFocus
                />
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
              {loading ? 'Creating...' : step === 8 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}