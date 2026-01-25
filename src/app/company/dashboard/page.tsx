'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DebugNavbar } from '@/components/DebugNavbar'
import { mockCompanyUser, mockCompanyGigs, type MockGig } from '@/data/mockData'

export default function CompanyDashboard() {
  const profile = mockCompanyUser
  const gigs = mockCompanyGigs
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applications'>('overview')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <DebugNavbar dashboardPath="/company/dashboard">
        <div className="ml-8 flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'jobs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Jobs
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'applications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Applications
          </button>
        </div>
        <Link
          href="/company/jobs/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto mr-4"
        >
          Post New Job
        </Link>
      </DebugNavbar>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Company Dashboard</h1>
          <p className="mt-2 text-slate-600">Manage your jobs and find the best creators</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-blue-600">{gigs.length}</div>
            <div className="text-sm text-slate-600">Total Jobs Posted</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-green-600">
              {gigs.filter(g => g.status === 'active').length}
            </div>
            <div className="text-sm text-slate-600">Active Jobs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-orange-600">
              {gigs.reduce((sum, gig) => sum + gig.applications_count, 0)}
            </div>
            <div className="text-sm text-slate-600">Total Applications</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-purple-600">
              {gigs.filter(g => g.status === 'completed').length}
            </div>
            <div className="text-sm text-slate-600">Completed Jobs</div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/company/jobs/new"
                  className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-medium text-slate-900">Post New Job</div>
                  <div className="text-sm text-slate-600">Create a new project listing</div>
                </Link>
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center hover:border-green-400 hover:bg-green-50 transition-colors">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="font-medium text-slate-900">Browse Creators</div>
                  <div className="text-sm text-slate-600">Find talented creators</div>
                </div>
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-medium text-slate-900">View Analytics</div>
                  <div className="text-sm text-slate-600">Track your performance</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {gigs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-lg">No activity yet</div>
                    <div className="text-slate-500 text-sm">Post your first gig to get started</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gigs.slice(0, 3).map((gig) => (
                      <div key={gig.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-900">{gig.title}</div>
                          <div className="text-sm text-slate-600">
                            {gig.applications_count} applications • Posted {new Date(gig.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          gig.status === 'active' ? 'bg-green-100 text-green-700' :
                          gig.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {gig.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-900">My Jobs</h2>
                <Link
                  href="/company/jobs/new"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Post New Job
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {gigs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-slate-400 text-lg">No gigs posted yet</div>
                  <div className="text-slate-500 text-sm">Create your first gig to find creators</div>
                  <Link
                    href="/company/jobs/new"
                    className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Post Your First Gig
                  </Link>
                </div>
              ) : (
                gigs.map((gig) => (
                  <div key={gig.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {gig.title}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            gig.status === 'active' ? 'bg-green-100 text-green-700' :
                            gig.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {gig.status}
                          </span>
                        </div>
                        <p className="text-slate-600 mb-4 line-clamp-2">
                          {gig.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                            {gig.category || 'General'}
                          </span>
                          <span>
                            {gig.payment_type === 'fixed' && gig.fixed_amount && `$${gig.fixed_amount} fixed`}
                            {gig.payment_type === 'cpm' && gig.cpm_rate && `$${gig.cpm_rate} per 1k views`}
                            {gig.payment_type === 'cpm_fixed' && gig.fixed_amount && gig.cpm_rate && `$${gig.fixed_amount} + $${gig.cpm_rate} CPM`}
                          </span>
                          <span>
                            {gig.applications_count} applications
                          </span>
                          <span>
                            Posted {new Date(gig.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-6 flex flex-col space-y-2">
                        <Link
                          href={`/gigs/${gig.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          View Gig
                        </Link>
                        <button className="border border-slate-300 hover:border-slate-400 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          Applications ({gig.applications_count})
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">All Applications</h2>
            </div>
            <div className="p-8 text-center">
              <div className="text-slate-400 text-lg">No applications yet</div>
              <div className="text-slate-500 text-sm">Post jobs to start receiving applications from creators</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}