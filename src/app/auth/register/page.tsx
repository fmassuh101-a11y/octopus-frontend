'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  const handleRoleSelect = (role: 'creator' | 'company') => {
    console.log('ROLE SELECTED:', role)
    try {
      router.push(`/auth/select-role?role=${role}`)
    } catch (error) {
      console.error('Navigation error:', error)
      window.location.href = `/auth/select-role?role=${role}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">🐙</span>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-purple-600 bg-clip-text text-transparent">Octopus</span>
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Join Octopus
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Choose your account type to get started
          </p>
        </div>

        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-6">Choose your role:</h3>

            <button
              type="button"
              onClick={() => handleRoleSelect('creator')}
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              🎨 I'M A CREATOR
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('company')}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              🏢 I'M A COMPANY
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-500">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}