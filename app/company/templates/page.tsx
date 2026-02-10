'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MessageTemplate,
  TEMPLATE_CATEGORIES,
  AVAILABLE_VARIABLES,
  validateTemplate,
  generatePreview,
  DEFAULT_TEMPLATES
} from '@/lib/utils/messageTemplates'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

export default function TemplatesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const userData = JSON.parse(userStr)
    setUser(userData)
    await loadTemplates(token)
  }

  const loadTemplates = async (token: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/message_templates?select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (err) {
      console.error('Error loading templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingTemplate(null)
    setFormTitle('')
    setFormContent('')
    setFormCategory('bienvenida')
    setFormErrors([])
    setShowModal(true)
  }

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setFormTitle(template.title)
    setFormContent(template.content)
    setFormCategory(template.category)
    setFormErrors([])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTemplate(null)
    setFormErrors([])
  }

  const handleSave = async () => {
    // Validate
    const validation = validateTemplate(formContent)
    if (!formTitle.trim()) {
      setFormErrors(['El titulo es requerido'])
      return
    }
    if (!validation.valid) {
      setFormErrors(validation.errors)
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      if (editingTemplate) {
        // Update
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/message_templates?id=eq.${editingTemplate.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              title: formTitle.trim(),
              content: formContent.trim(),
              category: formCategory,
              updated_at: new Date().toISOString()
            })
          }
        )

        if (response.ok) {
          const updated = await response.json()
          setTemplates(prev =>
            prev.map(t => t.id === editingTemplate.id ? updated[0] : t)
          )
          closeModal()
        }
      } else {
        // Create
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/message_templates`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              company_id: user.id,
              title: formTitle.trim(),
              content: formContent.trim(),
              category: formCategory
            })
          }
        )

        if (response.ok) {
          const created = await response.json()
          setTemplates(prev => [created[0], ...prev])
          closeModal()
        }
      }
    } catch (err) {
      console.error('Error saving template:', err)
      setFormErrors(['Error al guardar. Intenta de nuevo.'])
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Estas seguro de eliminar este template?')) return

    setDeleting(templateId)
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/message_templates?id=eq.${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId))
      }
    } catch (err) {
      console.error('Error deleting template:', err)
    } finally {
      setDeleting(null)
    }
  }

  const addDefaultTemplates = async () => {
    if (!confirm('Esto agregara 3 templates predeterminados. Continuar?')) return

    setSaving(true)
    try {
      const token = localStorage.getItem('sb-access-token')

      for (const template of DEFAULT_TEMPLATES) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/message_templates`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              company_id: user.id,
              ...template
            })
          }
        )
      }

      await loadTemplates(token!)
    } catch (err) {
      console.error('Error adding default templates:', err)
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = (variable: string) => {
    setFormContent(prev => prev + `{${variable}}`)
  }

  const filteredTemplates = templates.filter(t =>
    !selectedCategory || t.category === selectedCategory
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/company/messages"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mis Templates</h1>
                <p className="text-sm text-gray-500">Mensajes predeterminados</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                !selectedCategory
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({templates.length})
            </button>
            {TEMPLATE_CATEGORIES.map(cat => {
              const count = templates.filter(t => t.category === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.emoji} {cat.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No tienes templates
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Los templates te permiten enviar mensajes rapidos y consistentes a los creadores.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={openCreateModal}
                className="px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
              >
                Crear mi primer template
              </button>
              <button
                onClick={addDefaultTemplates}
                disabled={saving}
                className="px-6 py-3 border border-purple-200 text-purple-600 rounded-full font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                {saving ? 'Agregando...' : 'Agregar templates de ejemplo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map(template => {
              const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category)
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{template.title}</h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {category?.emoji} {category?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={deleting === template.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500 disabled:opacity-50"
                      >
                        {deleting === template.id ? (
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap line-clamp-3">
                    {template.content}
                  </p>
                  {template.use_count > 0 && (
                    <p className="text-xs text-gray-400 mt-3">
                      Usado {template.use_count} veces
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <Link href="/company/dashboard" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium mt-1">Dashboard</span>
          </Link>
          <Link href="/company/messages" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium mt-1">Mensajes</span>
          </Link>
          <div className="flex flex-col items-center py-2 px-4 text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium mt-1">Templates</span>
          </div>
          <Link href="/company/applicants" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium mt-1">Aplicantes</span>
          </Link>
        </div>
        <div className="h-1 bg-gray-900 mx-auto w-32 rounded-full mb-2"></div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingTemplate ? 'Editar Template' : 'Crear Template'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titulo del Template
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Bienvenida Inicial"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFormCategory(cat.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        formCategory === cat.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables disponibles
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
                      title={`Ejemplo: ${v.example}`}
                    >
                      {`{${v.key}}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Haz clic para insertar. Se reemplazaran automaticamente al enviar.
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido del mensaje
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Escribe tu mensaje aqui. Usa variables como {nombre} para personalizar."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Preview */}
              {formContent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vista previa
                  </label>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {generatePreview(formContent)}
                  </div>
                </div>
              )}

              {/* Errors */}
              {formErrors.length > 0 && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
                  {formErrors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
