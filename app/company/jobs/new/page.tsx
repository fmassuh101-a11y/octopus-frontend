"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'
import { getActiveCompanyId } from '@/lib/workspace'
import { ensureFreshToken } from '@/lib/session'
import { Lightbulb } from 'lucide-react'

type PaymentType = "fixed" | "hourly" | "cpm"
type PaymentFrequency = "one_time" | "weekly" | "monthly"

interface JobFormData {
  title: string
  jobType: string
  description: string
  paymentType: PaymentType
  fixedAmount: string
  hourlyRate: string
  cpmRate: string
  paymentFrequency: PaymentFrequency
  estimatedHoursPerWeek: string
  requireInstagram: boolean
  requireTikTok: boolean
  requireAge21: boolean
  minFollowers: string
  jobImage: string | null
}

const initialFormData: JobFormData = {
  title: "",
  jobType: "",
  description: "",
  paymentType: "fixed",
  fixedAmount: "",
  hourlyRate: "",
  cpmRate: "",
  paymentFrequency: "one_time",
  estimatedHoursPerWeek: "",
  requireInstagram: false,
  requireTikTok: false,
  requireAge21: false,
  minFollowers: "",
  jobImage: null,
}

// Tipos de contenido que puede pedir una empresa (estilo SideShift)
const contentTypes = [
  { key: 'ugc', label: 'UGC', desc: 'Contenido original hecho por el creador', pay: 'fixed' },
  { key: 'clipping', label: 'Clipping', desc: 'Clips de tu contenido en su cuenta', pay: 'cpm' },
  { key: 'faceless', label: 'Faceless', desc: 'Contenido sin mostrar la cara', pay: 'fixed' },
  { key: 'social', label: 'Social Media Manager', desc: 'Gestiona tus redes', pay: 'fixed' },
  { key: 'slideshow', label: 'Slideshows', desc: 'Carruseles de fotos/imágenes', pay: 'fixed' },
  { key: 'review', label: 'Reseñas', desc: 'Reseña honesta de tu producto', pay: 'fixed' },
  { key: 'unboxing', label: 'Unboxing', desc: 'Video abriendo tu producto', pay: 'fixed' },
  { key: 'ambassador', label: 'Embajador de Marca', desc: 'Representa tu marca a largo plazo', pay: 'fixed' },
]

const steps = [
  { id: 1, name: "Detalles", icon: "1" },
  { id: 2, name: "Pago", icon: "2" },
  { id: 3, name: "Requisitos", icon: "3" },
  { id: 4, name: "Imagen", icon: "4" },
]

