'use client'

import { useState } from 'react'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { Camera, Clapperboard, Music2, Youtube } from 'lucide-react'

interface Deliverable {
  platform: string
  content_type: string
  quantity: number
  duration_seconds?: number
  description?: string
}

interface CreateContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (contract: any) => void
  applicationId?: string // opcional: contrato directo desde el chat/perfil
  gigId?: string
  companyId: string
  creatorId: string
  creatorName: string
  gigTitle?: string
}

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: Music2 },
  { id: 'instagram', name: 'Instagram', icon: Camera },
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'ugc', name: 'UGC (Sin publicar)', icon: Clapperboard },
]

const CONTENT_TYPES: Record<string, { id: string; name: string }[]> = {
  tiktok: [
    { id: 'video', name: 'Video' },
  ],
  instagram: [
    { id: 'reel', name: 'Reel' },
    { id: 'post', name: 'Post' },
    { id: 'story', name: 'Story' },
    { id: 'carousel', name: 'Carrusel' },
  ],
  youtube: [
    { id: 'video', name: 'Video' },
    { id: 'short', name: 'Short' },
  ],
  ugc: [
    { id: 'video', name: 'Video' },
    { id: 'photo', name: 'Foto' },
  ],
}

const CURRENCIES = [
  { id: 'USD', name: 'USD ($)', symbol: '$' },
  { id: 'MXN', name: 'MXN (Peso Mexicano)', symbol: '$' },
  { id: 'BRL', name: 'BRL (Real)', symbol: 'R$' },
  { id: 'COP', name: 'COP (Peso Colombiano)', symbol: '$' },
  { id: 'ARS', name: 'ARS (Peso Argentino)', symbol: '$' },
  { id: 'PEN', name: 'PEN (Sol)', symbol: 'S/' },
]

