'use client'

import { useState, useEffect } from 'react'
import {
  MessageTemplate,
  TemplateVariables,
  processTemplate,
  TEMPLATE_CATEGORIES
} from '@/lib/utils/messageTemplates'

// Templates predeterminados que siempre estan disponibles
const DEFAULT_QUICK_MESSAGES = [
  {
    id: 'quick-1',
    title: 'Bienvenida',
    content: 'Hola {nombre}! Gracias por aplicar a "{gig_title}". Me encanta tu perfil y creo que serias perfecto/a para este proyecto. Me gustaria discutir los detalles contigo. Estas disponible?',
    category: 'bienvenida'
  },
  {
    id: 'quick-2',
    title: 'Detalles del proyecto',
    content: 'Hola {nombre}! Te cuento mas sobre el proyecto "{gig_title}". Necesitamos contenido de alta calidad que conecte con nuestra audiencia. Tienes alguna pregunta sobre los requisitos?',
    category: 'detalles'
  },
  {
    id: 'quick-3',
    title: 'Confirmar colaboracion',
    content: 'Excelente {nombre}! Estamos muy contentos de trabajar contigo en "{gig_title}". Los proximos pasos son acordar fechas y definir el brief creativo. Te parece bien?',
    category: 'cierre'
  },
  {
    id: 'quick-4',
    title: 'Mensaje rapido',
    content: 'Hola {nombre}! Gracias por tu interes en "{gig_title}". Te escribo para coordinar los siguientes pasos.',
    category: 'general'
  }
]

interface TemplateSelectorProps {
  templates: MessageTemplate[]
  variables: TemplateVariables
  onSelect: (processedContent: string, templateId?: string) => void
  onClose: () => void
  onSendDirect?: (content: string) => void // Enviar mensaje directamente
}

export default function TemplateSelector({
  templates,
  variables,
  onSelect,
  onClose,
  onSendDirect
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<typeof DEFAULT_QUICK_MESSAGES[0] | MessageTemplate | null>(null)
  const [preview, setPreview] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Combinar templates del usuario con los predeterminados
  const allTemplates = [...DEFAULT_QUICK_MESSAGES, ...templates]

  useEffect(() => {
    if (selectedTemplate) {
      setPreview(processTemplate(selectedTemplate.content, variables))
    }
  }, [selectedTemplate, variables])

  const handleSend = () => {
    if (selectedTemplate && onSendDirect) {
      const processed = processTemplate(selectedTemplate.content, variables)
      onSendDirect(processed)
    } else if (selectedTemplate) {
      const processed = processTemplate(selectedTemplate.content, variables)
      onSelect(processed, 'id' in selectedTemplate ? selectedTemplate.id : undefined)
    }
  }

  const handleSendCustom = () => {
    if (customMessage.trim()) {
      if (onSendDirect) {
        onSendDirect(customMessage.trim())
      } else {
        onSelect(customMessage.trim())
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Enviar Mensaje</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Para: <span className="font-medium text-gray-700">{variables.nombre}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setShowCustom(false)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              !showCustom
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mensajes Rapidos
          </button>
          <button
            onClick={() => setShowCustom(true)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              showCustom
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Escribir Mensaje
          </button>
        </div>

        {showCustom ? (
          /* Custom Message Tab */
          <div className="flex-1 p-4 flex flex-col">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={`Escribe tu mensaje para ${variables.nombre}...`}
              className="flex-1 min-h-[200px] p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <button
              onClick={handleSendCustom}
              disabled={!customMessage.trim()}
              className="mt-4 w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              Enviar Mensaje
            </button>
          </div>
        ) : (
          /* Quick Messages Tab */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {allTemplates.map((template, index) => {
                const processed = processTemplate(template.content, variables)
                const isSelected = selectedTemplate?.id === template.id
                const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category)

                return (
                  <button
                    key={template.id || index}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{template.title}</span>
                      {category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {category.emoji}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{processed}</p>
                  </button>
                )
              })}
            </div>

            {/* Preview & Send */}
            {selectedTemplate && (
              <div className="border-t border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Vista previa del mensaje:</p>
                <div className="bg-purple-50 rounded-xl p-3 max-h-24 overflow-y-auto mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview}</p>
                </div>
                <button
                  onClick={handleSend}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Enviar a {variables.nombre}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
