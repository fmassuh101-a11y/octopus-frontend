'use client'

import { useState, useEffect } from 'react'
import {
  MessageTemplate,
  TemplateVariables,
  processTemplate,
  TEMPLATE_CATEGORIES
} from '@/lib/utils/messageTemplates'

interface AcceptAndMessageModalProps {
  creatorName: string
  gigTitle: string
  gigBudget?: string
  gigCategory?: string
  companyName: string
  templates: MessageTemplate[]
  onAccept: (sendMessage: boolean, message: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function AcceptAndMessageModal({
  creatorName,
  gigTitle,
  gigBudget,
  gigCategory,
  companyName,
  templates,
  onAccept,
  onCancel,
  loading = false
}: AcceptAndMessageModalProps) {
  const [sendMessage, setSendMessage] = useState(true)
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const variables: TemplateVariables = {
    nombre: creatorName,
    gig_title: gigTitle,
    company_name: companyName,
    budget: gigBudget,
    category: gigCategory
  }

  // Seleccionar el primer template de bienvenida por defecto
  useEffect(() => {
    const welcomeTemplate = templates.find(t => t.category === 'bienvenida')
    if (welcomeTemplate) {
      setMessage(processTemplate(welcomeTemplate.content, variables))
      setSelectedTemplateId(welcomeTemplate.id)
    }
  }, [templates])

  const handleTemplateSelect = (template: MessageTemplate) => {
    const processed = processTemplate(template.content, variables)
    setMessage(processed)
    setSelectedTemplateId(template.id)
    setShowTemplates(false)
  }

  const handleSubmit = () => {
    onAccept(sendMessage, sendMessage ? message : '')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Aceptar Aplicante</h3>
            <button
              onClick={onCancel}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Creator Info */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-green-50 rounded-xl">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {creatorName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{creatorName}</h4>
              <p className="text-sm text-gray-600">Para: {gigTitle}</p>
              {gigBudget && (
                <p className="text-sm text-green-600 font-medium">{gigBudget}</p>
              )}
            </div>
            <div className="ml-auto">
              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Send Message Option */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendMessage}
                onChange={(e) => setSendMessage(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="font-medium text-gray-900">Enviar mensaje de bienvenida</span>
            </label>
          </div>

          {/* Message Editor */}
          {sendMessage && (
            <div className="space-y-3">
              {/* Template Selector Button */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-700">
                    {selectedTemplateId
                      ? templates.find(t => t.id === selectedTemplateId)?.title || 'Template seleccionado'
                      : 'Seleccionar template'}
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Templates Dropdown */}
                {showTemplates && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                    {templates.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No tienes templates. Crea uno en la seccion de Templates.
                      </div>
                    ) : (
                      templates.map(template => {
                        const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category)
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template)}
                            className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{template.title}</span>
                              <span className="text-xs text-gray-400">{category?.emoji}</span>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Message Textarea */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje de bienvenida..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />

              <p className="text-xs text-gray-400">
                Puedes editar el mensaje antes de enviarlo
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (sendMessage && !message.trim())}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {sendMessage ? 'Aceptar y Enviar' : 'Aceptar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
