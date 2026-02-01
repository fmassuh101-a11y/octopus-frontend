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
  last_message?: string
  last_message_time?: string
  unread_count: number
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  sender_type: 'creator' | 'company'
  read_at?: string
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

      const creatorIds = Array.from(new Set(applications.map((a: any) => a.creator_id)))
      const gigIds = Array.from(new Set(applications.map((a: any) => a.gig_id)))

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

      const appIds = applications.map((a: any) => a.id)
      const messagesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=in.(${appIds.join(',')})&select=conversation_id,content,created_at,sender_type,read_at&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const allMessages = messagesRes.ok ? await messagesRes.json() : []

      const lastMessageMap = new Map()
      const unreadCountMap = new Map()

      allMessages.forEach((m: any) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, {
            content: m.content,
            time: m.created_at
          })
        }
        if (m.sender_type === 'creator' && !m.read_at) {
          unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) || 0) + 1)
        }
      })

      const convs: Conversation[] = applications.map((app: any) => {
        const lastMsg = lastMessageMap.get(app.id)
        return {
          id: app.id,
          company_id: userId,
          creator_id: app.creator_id,
          creator_name: creatorMap.get(app.creator_id) || 'Creador',
          gig_title: gigMap.get(app.gig_id) || 'Proyecto',
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.time,
          unread_count: unreadCountMap.get(app.id) || 0
        }
      })

      convs.sort((a, b) => {
        if (!a.last_message_time) return 1
        if (!b.last_message_time) return -1
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      })

      setConversations(convs)

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
        markMessagesAsRead(conversationId, authToken!)
      } else {
        setMessages([])
      }
    } catch (err) {
      console.error('Error loading messages:', err)
      setMessages([])
    }
  }

  const markMessagesAsRead = async (conversationId: string, token: string) => {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conversationId}&sender_type=eq.creator&read_at=is.null`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ read_at: new Date().toISOString() })
        }
      )
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const sendMessage = async () => {
    const content = newMessage.trim()
    if (!content || !selectedConversation || !user) return
    if (sending) return

    const tempId = `temp-${Date.now()}`

    const tempMsg: Message = {
      id: tempId,
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
        setError(`Error al enviar`)
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setNewMessage(content)
      } else if (Array.isArray(data) && data[0]) {
        setMessages(prev => prev.map(m => m.id === tempId ? data[0] : m))
      }
    } catch (err: any) {
      setError(`Error de conexion`)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(content)
    }
    setSending(false)
  }

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unread_count: 0 } : c
    ))
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

  // Smart timestamp formatting
  const formatSmartTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return d.toLocaleDateString('es-ES', { weekday: 'short' })
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateSeparator = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    if (isToday) return 'Hoy'
    if (isYesterday) return 'Ayer'
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // Group messages by date and sender
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string, messages: Message[] }[] = []

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString()
      const lastGroup = groups[groups.length - 1]

      if (lastGroup && new Date(lastGroup.messages[0].created_at).toDateString() === msgDate) {
        lastGroup.messages.push(msg)
      } else {
        groups.push({ date: msg.created_at, messages: [msg] })
      }
    })

    return groups
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Cargando mensajes...</p>
        </div>
      </div>
    )
  }

  // Chat View
  if (selectedConversation) {
    const dateGroups = groupMessagesByDate(messages)

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                <span className="text-white font-semibold text-lg">
                  {selectedConversation.creator_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{selectedConversation.creator_name}</h1>
              <p className="text-sm text-gray-500 truncate">{selectedConversation.gig_title}</p>
            </div>

            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Inicia la conversacion</h3>
                <p className="text-gray-500 text-center max-w-sm">
                  Envia un mensaje a {selectedConversation.creator_name} para discutir los detalles del proyecto.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {dateGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date Separator */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="px-4 py-1.5 bg-white rounded-full shadow-sm border border-gray-200">
                        <span className="text-xs font-medium text-gray-500">{formatDateSeparator(group.date)}</span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      {group.messages.map((msg, msgIndex) => {
                        const isMe = msg.sender_type === 'company'
                        const prevMsg = group.messages[msgIndex - 1]
                        const showAvatar = !prevMsg || prevMsg.sender_type !== msg.sender_type

                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && showAvatar && (
                              <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                <span className="text-white text-xs font-medium">
                                  {selectedConversation.creator_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {!isMe && !showAvatar && <div className="w-8 mr-2 flex-shrink-0"></div>}

                            <div
                              className={`max-w-[70%] ${
                                isMe
                                  ? 'bg-violet-600 text-white rounded-2xl rounded-br-sm border-2 border-violet-700 shadow-lg'
                                  : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm border-2 border-gray-200 shadow-md'
                              } px-4 py-3`}
                            >
                              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${isMe ? 'border-violet-500' : 'border-gray-100'} ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className={`text-[11px] ${isMe ? 'text-violet-200' : 'text-gray-400'}`}>
                                  {formatMessageTime(msg.created_at)}
                                </span>
                                {isMe && (
                                  <span className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${msg.read_at ? 'bg-blue-500/20 text-blue-200' : 'bg-violet-500/30 text-violet-200'}`}>
                                    {msg.read_at ? (
                                      <>
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                                        </svg>
                                        Visto
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                        </svg>
                                        Enviado
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* Professional Input Area */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <div className="flex-1 relative">
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
                  placeholder="Escribe un mensaje..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none transition-all text-gray-900 placeholder-gray-400"
                  disabled={sending}
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center hover:bg-violet-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Conversation List View
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin conversaciones</h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
              Acepta aplicantes para comenzar a chatear con creadores.
            </p>
            <Link
              href="/company/applicants"
              className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors shadow-md"
            >
              Ver Aplicantes
            </Link>
          </div>
        ) : (
          <div className="bg-white mt-4 mx-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {conversations.map((conv, index) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left ${
                  index > 0 ? 'border-t border-gray-100' : ''
                } ${conv.unread_count > 0 ? 'bg-violet-50/50' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                    <span className="text-white font-semibold text-lg">
                      {conv.creator_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {conv.creator_name}
                    </h3>
                    <span className={`text-xs flex-shrink-0 ml-2 ${conv.unread_count > 0 ? 'text-violet-600 font-semibold' : 'text-gray-400'}`}>
                      {conv.last_message_time ? formatSmartTime(conv.last_message_time) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate pr-4 ${conv.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {conv.last_message || conv.gig_title}
                    </p>
                    {conv.unread_count > 0 && (
                      <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{conv.unread_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto flex justify-around py-2">
          <Link href="/company/dashboard" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link href="/company/campaigns" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span className="text-xs mt-1">Campanas</span>
          </Link>
          <div className="flex flex-col items-center py-2 px-4 text-violet-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            <span className="text-xs mt-1 font-semibold">Mensajes</span>
          </div>
          <Link href="/company/applicants" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-xs mt-1">Aplicantes</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
