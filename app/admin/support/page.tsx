'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'
const ADMIN_EMAIL = 'fmassuh133@gmail.com'

interface Conversation {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_type: string
  status: string
  priority: string
  subject: string
  created_at: string
  updated_at: string
  last_message_at: string
  unread_count?: number
}

interface Message {
  id: string
  conversation_id: string
  sender_type: 'user' | 'bot' | 'agent'
  sender_id: string | null
  content: string
  is_escalated: boolean
  read_at: string | null
  created_at: string
}

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'waiting_agent' | 'in_progress' | 'resolved'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getToken = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      // Mark messages as read
      markMessagesAsRead(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages
  useEffect(() => {
    if (!selectedConversation) return

    const interval = setInterval(() => {
      loadMessages(selectedConversation.id)
    }, 5000)

    return () => clearInterval(interval)
  }, [selectedConversation])

  // Poll for new conversations
  useEffect(() => {
    if (!isAdmin) return

    const interval = setInterval(() => {
      loadConversations()
    }, 10000)

    return () => clearInterval(interval)
  }, [isAdmin])

  const checkAdminAccess = async () => {
    try {
      const userStr = localStorage.getItem('sb-user')
      if (!userStr) {
        window.location.href = '/auth/login'
        return
      }

      const user = JSON.parse(userStr)

      if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        alert('Acceso denegado. Solo administradores.')
        window.location.href = '/'
        return
      }

      setIsAdmin(true)
      await loadConversations()
    } catch (err) {
      console.error('Admin check error:', err)
      window.location.href = '/'
    }
  }

  const loadConversations = async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?select=*&order=last_message_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!res.ok) {
        console.error('Error loading conversations:', res.status)
        setLoading(false)
        return
      }

      const data = await res.json()

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        data.map(async (conv: Conversation) => {
          const unreadRes = await fetch(
            `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${conv.id}&read_at=is.null&sender_type=eq.user&select=id`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'count=exact'
              }
            }
          )
          const unreadCount = unreadRes.headers.get('content-range')?.split('/')[1] || '0'
          return { ...conv, unread_count: parseInt(unreadCount) }
        })
      )

      setConversations(conversationsWithUnread)
      setLoading(false)
    } catch (err) {
      console.error('Error loading conversations:', err)
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    const token = getToken()
    if (!token) return

    setLoadingMessages(true)

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${conversationId}&order=created_at.asc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    }

    setLoadingMessages(false)
  }

  const markMessagesAsRead = async (conversationId: string) => {
    const token = getToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${conversationId}&read_at=is.null&sender_type=eq.user`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            read_at: new Date().toISOString()
          })
        }
      )
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const token = getToken()
    const userStr = localStorage.getItem('sb-user')
    const user = userStr ? JSON.parse(userStr) : null

    if (!token || !user) return

    setSending(true)

    try {
      // Send message
      const messageRes = await fetch(`${SUPABASE_URL}/rest/v1/support_messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          sender_type: 'agent',
          sender_id: user.id,
          content: newMessage.trim(),
          is_escalated: false
        })
      })

      if (messageRes.ok) {
        const newMsg = await messageRes.json()
        setMessages(prev => [...prev, newMsg[0]])
        setNewMessage('')

        // Update conversation status to in_progress
        await fetch(
          `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${selectedConversation.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              status: 'in_progress',
              assigned_agent_id: user.id,
              updated_at: new Date().toISOString()
            })
          }
        )

        // Update local state
        setSelectedConversation(prev => prev ? { ...prev, status: 'in_progress' } : null)
        setConversations(prev =>
          prev.map(c => c.id === selectedConversation.id ? { ...c, status: 'in_progress' } : c)
        )
      }
    } catch (err) {
      console.error('Error sending message:', err)
    }

    setSending(false)
  }

  const updateConversationStatus = async (conversationId: string, status: string) => {
    const token = getToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${conversationId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            status,
            resolved_at: status === 'resolved' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
        }
      )

      setSelectedConversation(prev => prev ? { ...prev, status } : null)
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, status } : c)
      )
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'open': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Nuevo' },
      'waiting_agent': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Esperando agente' },
      'in_progress': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'En progreso' },
      'resolved': { bg: 'bg-neutral-500/20', text: 'text-neutral-400', label: 'Resuelto' },
      'closed': { bg: 'bg-neutral-700/20', text: 'text-neutral-500', label: 'Cerrado' }
    }
    return badges[status] || badges['open']
  }

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      'low': { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
      'normal': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      'high': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
      'urgent': { bg: 'bg-red-500/20', text: 'text-red-400' }
    }
    return badges[priority] || badges['normal']
  }

  const filteredConversations = conversations.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Cargando soporte...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Panel de Soporte</h1>
                <p className="text-sm text-neutral-400">
                  {conversations.filter(c => c.status === 'waiting_agent').length} conversaciones esperando respuesta
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm"
              >
                ← Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Conversations List */}
        <div className="w-96 border-r border-neutral-800 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-neutral-800">
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'waiting_agent', label: 'Esperando' },
                { id: 'in_progress', label: 'En progreso' },
                { id: 'resolved', label: 'Resueltos' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.id
                      ? 'bg-sky-500 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-neutral-500">No hay conversaciones</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b border-neutral-800/50 hover:bg-neutral-900 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-neutral-900' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        conv.user_type === 'creator'
                          ? 'bg-violet-500/30 text-violet-300'
                          : 'bg-emerald-500/30 text-emerald-300'
                      }`}>
                        {conv.user_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{conv.user_name || 'Usuario'}</p>
                        <p className="text-xs text-neutral-500">
                          {conv.user_type === 'creator' ? 'Creador' : 'Empresa'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {conv.unread_count}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500">
                        {formatTime(conv.last_message_at || conv.updated_at)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-neutral-300 truncate mb-2">
                    {conv.subject || 'Sin asunto'}
                  </p>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(conv.status).bg} ${getStatusBadge(conv.status).text}`}>
                      {getStatusBadge(conv.status).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(conv.priority).bg} ${getPriorityBadge(conv.priority).text}`}>
                      {conv.priority}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    selectedConversation.user_type === 'creator'
                      ? 'bg-violet-500/30 text-violet-300'
                      : 'bg-emerald-500/30 text-emerald-300'
                  }`}>
                    {selectedConversation.user_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedConversation.user_name || 'Usuario'}</p>
                    <p className="text-sm text-neutral-400">
                      {selectedConversation.user_email} • {selectedConversation.user_type === 'creator' ? 'Creador' : 'Empresa'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConversation.status !== 'resolved' && (
                    <button
                      onClick={() => updateConversationStatus(selectedConversation.id, 'resolved')}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                    >
                      Marcar como resuelto
                    </button>
                  )}
                  {selectedConversation.status === 'resolved' && (
                    <button
                      onClick={() => updateConversationStatus(selectedConversation.id, 'in_progress')}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${
                          message.sender_type === 'agent'
                            ? 'bg-sky-500 text-white'
                            : message.sender_type === 'bot'
                            ? 'bg-neutral-700 text-neutral-200'
                            : 'bg-neutral-800 text-white'
                        } rounded-2xl px-4 py-3`}>
                          {message.sender_type !== 'agent' && (
                            <p className="text-xs text-neutral-400 mb-1">
                              {message.sender_type === 'bot' ? 'Bot' : selectedConversation.user_name}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_type === 'agent' ? 'text-sky-200' : 'text-neutral-500'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-800">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Escribe tu respuesta..."
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-6 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Enviar'
                    )}
                  </button>
                </div>

                {/* Quick Responses */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[
                    'Hola, estoy revisando tu caso.',
                    'Gracias por contactarnos.',
                    'Ya fue resuelto tu problema.',
                    'Necesito más información para ayudarte.'
                  ].map(response => (
                    <button
                      key={response}
                      onClick={() => setNewMessage(response)}
                      className="px-3 py-1.5 bg-neutral-800 text-neutral-400 rounded-lg text-xs hover:bg-neutral-700 transition-colors"
                    >
                      {response}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="text-6xl mb-4 block">💬</span>
                <h3 className="text-xl font-semibold mb-2">Panel de Soporte</h3>
                <p className="text-neutral-500">Selecciona una conversación para responder</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
