"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createGig } from '../../../../lib/database'
import { useAuth } from '../../../../lib/contexts/AuthContext'

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
  targetRegions: string[]
  targetAudience: string[]
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
  targetRegions: [],
  targetAudience: [],
  jobImage: null,
}

const jobTypes = [
  "UGC Creator",
  "Brand Ambassador",
  "Content Creator",
  "Influencer Campaign",
  "Product Review",
  "Social Media Manager",
  "Video Editor",
  "Photographer",
  "TikTok Content",
  "Instagram Content",
  "YouTube Content",
  "Other"
]

const regions = [
  "United States",
  "Canada",
  "Mexico",
  "Latin America",
  "Europe",
  "United Kingdom",
  "Spain",
  "Germany",
  "France",
  "Asia",
  "Australia",
  "Worldwide"
]

const audiences = [
  "Gen Z (18-24)",
  "Millennials (25-40)",
  "Gen X (41-56)",
  "Parents",
  "Students",
  "Professionals",
  "Gamers",
  "Fitness Enthusiasts",
  "Beauty & Fashion",
  "Tech Enthusiasts",
  "Foodies",
  "Travel Lovers"
]

const steps = [
  { id: 1, name: "Detalles", icon: "1" },
  { id: 2, name: "Pago", icon: "2" },
  { id: 3, name: "Requisitos", icon: "3" },
  { id: 4, name: "Audiencia", icon: "4" },
  { id: 5, name: "Imagen", icon: "5" },
]

