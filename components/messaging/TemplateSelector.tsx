'use client'

import { useState, useEffect } from 'react'
import {
  MessageTemplate,
  TemplateVariables,
  processTemplate,
  TEMPLATE_CATEGORIES
} from '@/lib/utils/messageTemplates'

interface TemplateSelectorProps {
  templates: MessageTemplate[]
  variables: TemplateVariables
  onSelect: (processedContent: string, templateId: string) => void
  onClose: () => void
}

export default function TemplateSelector({
  templates,
  variables,
  onSelect,
  onClose
}: TemplateSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (selectedTemplate) {
      setPreview(processTemplate(selectedTemplate.content, variables))
    }
  }, [selectedTemplate, variables])

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleSelect = () => {
    if (selectedTemplate) {
      const processed = processTemplate(selectedTemplate.content, variables)
      onSelect(processed, selectedTemplate.id)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Seleccionar Template</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedCategory
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-500">No hay templates disponibles</p>
              <p className="text-sm text-gray-400 mt-1">Crea tu primer template en la seccion de Templates</p>
            </div>
          ) : (
            filteredTemplates.map(template => {
              const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category)
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{template.title}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {category?.emoji} {category?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {processTemplate(template.content, variables).substring(0, 100)}...
                  </p>
                  {template.use_count > 0 && (
                    <p className="text-xs text-gray-400 mt-2">Usado {template.use_count} veces</p>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Preview & Actions */}
        {selectedTemplate && (
          <div className="border-t border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Vista previa:</p>
            <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSelect}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Usar Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
