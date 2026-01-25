'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createGig } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'

const CATEGORIES = [
  'UGC Video',
  'UGC Photo',
  'TikTok Content',
  'Instagram Content',
  'YouTube Content',
  'Video Editing',
  'Product Review',
  'Brand Partnership',
  'Social Media Management',
  'Content Creation'
]

export default function NewJobPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [requirements, setRequirements] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!user) {
        router.push('/auth/login')
        return
      }

      await createGig({
        title,
        description,
        budget,
        category,
        deadline: deadline || undefined,
        requirements: requirements || undefined,
        deliverables: deliverables || undefined
      })

      router.push('/company/dashboard')
    } catch (error: any) {
      setError(error.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/company/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Post a New Gig</h1>
          <p className="mt-2 text-slate-600">Create a gig posting to find creators for your project</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                Gig Title *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Need UGC video for skincare brand"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700">
                Category *
              </label>
              <div className="mt-1">
                <select
                  id="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                Description *
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what you need, including specific requirements, style preferences, target audience, etc."
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-slate-700">
                Budget *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="budget"
                  required
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. $500, $100-200, $50 + $2 CPM, Negotiable"
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Enter your budget as text (e.g. "$500", "$100-200", "Negotiable")
              </p>
            </div>

            {/* Requirements */}
            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-slate-700">
                Requirements (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="requirements"
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What are you looking for in creators? (e.g. 10k+ followers, fashion niche, etc.)"
                />
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <label htmlFor="deliverables" className="block text-sm font-medium text-slate-700">
                Deliverables (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="deliverables"
                  rows={3}
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What should creators provide? (e.g. 3 TikTok videos, 2 Instagram posts)"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-slate-700">
                Deadline (Optional)
              </label>
              <div className="mt-1">
                <input
                  type="date"
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-4">
              <Link
                href="/company/dashboard"
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Posting...' : 'Post Gig'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}