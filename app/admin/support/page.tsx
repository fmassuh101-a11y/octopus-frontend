'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

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
  rating?: number
}

interface Message {
  id: string
  conversation_id: string
  sender_type: 'user' | 'bot' | 'agent'
  sender_id: string | null
  content: string
  created_at: string
}

interface Stats {
  total: number
  pending: number
  resolved: number
  averageRating: number
  totalRatings: number
}

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending')
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, resolved: 0, averageRating: 0, totalRatings: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getToken = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadConversations(filter)
      loadStats()
    }
  }, [isAdmin, filter])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages
  useEffect(() => {
    if (!selectedConversation) return
    const interval = setInterval(() => loadMessages(selectedConversation.id), 5000)
    return () => clearInterval(interval)
  }, [selectedConversation])

  // Poll for new conversations
  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => {
      loadConversations(filter)
      loadStats()
    }, 10000)
    return () => clearInterval(interval)
  }, [isAdmin, filter])

  const checkAdminAccess = async () => {
    const userStr = localStorage.getItem('sb-user')
    if (!userStr) {
      window.location.href = '/auth/login'
      return
    }
    const user = JSON.parse(userStr)
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      alert('Acceso denegado')
      window.location.href = '/'
      return
    }
    setIsAdmin(true)
  }

  const loadStats = async () => {
    const token = getToken()
    if (!token) return

    try {
      // Get all conversations for stats
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?select=status,rating`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (res.ok) {
        const data = await res.json()
        const pending = data.filter((c: any) => c.status !== 'resolved').length
        const resolved = data.filter((c: any) => c.status === 'resolved').length
        const ratings = data.filter((c: any) => c.rating && c.rating > 0)
        const averageRating = ratings.length > 0
          ? ratings.reduce((sum: number, c: any) => sum + c.rating, 0) / ratings.length
          : 0
        setStats({
          total: data.length,
          pending,
          resolved,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: ratings.length
        })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadConversations = async (currentFilter: 'pending' | 'resolved') => {
    const token = getToken()
    if (!token) return

    try {
      const statusFilter = currentFilter === 'pending'
        ? 'status=in.(waiting_agent,in_progress,open)'
        : 'status=eq.resolved'

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?${statusFilter}&order=last_message_at.desc.nullsfirst,created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    }
    setLoading(false)
  }

  const loadMessages = async (conversationId: string) => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${conversationId}&order=created_at.asc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      if (res.ok) {
        setMessages(await res.json())
      }
    } catch (err) {
      console.error('Error loading messages:', err)
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/support_messages`, {
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
          content: newMessage.trim()
        })
      })

      if (res.ok) {
        const newMsg = await res.json()
        setMessages(prev => [...prev, newMsg[0]])
        setNewMessage('')

        // Update status to in_progress
        await fetch(
          `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${selectedConversation.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'in_progress', last_message_at: new Date().toISOString() })
          }
        )
      }
    } catch (err) {
      console.error('Error sending:', err)
    }
    setSending(false)
  }

  const resolveConversation = async (id: string) => {
    const token = getToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'resolved', resolved_at: new Date().toISOString() })
        }
      )
      // Refresh conversations
      loadConversations(filter)
      loadStats()
      if (selectedConversation?.id === id) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Error resolving:', err)
    }
  }

  const deleteConversation = async (id: string) => {
    if (!confirm('Eliminar esta conversacion?')) return
    const token = getToken()
    if (!token) return

    try {
      // Delete messages first
      await fetch(
        `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
        }
      )
      // Delete conversation
      await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
        }
      )
      loadConversations(filter)
      loadStats()
      if (selectedConversation?.id === id) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const formatTime = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (mins < 1) return 'Ahora'
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  // Chat view (when conversation selected)
  if (selectedConversation) {
    const isResolvedConv = selectedConversation.status === 'resolved'
    return (
      <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800 flex items-center gap-3">
          <button onClick={() => { setSelectedConversation(null); setMessages([]) }} className="p-2 hover:bg-neutral-800 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="font-semibold">{selectedConversation.user_name}</p>
            <p className="text-xs text-neutral-400">
              {selectedConversation.user_type === 'creator' ? 'Creador' : 'Empresa'} • {selectedConversation.user_email}
            </p>
          </div>
          {!isResolvedConv && (
            <button
              onClick={() => resolveConversation(selectedConversation.id)}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              Resolver
            </button>
          )}
          {isResolvedConv && selectedConversation.rating && (
            <div className="flex items-center gap-2">
              {renderStars(selectedConversation.rating)}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.sender_type === 'agent'
                  ? 'bg-sky-600 text-white'
                  : msg.sender_type === 'bot'
                  ? 'bg-violet-600/30 text-violet-200'
                  : 'bg-neutral-800 text-white'
              }`}>
                <p className="text-xs opacity-70 mb-1 font-medium">
                  {msg.sender_type === 'agent' ? 'Tu' : msg.sender_type === 'bot' ? 'Bot IA' : selectedConversation.user_name}
                </p>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className="text-xs opacity-50 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - only show if not resolved */}
        {!isResolvedConv && (
          <div className="shrink-0 p-3 border-t border-neutral-800 bg-neutral-900 safe-area-bottom">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escribe tu respuesta..."
                className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-base focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-5 py-3 bg-sky-500 hover:bg-sky-400 rounded-xl font-medium disabled:opacity-50 transition-colors"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Conversations list
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 px-4 py-5 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Centro de Soporte</h1>
              <p className="text-xs text-neutral-500">Gestiona las consultas de usuarios</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/50">
            <p className="text-2xl font-bold text-sky-400">{stats.pending}</p>
            <p className="text-xs text-neutral-400">Pendientes</p>
          </div>
          <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/50">
            <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
            <p className="text-xs text-neutral-400">Resueltos</p>
          </div>
          <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/50">
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold text-yellow-400">{stats.averageRating || '-'}</p>
              <svg className="w-5 h-5 text-yellow-400 fill-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-xs text-neutral-400">{stats.totalRatings} valoraciones</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 bg-neutral-800/50 p-1 rounded-xl">
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filter === 'pending'
                ? 'bg-sky-500 text-white shadow-lg'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Pendientes ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filter === 'resolved'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Resueltos ({stats.resolved})
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="divide-y divide-neutral-800/50">
        {conversations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
              {filter === 'pending' ? (
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              )}
            </div>
            <p className="text-neutral-400 font-medium">
              {filter === 'pending' ? 'Todo al dia!' : 'No hay conversaciones resueltas'}
            </p>
            <p className="text-neutral-600 text-sm mt-1">
              {filter === 'pending' ? 'No hay mensajes pendientes' : 'Las conversaciones resueltas aparecen aqui'}
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className="p-4 hover:bg-neutral-900/50 active:bg-neutral-900 transition-colors cursor-pointer"
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  conv.user_type === 'creator'
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }`}>
                  {conv.user_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold truncate">{conv.user_name}</p>
                    <span className="text-xs text-neutral-500 ml-2">{formatTime(conv.last_message_at || conv.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate mb-1">{conv.subject || 'Solicitud de soporte'}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      conv.user_type === 'creator'
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {conv.user_type === 'creator' ? 'Creador' : 'Empresa'}
                    </span>
                    {filter === 'resolved' && conv.rating && (
                      <div className="flex items-center gap-1">
                        {renderStars(conv.rating)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {filter === 'pending' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); resolveConversation(conv.id) }}
                      className="p-2.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                      title="Resolver"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      className="p-2.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
