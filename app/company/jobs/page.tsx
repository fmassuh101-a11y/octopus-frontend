'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Job {
  id: string
  title: string
  description: string
  budget: string
  status: string
  applicants_count: number
  created_at: string
  category: string
  requirements?: string
  company_id: string
  company_name?: string
  image_url?: string
}

export default function CompanyJobsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'archived'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showBoostModal, setShowBoostModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuthAndLoadJobs()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const checkAuthAndLoadJobs = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      // Load jobs with applicant count
      const response = await fetch(`${SUPABASE_URL}/rest/v1/gigs?company_id=eq.${userData.id}&select=*&order=created_at.desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })

      if (response.ok) {
        const data = await response.json()

        // Get applicant counts for each job
        const jobIds = data.map((j: Job) => j.id)
        if (jobIds.length > 0) {
          const countsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/applications?gig_id=in.(${jobIds.join(',')})&select=gig_id`,
            { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
          )
          const applicationsData = countsRes.ok ? await countsRes.json() : []

          // Count per job
          const countMap = new Map<string, number>()
          applicationsData.forEach((app: any) => {
            countMap.set(app.gig_id, (countMap.get(app.gig_id) || 0) + 1)
          })

          // Add counts to jobs
          data.forEach((job: Job) => {
            job.applicants_count = countMap.get(job.id) || 0
          })
        }

        setJobs(data)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesTab = job.status === activeTab
    const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const jobCounts = {
    active: jobs.filter(j => j.status === 'active').length,
    draft: jobs.filter(j => j.status === 'draft').length,
    archived: jobs.filter(j => j.status === 'archived').length,
  }

  const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicants_count || 0), 0)

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `hace ${diffMins}m`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays}d`
    return `hace ${Math.floor(diffDays / 7)}sem`
  }

  const handleMenuAction = async (action: string, job: Job) => {
    const token = localStorage.getItem('sb-access-token')
    if (!token) return

    setMenuOpen(null)

    switch (action) {
      case 'edit':
        router.push(`/company/jobs/${job.id}/edit`)
        break

      case 'duplicate':
        try {
          const { id, created_at, applicants_count, ...jobData } = job
          const res = await fetch(`${SUPABASE_URL}/rest/v1/gigs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              ...jobData,
              title: `${job.title} (Copia)`,
              status: 'draft'
            })
          })
          if (res.ok) {
            const newJobs = await res.json()
            if (newJobs.length > 0) {
              setJobs(prev => [{ ...newJobs[0], applicants_count: 0 }, ...prev])
              setActiveTab('draft')
            }
          }
        } catch (err) {
          console.error('Error duplicating job:', err)
        }
        break

      case 'archive':
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/gigs?id=eq.${job.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'archived' })
          })
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'archived' } : j))
        } catch (err) {
          console.error('Error archiving job:', err)
        }
        break

      case 'activate':
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/gigs?id=eq.${job.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'active' })
          })
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'active' } : j))
          setActiveTab('active')
        } catch (err) {
          console.error('Error activating job:', err)
        }
        break

      case 'delete':
        if (confirm('¿Seguro que quieres eliminar este trabajo? Esta accion no se puede deshacer.')) {
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/gigs?id=eq.${job.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
              }
            })
            setJobs(prev => prev.filter(j => j.id !== job.id))
          } catch (err) {
            console.error('Error deleting job:', err)
          }
        }
        break

      case 'share':
        const shareUrl = `${window.location.origin}/gig/${job.id}`
        navigator.clipboard.writeText(shareUrl)
        alert('Link copiado al portapapeles!')
        break

      case 'boost':
        setSelectedJob(job)
        setShowBoostModal(true)
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando trabajos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/company/dashboard')}
                className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold">Mis Gigs</h1>
                <p className="text-xs text-neutral-500">{jobs.length} trabajos · {totalApplicants} aplicantes</p>
              </div>
            </div>

            <Link
              href="/company/jobs/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-500">●</span>
              <span className="text-sm text-neutral-400">Activos</span>
            </div>
            <p className="text-2xl font-bold">{jobCounts.active}</p>
          </div>
          <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-500">●</span>
              <span className="text-sm text-neutral-400">Borradores</span>
            </div>
            <p className="text-2xl font-bold">{jobCounts.draft}</p>
          </div>
          <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-neutral-500">●</span>
              <span className="text-sm text-neutral-400">Archivados</span>
            </div>
            <p className="text-2xl font-bold">{jobCounts.archived}</p>
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="px-4 pb-4">
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar trabajos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition ${viewMode === 'cards' ? 'bg-neutral-700 text-white' : 'text-neutral-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-neutral-700 text-white' : 'text-neutral-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-neutral-900 rounded-xl p-1">
          {(['active', 'draft', 'archived'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === tab
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab === 'active' ? 'Activos' : tab === 'draft' ? 'Borradores' : 'Archivados'}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab ? 'bg-black text-white' : 'bg-neutral-700'
              }`}>
                {jobCounts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="px-4">
        {filteredJobs.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="space-y-3">
              {filteredJobs.map(job => (
                <div
                  key={job.id}
                  className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 hover:border-neutral-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/company/jobs/${job.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          job.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-neutral-700 text-neutral-400'
                        }`}>
                          {job.status === 'active' ? 'Activo' : job.status === 'draft' ? 'Borrador' : 'Archivado'}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-sm line-clamp-2 mb-3">{job.description}</p>
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.applicants_count} aplicantes
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {getTimeAgo(job.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.budget}
                        </span>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative" ref={menuOpen === job.id ? menuRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === job.id ? null : job.id)
                        }}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition"
                      >
                        <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {menuOpen === job.id && (
                        <div className="absolute right-0 top-10 w-48 bg-neutral-800 rounded-xl shadow-xl border border-neutral-700 py-1 z-20">
                          <button
                            onClick={() => handleMenuAction('edit', job)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => handleMenuAction('duplicate', job)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Duplicar
                          </button>
                          <button
                            onClick={() => handleMenuAction('share', job)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Compartir
                          </button>
                          <button
                            onClick={() => handleMenuAction('boost', job)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 text-yellow-400"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Boost
                          </button>
                          <div className="border-t border-neutral-700 my-1" />
                          {job.status !== 'active' && (
                            <button
                              onClick={() => handleMenuAction('activate', job)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 text-green-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Activar
                            </button>
                          )}
                          {job.status === 'active' && (
                            <button
                              onClick={() => handleMenuAction('archive', job)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Archivar
                            </button>
                          )}
                          <button
                            onClick={() => handleMenuAction('delete', job)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Titulo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Aplicantes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Presupuesto</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Creado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(job => (
                    <tr
                      key={job.id}
                      className="border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer"
                      onClick={() => router.push(`/company/jobs/${job.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{job.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          job.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-neutral-700 text-neutral-400'
                        }`}>
                          {job.status === 'active' ? 'Activo' : job.status === 'draft' ? 'Borrador' : 'Archivado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">{job.applicants_count}</td>
                      <td className="px-4 py-3 text-neutral-400">{job.budget}</td>
                      <td className="px-4 py-3 text-neutral-500 text-sm">{getTimeAgo(job.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpen(menuOpen === job.id ? null : job.id)
                            }}
                            className="p-1 hover:bg-neutral-700 rounded"
                          >
                            <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Empty State */
          <div className="bg-neutral-900 rounded-2xl p-12 border border-neutral-800 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold mb-2">
              {searchQuery ? 'No se encontraron trabajos' : 'No hay trabajos aqui'}
            </h2>
            <p className="text-neutral-500 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? 'Intenta con otros terminos de busqueda'
                : activeTab === 'active'
                  ? 'Crea tu primer trabajo para empezar a recibir aplicantes'
                  : 'Los trabajos apareceran aqui cuando los crees o cambies su estado'
              }
            </p>

            {!searchQuery && activeTab === 'active' && (
              <Link
                href="/company/jobs/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Nuevo Trabajo
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Boost Modal */}
      {showBoostModal && selectedJob && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowBoostModal(false)}>
          <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Boost Tu Trabajo</h2>
              <button onClick={() => setShowBoostModal(false)} className="p-2 hover:bg-neutral-800 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-neutral-400 text-sm mb-6">
              Aumenta la visibilidad de "{selectedJob.title}" con estas opciones de boost.
            </p>

            <div className="space-y-3">
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 hover:border-yellow-500/50 transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                      <h3 className="font-semibold">Push Notification</h3>
                      <p className="text-xs text-neutral-400">Notifica a todos los creadores</p>
                    </div>
                  </div>
                  <span className="text-yellow-400 font-bold">$100</span>
                </div>
              </div>

              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 hover:border-yellow-500/50 transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <h3 className="font-semibold">Staff Pick (1 Semana)</h3>
                      <p className="text-xs text-neutral-400">Destacado en la seccion principal</p>
                    </div>
                  </div>
                  <span className="text-yellow-400 font-bold">$100</span>
                </div>
              </div>

              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 hover:border-yellow-500/50 transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <div>
                      <h3 className="font-semibold">Top del Feed (1 Semana)</h3>
                      <p className="text-xs text-neutral-400">Aparece primero en busquedas</p>
                    </div>
                  </div>
                  <span className="text-yellow-400 font-bold">$100</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-500 text-center mt-4">
              Los pagos se procesan de forma segura. Contacta soporte para mas informacion.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          <button onClick={() => router.push('/company/dashboard')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-xs">Dashboard</span>
          </button>
          <div className="flex flex-col items-center space-y-1 text-blue-500">
            <span className="text-lg">💼</span>
            <span className="text-xs font-medium">Mis Gigs</span>
          </div>
          <button onClick={() => router.push('/company/analytics')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">📈</span>
            <span className="text-xs">Analytics</span>
          </button>
          <button onClick={() => router.push('/company/applicants')} className="flex flex-col items-center space-y-1 text-neutral-500 hover:text-white transition-colors">
            <span className="text-lg">👥</span>
            <span className="text-xs">Aplicantes</span>
          </button>
        </div>
        <div className="h-1 bg-white mx-auto w-32 rounded-full mb-2" />
      </div>
    </div>
  )
}
