'use client'

import { useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Contract {
  id: string
  title: string
  application_id: string
  gig_id: string
  company_id: string
  creator_id: string
  payment_amount: number
  payment_currency: string
  deliverables: any[]
}

interface CreateDeliveryModalProps {
  contract: Contract
  onClose: () => void
  onCreated: (delivery: any) => void
}

export default function CreateDeliveryModal({ contract, onClose, onCreated }: CreateDeliveryModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: contract.title,
    description: '',
    video_url: '',
    thumbnail_url: '',
    platform: contract.deliverables[0]?.platform || 'tiktok',
    content_type: contract.deliverables[0]?.content_type || 'video'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.video_url.trim()) {
      alert('Por favor ingresa la URL del video')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')
      if (!token || !userStr) throw new Error('No autorizado')

      const user = JSON.parse(userStr)

      // Create the delivery
      const response = await fetch(`${SUPABASE_URL}/rest/v1/content_deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          application_id: contract.application_id,
          contract_id: contract.id,
          creator_id: contract.creator_id,
          company_id: contract.company_id,
          gig_id: contract.gig_id,
          title: form.title,
          description: form.description || null,
          video_url: form.video_url,
          thumbnail_url: form.thumbnail_url || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          payment_amount: contract.payment_amount,
          platform: form.platform,
          content_type: form.content_type,
          revision_count: 0,
          max_revisions: 3,
          feedback_history: []
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Error al crear entrega')
      }

      const [delivery] = await response.json()

      // Create notification for company
      await fetch(`${SUPABASE_URL}/rest/v1/delivery_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          delivery_id: delivery.id,
          recipient_id: contract.company_id,
          type: 'content_submitted',
          title: 'Nuevo contenido recibido',
          message: `Has recibido contenido para "${form.title}". Revisalo y aprueba o pide cambios.`
        })
      })

      onCreated(delivery)
      onClose()

    } catch (err: any) {
      console.error('Error creating delivery:', err)
      alert(err.message || 'Error al crear la entrega')
    } finally {
      setLoading(false)
    }
  }

  const PLATFORMS = [
    { id: 'tiktok', label: 'TikTok', icon: '🎵' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'youtube', label: 'YouTube', icon: '▶️' },
    { id: 'ugc', label: 'UGC', icon: '🎬' },
  ]

  const CONTENT_TYPES = [
    { id: 'video', label: 'Video' },
    { id: 'reel', label: 'Reel' },
    { id: 'story', label: 'Historia' },
    { id: 'post', label: 'Post' },
    { id: 'short', label: 'Short' },
  ]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Entregar Contenido</h2>
            <p className="text-sm text-neutral-400">Contrato: {contract.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Titulo de la entrega
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
              placeholder="Ej: Video TikTok - Unboxing producto"
            />
          </div>

          {/* Platform & Content Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Plataforma
              </label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Tipo
              </label>
              <select
                value={form.content_type}
                onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-violet-500"
              >
                {CONTENT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              URL del Video *
            </label>
            <input
              type="url"
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
              placeholder="https://drive.google.com/... o https://dropbox.com/..."
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              Google Drive, Dropbox, WeTransfer, o cualquier link publico
            </p>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              URL de Thumbnail (opcional)
            </label>
            <input
              type="url"
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
              placeholder="https://..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 resize-none"
              placeholder="Cualquier contexto o nota sobre el contenido..."
              rows={3}
            />
          </div>

          {/* Payment Info */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-400">Pago acordado:</span>
              <span className="font-bold text-green-400">
                ${contract.payment_amount.toLocaleString()} {contract.payment_currency}
              </span>
            </div>
            <p className="text-xs text-green-400/70 mt-1">
              Se liberara cuando la empresa apruebe el contenido
            </p>
          </div>

          {/* Info */}
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
            <p className="text-sm text-violet-300">
              Asegurate de que el link sea publico. La empresa tendra hasta 3 rondas de revision.
            </p>
          </div>
        </form>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.video_url.trim()}
            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Enviar Contenido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