export default function CreateContractModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  gigId,
  companyId,
  creatorId,
  creatorName,
  gigTitle = 'Campaña'
}: CreateContractModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState(gigTitle)
  const [description, setDescription] = useState('')
  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    { platform: 'tiktok', content_type: 'video', quantity: 1 }
  ])
  const [paymentMode, setPaymentMode] = useState<'fijo' | 'cpm'>('cpm') // CPM por defecto (metodología Octopus)
  const [cpmRate, setCpmRate] = useState('')
  const [cpmMinViews, setCpmMinViews] = useState('1000')
  const [cpmMaxViews, setCpmMaxViews] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('USD')
  const [paymentTerms, setPaymentTerms] = useState('El pago se realizara una vez aprobado el contenido final.')
  const [contentDueDate, setContentDueDate] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [mentions, setMentions] = useState('')
  const [brandGuidelines, setBrandGuidelines] = useState('')
  const [usageRights, setUsageRights] = useState({
    platforms: ['organic'],
    duration_months: 12,
    paid_ads: false,
    whitelisting: false
  })
  const [exclusivity, setExclusivity] = useState({
    enabled: false,
    days: 30,
    competitors: ''
  })
  const [additionalTerms, setAdditionalTerms] = useState('')

  const addDeliverable = () => {
    setDeliverables([...deliverables, { platform: 'tiktok', content_type: 'video', quantity: 1 }])
  }

  const removeDeliverable = (index: number) => {
    if (deliverables.length > 1) {
      setDeliverables(deliverables.filter((_, i) => i !== index))
    }
  }

  const updateDeliverable = (index: number, field: keyof Deliverable, value: any) => {
    const updated = [...deliverables]
    updated[index] = { ...updated[index], [field]: value }
    // Reset content_type when platform changes
    if (field === 'platform') {
      updated[index].content_type = CONTENT_TYPES[value]?.[0]?.id || 'video'
    }
    setDeliverables(updated)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) throw new Error('No autorizado')

      // Check if there's already a contract for this creator from this company
      const existingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/contracts?company_id=eq.${companyId}&creator_id=eq.${creatorId}&status=neq.cancelled&status=neq.rejected&select=id,title,status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (existingRes.ok) {
        const existingContracts = await existingRes.json()
        if (existingContracts.length > 0) {
          const existing = existingContracts[0]
          setError(`Ya tienes un contrato activo con este creador: "${existing.title}" (${existing.status}). Solo puedes tener 1 contrato por persona.`)
          setLoading(false)
          return
        }
      }

      const contractData = {
        application_id: applicationId || null,
        gig_id: gigId || null,
        company_id: companyId,
        creator_id: creatorId,
        title,
        description,
        deliverables: JSON.stringify(deliverables),
        payment_amount: paymentMode === 'cpm' ? 0 : parseFloat(paymentAmount),
        payment_currency: paymentCurrency,
        payment_terms: paymentMode === 'cpm'
          ? `Pago por rendimiento (CPM): $${cpmRate} ${paymentCurrency} por cada 1.000 visitas válidas.${cpmMinViews ? ` Mínimo ${Number(cpmMinViews).toLocaleString('en-US')} visitas para elegibilidad.` : ''}${cpmMaxViews ? ` Tope de ${Number(cpmMaxViews).toLocaleString('en-US')} visitas por entregable.` : ''} Las visitas se miden en la plataforma social durante los 30 días posteriores a la publicación. El monto final se determina según las visitas reales.`
          : paymentTerms,
        content_due_date: contentDueDate || null,
        hashtags: hashtags ? hashtags.split(',').map(h => h.trim()) : [],
        mentions: mentions ? mentions.split(',').map(m => m.trim()) : [],
        brand_guidelines: brandGuidelines,
        usage_rights: JSON.stringify({ ...usageRights, payment_mode: paymentMode, cpm_rate: paymentMode === 'cpm' ? parseFloat(cpmRate) || 0 : undefined, cpm_min_views: paymentMode === 'cpm' ? parseInt(cpmMinViews) || 0 : undefined, cpm_max_views: paymentMode === 'cpm' && cpmMaxViews ? parseInt(cpmMaxViews) : undefined }),
        exclusivity_enabled: exclusivity.enabled,
        exclusivity_days: exclusivity.enabled ? exclusivity.days : 0,
        exclusivity_competitors: exclusivity.enabled && exclusivity.competitors
          ? exclusivity.competitors.split(',').map(c => c.trim())
          : [],
        additional_terms: additionalTerms,
        status: 'sent',
        sent_at: new Date().toISOString(),
        company_signed_at: new Date().toISOString()
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(contractData)
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Error al crear contrato')
      }

      const [contract] = await response.json()
      console.log('Contract created successfully:', contract)

      // El contrato aparece EN EL CHAT (mensaje por Whop, con cita del gig).
      // Si el envío falla, SE AVISA (nunca en silencio).
      const pagoTxt = paymentMode === 'cpm'
        ? `$${cpmRate} por cada 1.000 visitas`
        : `${CURRENCIES.find(c => c.id === paymentCurrency)?.symbol || '$'}${paymentAmount} ${paymentCurrency}`
      try {
        const dmRes = await fetch('/api/whop/dm/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            userId: creatorId,
            gigId: gigId || undefined,
            // Un link fijo (no window.location.origin) — este mensaje lo
            // lee la otra persona después, en OTRA sesión/dispositivo, así
            // que no puede depender de en qué dominio estaba el que lo
            // mandó. Usa NEXT_PUBLIC_APP_URL — la misma variable que ya usan
            // /api/whop/dm/send, /c/[id] y /k/[id] — para que el link que se
            // arma acá y la página que lo recibe sean siempre el mismo
            // dominio (antes, con window.location.origin, a veces quedaba
            // en un dominio distinto al que la otra persona tenía abierto y
            // Safari lo trataba como "salir de la app").
            content: `Te envié un contrato: "${title}" (${pagoTxt}). Revísalo y acéptalo aquí: ${process.env.NEXT_PUBLIC_APP_URL || 'https://octopus-frontend-tau.vercel.app'}/k/${contract?.id || ""}`,
          })
        })
        const dmData = await dmRes.json().catch(() => ({}))
        if (!dmRes.ok || !dmData.ok) {
          alert(`Contrato creado, pero el mensaje al chat falló: ${dmData.error || 'reintentá desde Mensajes'}`)
        } else {
          alert(`Contrato "${title}" enviado a ${creatorName} (revisá el chat)`)
        }
      } catch {
        alert('Contrato creado, pero el mensaje al chat falló')
      }

      onSuccess(contract)
      onClose()
    } catch (err: any) {
      console.error('Error creating contract:', err)
      setError(err.message || 'Error al crear el contrato')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Crear Contrato</h2>
            <p className="text-sm text-neutral-400">Para: {creatorName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 border-b border-neutral-800 flex gap-2">
          {['Entregables', 'Pago', 'Terminos'].map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i + 1)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                step === i + 1
                  ? 'bg-emerald-600 text-white'
                  : step > i + 1
                  ? 'bg-green-600/20 text-green-400'
                  : 'bg-neutral-800 text-neutral-400'
              } placeholder-neutral-500`}
            >
              {step > i + 1 && ''}{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Deliverables */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Titulo del Contrato
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Campaña de lanzamiento producto X"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Descripcion (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente la campaña..."
                  rows={2}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-neutral-300">
                    Entregables
                  </label>
                  <button
                    onClick={addDeliverable}
                    className="text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    + Agregar otro
                  </button>
                </div>

                <div className="space-y-3">
                  {deliverables.map((del, index) => (
                    <div key={index} className="p-4 bg-neutral-800/50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Entregable {index + 1}</span>
                        {deliverables.length > 1 && (
                          <button
                            onClick={() => removeDeliverable(index)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Plataforma</label>
                          <select
                            value={del.platform}
                            onChange={(e) => updateDeliverable(index, 'platform', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                          >
                            {PLATFORMS.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Tipo</label>
                          <select
                            value={del.content_type}
                            onChange={(e) => updateDeliverable(index, 'content_type', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                          >
                            {(CONTENT_TYPES[del.platform] || []).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={del.quantity}
                            onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Fecha limite de entrega
                </label>
                <input
                  type="date"
                  value={contentDueDate}
                  onChange={(e) => setContentDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Modo de pago: CPM (por visitas, metodología Octopus) o monto fijo */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Modo de pago</label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-800 p-1">
                  <button type="button" onClick={() => setPaymentMode('cpm')}
                    className={`rounded-lg py-2.5 text-sm font-bold transition ${paymentMode === 'cpm' ? 'bg-emerald-600 text-white' : 'text-neutral-400'}`}>
                    Por CPM (visitas)
                  </button>
                  <button type="button" onClick={() => setPaymentMode('fijo')}
                    className={`rounded-lg py-2.5 text-sm font-bold transition ${paymentMode === 'fijo' ? 'bg-emerald-600 text-white' : 'text-neutral-400'}`}>
                    Monto fijo
                  </button>
                </div>
                {paymentMode === 'cpm' && (
                  <p className="mt-2 text-xs text-neutral-500">El monto final se calcula con las visitas reales del video (se pagan al medirse, no por adelantado).</p>
                )}
              </div>

              {paymentMode === 'cpm' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">CPM (USD / 1.000 visitas)</label>
                    <input type="number" min="0" step="0.01" value={cpmRate} onChange={(e) => setCpmRate(e.target.value)} placeholder="1.00"
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Mínimo de visitas</label>
                    <input type="number" min="0" value={cpmMinViews} onChange={(e) => setCpmMinViews(e.target.value)} placeholder="1000"
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Tope de visitas (opcional)</label>
                    <input type="number" min="0" value={cpmMaxViews} onChange={(e) => setCpmMaxViews(e.target.value)} placeholder="500000"
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}

              <div className={paymentMode === 'cpm' ? 'hidden' : 'grid grid-cols-2 gap-4'}>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Monto a Pagar
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Moneda
                  </label>
                  <select
                    value={paymentCurrency}
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Terminos de Pago
                </label>
                <textarea
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Describe cuando y como se realizara el pago..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <h4 className="font-medium text-emerald-300 mb-2">Derechos de Uso</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usageRights.paid_ads}
                      onChange={(e) => setUsageRights({ ...usageRights, paid_ads: e.target.checked })}
                      className="w-5 h-5 rounded bg-neutral-700 border-neutral-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-neutral-300">Uso en anuncios pagados (Paid Ads)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usageRights.whitelisting}
                      onChange={(e) => setUsageRights({ ...usageRights, whitelisting: e.target.checked })}
                      className="w-5 h-5 rounded bg-neutral-700 border-neutral-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-neutral-300">Whitelisting (publicar desde cuenta del creador)</span>
                  </label>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Duracion de derechos (meses)</label>
                    <select
                      value={usageRights.duration_months}
                      onChange={(e) => setUsageRights({ ...usageRights, duration_months: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                      <option value={24}>24 meses</option>
                      <option value={999}>Perpetuo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Terms */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Hashtags Requeridos
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#ad, #sponsored, #miMarca"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-neutral-500 mt-1">Separados por comas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Menciones Requeridas
                </label>
                <input
                  type="text"
                  value={mentions}
                  onChange={(e) => setMentions(e.target.value)}
                  placeholder="@miMarca, @otraCuenta"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-neutral-500 mt-1">Separados por comas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Instrucciones para el Creador
                </label>
                <textarea
                  value={brandGuidelines}
                  onChange={(e) => setBrandGuidelines(e.target.value)}
                  placeholder="Describe el tono, estilo, que incluir, que evitar..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={exclusivity.enabled}
                    onChange={(e) => setExclusivity({ ...exclusivity, enabled: e.target.checked })}
                    className="w-5 h-5 rounded bg-neutral-700 border-neutral-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="font-medium text-amber-300">Exclusividad</span>
                </label>
                {exclusivity.enabled && (
                  <div className="space-y-3 pl-8">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Dias de exclusividad</label>
                      <input
                        type="number"
                        min="1"
                        value={exclusivity.days}
                        onChange={(e) => setExclusivity({ ...exclusivity, days: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Competidores (opcional)</label>
                      <input
                        type="text"
                        value={exclusivity.competitors}
                        onChange={(e) => setExclusivity({ ...exclusivity, competitors: e.target.value })}
                        placeholder="Marca A, Marca B"
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Terminos Adicionales (opcional)
                </label>
                <textarea
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  placeholder="Cualquier termino o condicion adicional..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Legal Notice */}
              <div className="p-4 bg-neutral-800 rounded-xl">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Al enviar este contrato, aceptas los terminos de servicio de Octopus.
                  El contrato incluira automaticamente clausulas de cesion de derechos,
                  confidencialidad y cumplimiento con las regulaciones de publicidad de LATAM.
                  Las firmas electronicas son legalmente validas en Mexico, Brasil, Colombia,
                  Argentina y Peru.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
          >
            {step > 1 ? 'Atras' : 'Cancelar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !title || (paymentMode === "cpm" ? !cpmRate : !paymentAmount)}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar Contrato
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