export default function NewJobPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<JobFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('campaign')
    if (p) setCampaignId(p)
  }, [])

  const updateFormData = (updates: Partial<JobFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Sanitiza montos: solo números, con tope razonable (nada de valores infinitos)
  const cleanAmount = (raw: string, max: number) => {
    let v = raw.replace(/[^0-9.]/g, '')
    const parts = v.split('.')
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
    if (v && parseFloat(v) > max) v = String(max)
    return v
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() && formData.jobType && formData.description.trim()
      case 2:
        if (formData.paymentType === "fixed") return formData.fixedAmount
        if (formData.paymentType === "hourly") return formData.hourlyRate
        if (formData.paymentType === "cpm") return formData.cpmRate
        return false
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const getBudgetString = () => {
    if (formData.paymentType === "fixed") {
      const freq = formData.paymentFrequency === "one_time" ? "" :
        formData.paymentFrequency === "weekly" ? "/semana" : "/mes"
      return `$${formData.fixedAmount}${freq}`
    }
    if (formData.paymentType === "hourly") {
      return `$${formData.hourlyRate}/hora`
    }
    if (formData.paymentType === "cpm") {
      return `$${formData.cpmRate} CPM`
    }
    return ""
  }

  const getRequirementsString = () => {
    const reqs = []
    if (formData.requireInstagram) reqs.push("Instagram requerido")
    if (formData.requireTikTok) reqs.push("TikTok requerido")
    if (formData.requireAge21) reqs.push("21+ anos")
    if (formData.minFollowers) reqs.push(`${formData.minFollowers}+ seguidores`)
    return reqs.join(", ") || undefined
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      const token = await ensureFreshToken()
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)

      // Obtener el nombre de la empresa del perfil
      let companyName = 'Empresa'
      try {
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${getActiveCompanyId(userData.id)}&select=company_name,full_name`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            }
          }
        )
        if (profileResponse.ok) {
          const profiles = await profileResponse.json()
          if (profiles.length > 0) {
            companyName = profiles[0].company_name || profiles[0].full_name || 'Empresa'
          }
        }
      } catch (e) {
        console.log('Could not fetch company name:', e)
      }

      const gigData: any = {
        company_id: getActiveCompanyId(userData.id),
        company_name: companyName,
        title: formData.title,
        description: formData.description,
        budget: getBudgetString(),
        category: contentTypes.find(c => c.label === formData.jobType)?.key || 'ugc',
        requirements: getRequirementsString(),
        status: 'active'
      }

      // Si viene de una campaña, lo enlazamos como formato
      if (campaignId) {
        gigData.campaign_id = campaignId
      }

      // Agregar imagen si existe
      if (formData.jobImage) {
        gigData.image_url = formData.jobImage
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/gigs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(gigData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Error al crear la campana')
      }

      router.push(campaignId ? `/company/campaigns/${campaignId}` : "/company/campaigns")
    } catch (error: any) {
      console.error('Error creating gig:', error)
      setError(error.message || 'Error al crear la campana')
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateFormData({ jobImage: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/company/campaigns")}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">O</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
              Nueva Campana
            </span>
          </div>

          <div className="text-sm text-neutral-500">
            Paso {currentStep}/4
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Progress */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 bg-neutral-900 rounded-2xl p-6 shadow-lg border border-neutral-800 text-white placeholder-neutral-500">
              <h3 className="font-semibold text-white mb-6">Progreso</h3>
              <div className="space-y-1">
                {steps.map((step, index) => (
                  <div key={step.id} className="relative">
                    <button
                      onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                      disabled={step.id > currentStep}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        step.id === currentStep
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-500 text-white shadow-lg shadow-emerald-200"
                          : step.id < currentStep
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-neutral-950 text-neutral-500"
                      } placeholder-neutral-500`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        step.id === currentStep
                          ? "bg-neutral-900/20"
                          : step.id < currentStep
                          ? "bg-green-200"
                          : "bg-neutral-800"
                      } text-white placeholder-neutral-500`}>
                        {step.id < currentStep ? "" : step.icon}
                      </span>
                      <span className="font-medium text-sm">{step.name}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`absolute left-6 top-14 w-0.5 h-4 ${
                        step.id < currentStep ? "bg-green-300" : "bg-neutral-800"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            {/* Mobile Progress Bar */}
            <div className="lg:hidden mb-6">
              <div className="flex gap-1">
                {steps.map(step => (
                  <div
                    key={step.id}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      step.id <= currentStep
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-500"
                        : "bg-neutral-800"
                    } text-white placeholder-neutral-500`}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                  {currentStep}
                </span>
                <span className="font-semibold text-white">{steps[currentStep - 1].name}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            {/* Form Container */}
            <div className="bg-neutral-900 rounded-2xl shadow-xl border border-neutral-800 overflow-hidden text-white placeholder-neutral-500">
              <div className="p-6 sm:p-8">
                {/* Step 1: Job Details */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Detalles del trabajo</h2>
                      <p className="text-neutral-500">Describe que tipo de contenido necesitas</p>
                    </div>

                    {/* Tipo de contenido (estilo SideShift) */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-200 mb-2">
                        Tipo de contenido *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {contentTypes.map(ct => (
                          <button
                            key={ct.key}
                            type="button"
                            onClick={() => updateFormData({ jobType: ct.label, paymentType: ct.pay as PaymentType })}
                            className={`text-left p-3 rounded-xl border transition-all ${
                              formData.jobType === ct.label
                                ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                                : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                            }`}
                          >
                            <span className="block font-semibold text-white text-sm mb-0.5">{ct.label}</span>
                            <span className="block text-[11px] leading-tight text-neutral-400">{ct.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-neutral-200 mb-2">
                          Titulo del trabajo *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => updateFormData({ title: e.target.value })}
                          placeholder="ej. Creador UGC para marca de skincare"
                          className="w-full px-4 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white placeholder-neutral-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-200 mb-2">
                          Descripcion *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={e => updateFormData({ description: e.target.value })}
                          placeholder="Describe el trabajo, requisitos, entregables y que hace especial a tu marca..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white placeholder-neutral-500 resize-none"
                        />
                        <p className="mt-2 text-sm text-neutral-500">
                          {formData.description.length} caracteres
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Payment */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Como vas a pagar?</h2>
                      <p className="text-neutral-500">Elige el modelo de pago que mejor te funcione</p>
                    </div>

                    {/* Payment Type Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Fixed Payment */}
                      <button
                        onClick={() => updateFormData({ paymentType: "fixed" })}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.paymentType === "fixed"
                            ? "border-emerald-500 bg-emerald-50 shadow-lg"
                            : "border-neutral-800 hover:border-emerald-200 hover:bg-neutral-950"
                        } text-white placeholder-neutral-500`}
                      >
                        {formData.paymentType === "fixed" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mb-3 text-white font-bold text-xl">
                          $
                        </div>
                        <h3 className="font-bold text-white">Precio Fijo</h3>
                        <p className="text-sm text-neutral-500 mt-1">Pago unico por entrega</p>
                      </button>

                      {/* Hourly */}
                      <button
                        onClick={() => updateFormData({ paymentType: "hourly" })}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.paymentType === "hourly"
                            ? "border-emerald-500 bg-emerald-50 shadow-lg"
                            : "border-neutral-800 hover:border-emerald-200 hover:bg-neutral-950"
                        } text-white placeholder-neutral-500`}
                      >
                        {formData.paymentType === "hourly" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="font-bold text-white">Por Hora</h3>
                        <p className="text-sm text-neutral-500 mt-1">Trabajo continuo por horas</p>
                      </button>

                      {/* CPM */}
                      <button
                        onClick={() => updateFormData({ paymentType: "cpm" })}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.paymentType === "cpm"
                            ? "border-emerald-500 bg-emerald-50 shadow-lg"
                            : "border-neutral-800 hover:border-emerald-200 hover:bg-neutral-950"
                        } text-white placeholder-neutral-500`}
                      >
                        {formData.paymentType === "cpm" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2">
                          <span className="px-2 py-1 bg-gradient-to-r from-orange-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">
                            NUEVO
                          </span>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <h3 className="font-bold text-white">CPM</h3>
                        <p className="text-sm text-neutral-500 mt-1">Pago por 1,000 vistas</p>
                      </button>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-neutral-950 rounded-2xl p-6 space-y-5">
                      {formData.paymentType === "fixed" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-neutral-200 mb-2">
                              Cantidad a pagar *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">$</span>
                              <input
                                type="number"
                                value={formData.fixedAmount}
                                onChange={e => updateFormData({ fixedAmount: cleanAmount(e.target.value, 1000000) })}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-neutral-200 mb-2">
                              Frecuencia de pago
                            </label>
                            <div className="flex gap-2">
                              {[
                                { value: "one_time", label: "Una vez" },
                                { value: "weekly", label: "Semanal" },
                                { value: "monthly", label: "Mensual" },
                              ].map(option => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => updateFormData({ paymentFrequency: option.value as PaymentFrequency })}
                                  className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                                    formData.paymentFrequency === option.value
                                      ? "bg-emerald-500 text-white shadow-lg"
                                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:border-emerald-300"
                                  } placeholder-neutral-500`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {formData.paymentType === "hourly" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-neutral-200 mb-2">
                              Tarifa por hora *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">$</span>
                              <input
                                type="number"
                                value={formData.hourlyRate}
                                onChange={e => updateFormData({ hourlyRate: cleanAmount(e.target.value, 10000) })}
                                placeholder="0.00"
                                className="w-full pl-8 pr-16 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">/hora</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-neutral-200 mb-2">
                              Horas estimadas por semana
                            </label>
                            <input
                              type="number"
                              value={formData.estimatedHoursPerWeek}
                              onChange={e => updateFormData({ estimatedHoursPerWeek: e.target.value })}
                              placeholder="10"
                              className="w-full px-4 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white"
                            />
                          </div>
                        </>
                      )}

                      {formData.paymentType === "cpm" && (
                        <div>
                          <label className="block text-sm font-semibold text-neutral-200 mb-2">
                            Tarifa por 1,000 vistas *
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">$</span>
                            <input
                              type="number"
                              value={formData.cpmRate}
                              onChange={e => updateFormData({ cpmRate: cleanAmount(e.target.value, 50) })}
                              placeholder="5.00"
                              className="w-full pl-8 pr-28 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">/1K vistas</span>
                          </div>
                          <div className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                              <div>
                                <p className="font-medium text-white">Pago por rendimiento</p>
                                <p className="text-sm text-neutral-400 mt-1">
                                  Paga solo por resultados. Si un creador obtiene 100K vistas a ${formData.cpmRate || "5"}/1K,
                                  pagas ${((parseFloat(formData.cpmRate || "5") * 100) || 500).toFixed(2)}.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Requirements */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Requisitos del creador</h2>
                      <p className="text-neutral-500">Define que necesitan los creadores para aplicar</p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-neutral-950 rounded-2xl divide-y divide-neutral-800">
                        {/* Instagram */}
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-500 to-orange-400 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-white">Requiere Instagram</p>
                              <p className="text-sm text-neutral-500">El creador debe tener Instagram conectado</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ requireInstagram: !formData.requireInstagram })}
                            className={`relative w-14 h-8 rounded-full transition-all ${
                              formData.requireInstagram ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-neutral-900 rounded-full shadow-md transition-all ${
                              formData.requireInstagram ? "left-7" : "left-1"
                            } text-white placeholder-neutral-500`} />
                          </button>
                        </div>

                        {/* TikTok */}
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-white">Requiere TikTok</p>
                              <p className="text-sm text-neutral-500">El creador debe tener TikTok conectado</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ requireTikTok: !formData.requireTikTok })}
                            className={`relative w-14 h-8 rounded-full transition-all ${
                              formData.requireTikTok ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-neutral-900 rounded-full shadow-md transition-all ${
                              formData.requireTikTok ? "left-7" : "left-1"
                            } text-white placeholder-neutral-500`} />
                          </button>
                        </div>

                        {/* Age 21+ */}
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                              21+
                            </div>
                            <div>
                              <p className="font-semibold text-white">Requiere 21+ anos</p>
                              <p className="text-sm text-neutral-500">Para alcohol o contenido restringido</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ requireAge21: !formData.requireAge21 })}
                            className={`relative w-14 h-8 rounded-full transition-all ${
                              formData.requireAge21 ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-neutral-900 rounded-full shadow-md transition-all ${
                              formData.requireAge21 ? "left-7" : "left-1"
                            } text-white placeholder-neutral-500`} />
                          </button>
                        </div>
                      </div>

                      {/* Minimum Followers */}
                      <div className="bg-neutral-950 rounded-2xl p-5">
                        <label className="block text-sm font-semibold text-neutral-200 mb-3">
                          Minimo de seguidores (opcional)
                        </label>
                        <input
                          type="number"
                          value={formData.minFollowers}
                          onChange={e => updateFormData({ minFollowers: e.target.value })}
                          placeholder="1000"
                          className="w-full px-4 py-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-neutral-900 text-white"
                        />
                        <p className="mt-2 text-sm text-neutral-500">
                          Dejalo vacio para aceptar creadores de cualquier tamano
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Image */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Imagen del trabajo</h2>
                      <p className="text-neutral-500">Agrega una imagen atractiva para tu publicacion</p>
                    </div>

                    <div className="space-y-4">
                      {formData.jobImage ? (
                        <div className="relative">
                          <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-800">
                            <img
                              src={formData.jobImage}
                              alt="Vista previa"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ jobImage: null })}
                            className="absolute top-3 right-3 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-video rounded-2xl border-2 border-dashed border-neutral-700 hover:border-emerald-400 bg-neutral-950 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-4 text-white placeholder-neutral-500"
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-neutral-200">Haz clic para subir imagen</p>
                            <p className="text-sm text-neutral-500 mt-1">PNG, JPG hasta 5MB</p>
                          </div>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden bg-neutral-900 text-white placeholder-neutral-500"
                      />

                      <p className="text-center text-sm text-neutral-500">
                        La imagen es opcional - usaremos una por defecto si no subes una
                      </p>
                    </div>

                    {/* Preview Card */}
                    <div className="mt-8 bg-neutral-950 rounded-2xl p-6">
                      <h4 className="text-sm font-semibold text-neutral-500 mb-4">VISTA PREVIA</h4>
                      <div className="bg-neutral-900 rounded-xl p-4 shadow-sm border border-neutral-800 text-white placeholder-neutral-500">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                            {formData.jobImage ? (
                              <img src={formData.jobImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl font-bold text-emerald-500">O</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-white">{formData.title || "Titulo del trabajo"}</h3>
                            <p className="text-sm text-neutral-500">{formData.jobType || "Tipo de trabajo"}</p>
                            <div className="mt-2">
                              {formData.paymentType === "fixed" && formData.fixedAmount && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  ${formData.fixedAmount} {formData.paymentFrequency === "one_time" ? "" : `/${formData.paymentFrequency === "weekly" ? "sem" : "mes"}`}
                                </span>
                              )}
                              {formData.paymentType === "hourly" && formData.hourlyRate && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                  ${formData.hourlyRate}/hr
                                </span>
                              )}
                              {formData.paymentType === "cpm" && formData.cpmRate && (
                                <span className="px-2 py-1 bg-gradient-to-r from-orange-100 to-emerald-100 text-orange-700 text-xs font-medium rounded-full">
                                  ${formData.cpmRate} CPM
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error visible cerca del botón */}
              {error && currentStep === 4 && (
                <div className="px-6 sm:px-8 pt-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                </div>
              )}

              {/* Footer Navigation */}
              <div className="px-6 sm:px-8 py-5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 text-neutral-400 font-medium hover:text-white transition-colors"
                  >
                    Atras
                  </button>
                ) : (
                  <Link
                    href="/company/campaigns"
                    className="px-6 py-3 text-neutral-400 font-medium hover:text-white transition-colors"
                  >
                    Cancelar
                  </Link>
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                      canProceed()
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    } placeholder-neutral-500`}
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creando...
                      </>
                    ) : (
                      <>
                        <span>Crear Campana</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
