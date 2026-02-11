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

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getToken = () => localStorage.getItem('sb-access-token')

  useEffect(() => {
    checkAdminAccess()
  }, [])

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
    const interval = setInterval(() => loadConversations(), 10000)
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
    await loadConversations()
  }

  const loadConversations = async () => {
    const token = getToken()
    if (!token) return

    try {
      const statusFilter = filter === 'pending'
        ? 'status=in.(waiting_agent,in_progress,open)'
        : 'status=eq.resolved'

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?${statusFilter}&order=last_message_at.desc`,
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
            body: JSON.stringify({ status: 'in_progress' })
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
      setConversations(prev => prev.filter(c => c.id !== id))
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
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selectedConversation?.id === id) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Error deleting:', err)
    }
  }

  const formatTime = (date: string) => {
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
    return (
      <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800 flex items-center gap-3">
          <button onClick={() => { setSelectedConversation(null); setMessages([]) }} className="p-2">
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
          <button
            onClick={() => resolveConversation(selectedConversation.id)}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm"
          >
            Resolver
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                msg.sender_type === 'agent'
                  ? 'bg-sky-600 text-white'
                  : msg.sender_type === 'bot'
                  ? 'bg-neutral-700 text-neutral-200'
                  : 'bg-neutral-800 text-white'
              }`}>
                <p className="text-xs opacity-70 mb-1">
                  {msg.sender_type === 'agent' ? 'Tu' : msg.sender_type === 'bot' ? 'Bot' : selectedConversation.user_name}
                </p>
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-50 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - fixed at bottom */}
        <div className="shrink-0 p-3 border-t border-neutral-800 bg-neutral-900 safe-area-bottom">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Respuesta..."
              className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-base focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2.5 bg-sky-500 rounded-xl font-medium disabled:opacity-50"
            >
              {sending ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Conversations list
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 px-4 py-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-neutral-800 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">Soporte</h1>
          </div>
          <span className="text-sm text-neutral-400">{conversations.length} mensajes</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setFilter('pending'); loadConversations() }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              filter === 'pending' ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => { setFilter('resolved'); loadConversations() }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              filter === 'resolved' ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            Resueltos
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="divide-y divide-neutral-800">
        {conversations.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl mb-4 block">{filter === 'pending' ? '✅' : '📭'}</span>
            <p className="text-neutral-500">
              {filter === 'pending' ? 'No hay mensajes pendientes' : 'No hay mensajes resueltos'}
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <div key={conv.id} className="p-4 hover:bg-neutral-900/50">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  conv.user_type === 'creator' ? 'bg-violet-500/30 text-violet-300' : 'bg-emerald-500/30 text-emerald-300'
                }`}>
                  {conv.user_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0" onClick={() => setSelectedConversation(conv)}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{conv.user_name}</p>
                    <span className="text-xs text-neutral-500">{formatTime(conv.last_message_at || conv.created_at)}</span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate">{conv.subject || 'Solicitud de soporte'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500">
                      {conv.user_type === 'creator' ? 'Creador' : 'Empresa'}
                    </span>
                    {conv.rating && (
                      <span className="text-xs text-yellow-400">{'★'.repeat(conv.rating)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {filter === 'pending' ? (
                    <button
                      onClick={() => resolveConversation(conv.id)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                      title="Resolver"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteConversation(conv.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
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