export default function NewJobPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<JobFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateFormData = (updates: Partial<JobFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
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
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
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
      return `$${formData.cpmRate} CPM (por 1K views)`
    }
    return ""
  }

  const getRequirementsString = () => {
    const reqs = []
    if (formData.requireInstagram) reqs.push("Instagram requerido")
    if (formData.requireTikTok) reqs.push("TikTok requerido")
    if (formData.requireAge21) reqs.push("21+ años")
    if (formData.minFollowers) reqs.push(`${formData.minFollowers}+ seguidores`)
    if (formData.targetRegions.length > 0) reqs.push(formData.targetRegions.join(", "))
    return reqs.join(", ") || undefined
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      if (!user) {
        router.push('/auth/login')
        return
      }

      await createGig({
        title: formData.title,
        description: formData.description,
        budget: getBudgetString(),
        category: formData.jobType,
        requirements: getRequirementsString(),
        deliverables: formData.targetAudience.join(", ") || undefined,
      })

      router.push("/company/campaigns")
    } catch (error: any) {
      setError(error.message || 'Error al crear el trabajo')
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

  const toggleArrayItem = (array: string[], item: string, key: "targetRegions" | "targetAudience") => {
    const newArray = array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item]
    updateFormData({ [key]: newArray })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/company/campaigns")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium hidden sm:inline">Volver</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <span className="text-white text-lg">O</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Nueva Campana
            </span>
          </div>

          <div className="text-sm text-gray-500">
            Paso {currentStep}/5
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Progress */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-6">Progreso</h3>
              <div className="space-y-1">
                {steps.map((step, index) => (
                  <div key={step.id} className="relative">
                    <button
                      onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                      disabled={step.id > currentStep}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        step.id === currentStep
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200"
                          : step.id < currentStep
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        step.id === currentStep
                          ? "bg-white/20"
                          : step.id < currentStep
                          ? "bg-green-200"
                          : "bg-gray-200"
                      }`}>
                        {step.id < currentStep ? "✓" : step.icon}
                      </span>
                      <span className="font-medium text-sm">{step.name}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`absolute left-6 top-14 w-0.5 h-4 ${
                        step.id < currentStep ? "bg-green-300" : "bg-gray-200"
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
                        ? "bg-gradient-to-r from-purple-500 to-pink-500"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {currentStep}
                </span>
                <span className="font-semibold text-gray-900">{steps[currentStep - 1].name}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            {/* Form Container */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Step 1: Job Details */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Detalles del trabajo</h2>
                      <p className="text-gray-500">Describe que tipo de contenido necesitas</p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Titulo del trabajo *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => updateFormData({ title: e.target.value })}
                          placeholder="ej. Creador UGC para marca de skincare"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900 placeholder-gray-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tipo de trabajo *
                        </label>
                        <div className="relative">
                          <select
                            value={formData.jobType}
                            onChange={e => updateFormData({ jobType: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900 appearance-none bg-white"
                          >
                            <option value="">Selecciona un tipo</option>
                            {jobTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Descripcion *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={e => updateFormData({ description: e.target.value })}
                          placeholder="Describe el trabajo, requisitos, entregables y que hace especial a tu marca..."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900 placeholder-gray-400 resize-none"
                        />
                        <p className="mt-2 text-sm text-gray-400">
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Como vas a pagar?</h2>
                      <p className="text-gray-500">Elige el modelo de pago que mejor te funcione</p>
                    </div>

                    {/* Payment Type Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Fixed Payment */}
                      <button
                        onClick={() => updateFormData({ paymentType: "fixed" })}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.paymentType === "fixed"
                            ? "border-purple-500 bg-purple-50 shadow-lg"
                            : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                        }`}
                      >
                        {formData.paymentType === "fixed" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
                          <span className="text-2xl">$</span>
                        </div>
                        <h3 className="font-bold text-gray-900">Precio Fijo</h3>
                        <p className="text-sm text-gray-500 mt-1">Pago unico por entrega</p>
                      </button>

                      {/* Hourly */}
                      <button
                        onClick={() => updateFormData({ paymentType: "hourly" })}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.paymentType === "hourly"
                            ? "border-purple-500 bg-purple-50 shadow-lg"
                            : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                        }`}
                      >
                        {formData.paymentType === "hourly" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="font-bold text-gray-900">Por Hora</h3>
                        <p className="text-sm text-gray-500 mt-1">Trabajo continuo por horas</p>
                      </button>

                      {/* CPM - UNIQUE TO OCTOPUS */}
                      <button
                        onClick={() => updateFormData({ paymentType: "cpm" })}
                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                          formData.paymentType === "cpm"
                            ? "border-purple-500 bg-purple-50 shadow-lg"
                            : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                        }`}
                      >
                        {formData.paymentType === "cpm" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2">
                          <span className="px-2 py-1 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                            NUEVO
                          </span>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <h3 className="font-bold text-gray-900">CPM</h3>
                        <p className="text-sm text-gray-500 mt-1">Pago por 1,000 views</p>
                      </button>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-5">
                      {formData.paymentType === "fixed" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Cantidad a pagar *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                              <input
                                type="number"
                                value={formData.fixedAmount}
                                onChange={e => updateFormData({ fixedAmount: e.target.value })}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                                      ? "bg-purple-500 text-white shadow-lg"
                                      : "bg-white border border-gray-200 text-gray-600 hover:border-purple-300"
                                  }`}
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Tarifa por hora *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                              <input
                                type="number"
                                value={formData.hourlyRate}
                                onChange={e => updateFormData({ hourlyRate: e.target.value })}
                                placeholder="0.00"
                                className="w-full pl-8 pr-16 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">/hora</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Horas estimadas por semana
                            </label>
                            <input
                              type="number"
                              value={formData.estimatedHoursPerWeek}
                              onChange={e => updateFormData({ estimatedHoursPerWeek: e.target.value })}
                              placeholder="10"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900"
                            />
                          </div>
                        </>
                      )}

                      {formData.paymentType === "cpm" && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Tarifa por 1,000 Views *
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                            <input
                              type="number"
                              value={formData.cpmRate}
                              onChange={e => updateFormData({ cpmRate: e.target.value })}
                              placeholder="5.00"
                              className="w-full pl-8 pr-24 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">/1K views</span>
                          </div>
                          <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-100">
                            <div className="flex items-start gap-3">
                              <span className="text-xl">💡</span>
                              <div>
                                <p className="font-medium text-gray-900">Pago por rendimiento</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Paga solo por resultados. Si un creador obtiene 100K views a ${formData.cpmRate || "5"}/1K,
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Requisitos del creador</h2>
                      <p className="text-gray-500">Define que necesitan los creadores para aplicar</p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
                        {/* Instagram */}
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Requiere Instagram</p>
                              <p className="text-sm text-gray-500">El creador debe tener Instagram conectado</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ requireInstagram: !formData.requireInstagram })}
                            className={`relative w-14 h-8 rounded-full transition-all ${
                              formData.requireInstagram ? "bg-purple-500" : "bg-gray-300"
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                              formData.requireInstagram ? "left-7" : "left-1"
                            }`} />
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
                              <p className="font-semibold text-gray-900">Requiere TikTok</p>
                              <p className="text-sm text-gray-500">El creador debe tener TikTok conectado</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ requireTikTok: !formData.requireTikTok })}
                            className={`relative w-14 h-8 rounded-full transition-all ${
                              formData.requireTikTok ? "bg-purple-500" : "bg-gray-300"
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                              formData.requireTikTok ? "left-7" : "left-1"
                            }`} />
                          </button>
                        </div>

                        {/* Age 21+ */}
                        <div className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                              <span className="text-xl">21+</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Requiere 21+ anos</p>
                              <p className="text-sm text-gray-500">Para alcohol o contenido restringido</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFormData({ requireAge21: !formData.requireAge21 })}
                            className={`relative w-14 h-8 rounded-full transition-all ${
                              formData.requireAge21 ? "bg-purple-500" : "bg-gray-300"
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                              formData.requireAge21 ? "left-7" : "left-1"
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Minimum Followers */}
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Minimo de seguidores (opcional)
                        </label>
                        <input
                          type="number"
                          value={formData.minFollowers}
                          onChange={e => updateFormData({ minFollowers: e.target.value })}
                          placeholder="1000"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-900"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Dejalo vacio para aceptar creadores de cualquier tamano
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Targeting */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Audiencia objetivo</h2>
                      <p className="text-gray-500">A quien quieres llegar con este contenido?</p>
                    </div>

                    <div className="space-y-6">
                      {/* Regions */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Regiones
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {regions.map(region => (
                            <button
                              key={region}
                              type="button"
                              onClick={() => toggleArrayItem(formData.targetRegions, region, "targetRegions")}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                formData.targetRegions.includes(region)
                                  ? "bg-purple-500 text-white shadow-lg"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {region}
                            </button>
                          ))}
                        </div>
                        {formData.targetRegions.length === 0 && (
                          <p className="mt-2 text-sm text-gray-500">
                            Sin regiones = visible para todos
                          </p>
                        )}
                      </div>

                      {/* Audience */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Tipo de audiencia
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {audiences.map(audience => (
                            <button
                              key={audience}
                              type="button"
                              onClick={() => toggleArrayItem(formData.targetAudience, audience, "targetAudience")}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                formData.targetAudience.includes(audience)
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {audience}
                            </button>
                          ))}
                        </div>
                        {formData.targetAudience.length === 0 && (
                          <p className="mt-2 text-sm text-gray-500">
                            Sin audiencia seleccionada = visible para todos los creadores
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Image */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Imagen del trabajo</h2>
                      <p className="text-gray-500">Agrega una imagen atractiva para tu publicacion</p>
                    </div>

                    <div className="space-y-4">
                      {formData.jobImage ? (
                        <div className="relative">
                          <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
                            <img
                              src={formData.jobImage}
                              alt="Job preview"
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
                          className="w-full aspect-video rounded-2xl border-2 border-dashed border-gray-300 hover:border-purple-400 bg-gray-50 hover:bg-purple-50 transition-all flex flex-col items-center justify-center gap-4"
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-gray-700">Haz clic para subir imagen</p>
                            <p className="text-sm text-gray-500 mt-1">PNG, JPG hasta 5MB</p>
                          </div>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      <p className="text-center text-sm text-gray-500">
                        La imagen es opcional - usaremos una por defecto si no subes una
                      </p>
                    </div>

                    {/* Preview Card */}
                    <div className="mt-8 bg-gray-50 rounded-2xl p-6">
                      <h4 className="text-sm font-semibold text-gray-500 mb-4">VISTA PREVIA</h4>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                            {formData.jobImage ? (
                              <img src={formData.jobImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">O</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{formData.title || "Titulo del trabajo"}</h3>
                            <p className="text-sm text-gray-500">{formData.jobType || "Tipo de trabajo"}</p>
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
                                <span className="px-2 py-1 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 text-xs font-medium rounded-full">
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

              {/* Footer Navigation */}
              <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
                  >
                    Atras
                  </button>
                ) : (
                  <Link
                    href="/company/campaigns"
                    className="px-6 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
                  >
                    Cancelar
                  </Link>
                )}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                      canProceed()
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
