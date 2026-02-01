'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Conversation {
  id: string
  company_id: string
  creator_id: string
  creator_name: string
  gig_title: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  sender_type: 'creator' | 'company'
}

export default function CompanyMessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (selectedConversation && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [selectedConversation])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('sb-access-token')
      const userStr = localStorage.getItem('sb-user')

      if (!token || !userStr) {
        router.push('/auth/login')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)
      await loadConversations(userData.id, token)
    } catch (err) {
      console.error('Auth error:', err)
      setError('Error de autenticacion')
      setLoading(false)
    }
  }

  const loadConversations = async (userId: string, token: string) => {
    try {
      // Get accepted applications
      const appsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&status=eq.accepted&select=id,creator_id,gig_id`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!appsResponse.ok) {
        throw new Error('Failed to load applications')
      }

      const applications = await appsResponse.json()

      if (applications.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Get all creator IDs and gig IDs
      const creatorIds = Array.from(new Set(applications.map((a: any) => a.creator_id)))
      const gigIds = Array.from(new Set(applications.map((a: any) => a.gig_id)))

      // Fetch creators and gigs in parallel
      const [creatorsRes, gigsRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,bio`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/gigs?id=in.(${gigIds.join(',')})&select=id,title`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
      ])

      const creators = creatorsRes.ok ? await creatorsRes.json() : []
      const gigs = gigsRes.ok ? await gigsRes.json() : []

      // Create lookup maps
      const creatorMap = new Map()
      creators.forEach((c: any) => {
        let name = c.full_name || 'Creador'
        if (c.bio) {
          try {
            const bioData = JSON.parse(c.bio)
            if (bioData.firstName && bioData.lastName) {
              name = `${bioData.firstName} ${bioData.lastName}`
            }
          } catch (e) {}
        }
        creatorMap.set(c.user_id, name)
      })

      const gigMap = new Map()
      gigs.forEach((g: any) => gigMap.set(g.id, g.title))

      // Build conversations
      const convs: Conversation[] = applications.map((app: any) => ({
        id: app.id,
        company_id: userId,
        creator_id: app.creator_id,
        creator_name: creatorMap.get(app.creator_id) || 'Creador',
        gig_title: gigMap.get(app.gig_id) || 'Proyecto'
      }))

      setConversations(convs)

      // Auto-select conversation from URL params
      const applicationId = searchParams.get('application')
      const creatorId = searchParams.get('creator')

      let targetConv: Conversation | undefined

      if (applicationId) {
        targetConv = convs.find(c => c.id === applicationId)
      } else if (creatorId) {
        targetConv = convs.find(c => c.creator_id === creatorId)
      }

      if (targetConv) {
        setSelectedConversation(targetConv)
        await loadMessages(targetConv.id, token)
      }

    } catch (err) {
      console.error('Error loading conversations:', err)
      setError('Error cargando conversaciones')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string, token?: string) => {
    try {
      const authToken = token || localStorage.getItem('sb-access-token')
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      } else {
        setMessages([])
      }
    } catch (err) {
      console.error('Error loading messages:', err)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    const content = newMessage.trim()
    if (!content || !selectedConversation || !user) {
      alert('No se puede enviar: faltan datos')
      return
    }
    if (sending) return

    // Show message immediately
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      sender_type: 'company',
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])
    setNewMessage('')
    setSending(true)
    setError('')

    const token = localStorage.getItem('sb-access-token')

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_type: 'company',
          content: content
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(`Error ${res.status}: ${JSON.stringify(data)}`)
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        setNewMessage(content)
      } else if (Array.isArray(data) && data[0]) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data[0] : m))
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`)
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setNewMessage(content)
    }
    setSending(false)
  }

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    await loadMessages(conv.id)
  }

  const handleBack = () => {
    if (selectedConversation) {
      if (searchParams.get('application') || searchParams.get('creator')) {
        router.push('/company/applicants')
      } else {
        setSelectedConversation(null)
      }
    } else {
      router.back()
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Full-screen chat when conversation selected
  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{selectedConversation.creator_name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-gray-900">{selectedConversation.creator_name}</h1>
              <p className="text-xs text-gray-500">{selectedConversation.gig_title}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Escribe a {selectedConversation.creator_name}
              </h3>
              <p className="text-gray-500 text-sm">Envia tu primer mensaje</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_type === 'company'
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div className={`px-4 py-3 rounded-2xl ${
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4 pb-6">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={`Escribe a ${selectedConversation.creator_name}...`}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Conversation list view
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin conversaciones</h3>
          <p className="text-gray-500 text-center mb-6">Acepta aplicantes para chatear</p>
          <Link href="/company/applicants" className="px-6 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700">
            Ver Aplicantes
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 text-left"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">{conv.creator_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{conv.creator_name}</h3>
                <p className="text-sm text-gray-500">{conv.gig_title}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-2">
          <Link href="/company/dashboard" className="flex flex-col items-center py-2 px-4 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link href="/company/campaigns" className="flex flex-col items-center py-2 px-4 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span className="text-xs mt-1">Campanas</span>
          </Link>
          <div className="flex flex-col items-center py-2 px-4 text-purple-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
            <span className="text-xs mt-1 font-medium">Mensajes</span>
          </div>
          <Link href="/company/applicants" className="flex flex-col items-center py-2 px-4 text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-xs mt-1">Aplicantes</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
