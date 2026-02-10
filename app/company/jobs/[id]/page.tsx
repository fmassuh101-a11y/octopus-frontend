'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Job {
  id: string
  title: string
  description: string
  budget_min: number
  budget_max: number
  budget_currency: string
  category: string
  requirements: string
  platforms: string[]
  status: string
  location: string
  remote: boolean
  deadline: string
  created_at: string
  company_id: string
}

interface Application {
  id: string
  creator_id: string
  status: string
  cover_letter: string
  proposed_rate: number
  created_at: string
  creator_name?: string
  creator_avatar?: string
  creator_location?: string
}

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'applicants'>('details')

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  const loadJobDetails = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      // Load job details
      const jobRes = await fetch(
        `${SUPABASE_URL}/rest/v1/gigs?id=eq.${jobId}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (jobRes.ok) {
        const jobs = await jobRes.json()
        if (jobs.length > 0) {
          setJob(jobs[0])
        }
      }

      // Load applications
      const appsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?gig_id=eq.${jobId}&select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (appsRes.ok) {
        const appsData = await appsRes.json()

        // Load creator profiles
        if (appsData.length > 0) {
          const creatorIds = appsData.map((a: Application) => a.creator_id)
          const profilesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,avatar_url,location`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
              }
            }
          )

          if (profilesRes.ok) {
            const profiles = await profilesRes.json()
            const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]))

            appsData.forEach((app: Application) => {
              const profile = profileMap.get(app.creator_id)
              if (profile) {
                app.creator_name = profile.full_name || 'Sin nombre'
                app.creator_avatar = profile.avatar_url
                app.creator_location = profile.location
              }
            })
          }
        }

        setApplications(appsData)
      }
    } catch (err) {
      console.error('Error loading job:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      await fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${appId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      )

      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, status: newStatus } : app
      ))
    } catch (err) {
      console.error('Error updating application:', err)
    }
  }

  const updateJobStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token || !job) return

      await fetch(
        `${SUPABASE_URL}/rest/v1/gigs?id=eq.${job.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      )

      setJob(prev => prev ? { ...prev, status: newStatus } : null)
    } catch (err) {
      console.error('Error updating job:', err)
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays < 7) return `hace ${diffDays} dias`
    return `hace ${Math.floor(diffDays / 7)} semanas`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">No se encontro el trabajo</p>
          <button
            onClick={() => router.push('/company/jobs')}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg"
          >
            Volver a Mis Gigs
          </button>
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
                onClick={() => router.push('/company/jobs')}
                className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center hover:bg-neutral-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold line-clamp-1">{job.title}</h1>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    job.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    job.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-neutral-700 text-neutral-400'
                  }`}>
                    {job.status === 'active' ? 'Activo' : job.status === 'draft' ? 'Borrador' : 'Archivado'}
                  </span>
                  <span className="text-xs text-neutral-500">{applications.length} aplicantes</span>
                </div>
              </div>
            </div>

            <Link
              href={`/company/jobs/${job.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-4">
        <div className="flex bg-neutral-900 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'details' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Detalles
          </button>
          <button
            onClick={() => setActiveTab('applicants')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === 'applicants' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Aplicantes
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'applicants' ? 'bg-black text-white' : 'bg-neutral-700'
            }`}>
              {applications.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === 'details' ? (
          <div className="space-y-4">
            {/* Job Info Card */}
            <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
              <h2 className="text-lg font-semibold mb-4">Informacion del Trabajo</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-500 uppercase">Descripcion</label>
                  <p className="text-neutral-300 mt-1">{job.description || 'Sin descripcion'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Presupuesto</label>
                    <p className="text-white font-medium mt-1">
                      ${job.budget_min || 0} - ${job.budget_max || 0} {job.budget_currency || 'USD'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Categoria</label>
                    <p className="text-white mt-1">{job.category || 'Sin categoria'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Ubicacion</label>
                    <p className="text-white mt-1">{job.remote ? 'Remoto' : job.location || 'No especificada'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Fecha Limite</label>
                    <p className="text-white mt-1">{job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Sin fecha limite'}</p>
                  </div>
                </div>

                {job.platforms && job.platforms.length > 0 && (
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Plataformas</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.platforms.map((platform, i) => (
                        <span key={i} className="px-3 py-1 bg-neutral-800 rounded-full text-sm">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.requirements && (
                  <div>
                    <label className="text-xs text-neutral-500 uppercase">Requisitos</label>
                    <p className="text-neutral-300 mt-1">{job.requirements}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
              <h2 className="text-lg font-semibold mb-4">Acciones</h2>

              <div className="space-y-3">
                {job.status === 'draft' && (
                  <button
                    onClick={() => updateJobStatus('active')}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition"
                  >
                    Publicar Trabajo
                  </button>
                )}

                {job.status === 'active' && (
                  <button
                    onClick={() => updateJobStatus('archived')}
                    className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition"
                  >
                    Archivar Trabajo
                  </button>
                )}

                {job.status === 'archived' && (
                  <button
                    onClick={() => updateJobStatus('active')}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition"
                  >
                    Reactivar Trabajo
                  </button>
                )}

                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/gig/${job.id}`
                    navigator.clipboard.writeText(shareUrl)
                    alert('Link copiado!')
                  }}
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartir Link
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Applicants Tab */
          <div className="space-y-3">
            {applications.length > 0 ? (
              applications.map(app => (
                <div
                  key={app.id}
                  className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {app.creator_avatar ? (
                        <img src={app.creator_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{app.creator_name || 'Creador'}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-neutral-700 text-neutral-400'
                        }`}>
                          {app.status === 'pending' ? 'Pendiente' :
                           app.status === 'accepted' ? 'Aceptado' :
                           app.status === 'rejected' ? 'Rechazado' :
                           app.status}
                        </span>
                      </div>

                      {app.creator_location && (
                        <p className="text-sm text-neutral-500">{app.creator_location}</p>
                      )}

                      {app.cover_letter && (
                        <p className="text-sm text-neutral-400 mt-2 line-clamp-2">{app.cover_letter}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                        {app.proposed_rate && (
                          <span>${app.proposed_rate}</span>
                        )}
                        <span>{getTimeAgo(app.created_at)}</span>
                      </div>

                      {/* Actions */}
                      {app.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => updateApplicationStatus(app.id, 'accepted')}
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(app.id, 'rejected')}
                            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            Rechazar
                          </button>
                          <Link
                            href={`/company/creator/${app.creator_id}`}
                            className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            Ver Perfil
                          </Link>
                        </div>
                      )}

                      {app.status === 'accepted' && (
                        <div className="flex gap-2 mt-3">
                          <Link
                            href={`/company/contracts/new?application_id=${app.id}&creator_id=${app.creator_id}&gig_id=${job.id}`}
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition text-center"
                          >
                            Crear Contrato
                          </Link>
                          <Link
                            href={`/company/messages?application_id=${app.id}`}
                            className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            Mensaje
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-neutral-900 rounded-2xl p-12 border border-neutral-800 text-center">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Sin aplicantes aun</h3>
                <p className="text-neutral-500 text-sm">
                  {job.status === 'active'
                    ? 'Los creadores veran tu trabajo y comenzaran a aplicar pronto'
                    : 'Publica tu trabajo para empezar a recibir aplicantes'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
