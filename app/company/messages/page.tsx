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
  creator_name?: string
  creator_avatar?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
  gig_title?: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const checkAuth = async () => {
    const token = localStorage.getItem('sb-access-token')
    const userStr = localStorage.getItem('sb-user')

    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    const userData = JSON.parse(userStr)
    setUser(userData)
    await loadConversations(userData.id, token)
  }

  const loadConversations = async (userId: string, token: string) => {
    try {
      // Cargar aplicaciones aceptadas de esta empresa
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&status=eq.accepted&select=*,gig:gigs(title),creator:profiles!applications_creator_id_fkey(full_name)&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const convs: Conversation[] = data.map((app: any) => ({
          id: app.id,
          company_id: app.company_id,
          creator_id: app.creator_id,
          creator_name: app.creator?.full_name || 'Creador',
          gig_title: app.gig?.title
        }))
        setConversations(convs)

        // Si hay un creator_id en la URL, abrir esa conversación
        const creatorId = searchParams.get('creator')
        if (creatorId) {
          const conv = convs.find(c => c.creator_id === creatorId)
          if (conv) {
            setSelectedConversation(conv)
            await loadMessages(conv.id, token)
          }
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
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
    if (!newMessage.trim() || !selectedConversation || !user) return

    setSending(true)
    try {
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
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
          content: newMessage.trim()
        })
      })

      if (response.ok) {
        const newMsg = await response.json()
        setMessages(prev => [...prev, newMsg[0]])
        setNewMessage('')
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    await loadMessages(conv.id)
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mensajes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            {selectedConversation ? (
              <>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {selectedConversation.creator_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">{selectedConversation.creator_name}</h1>
                  <p className="text-sm text-gray-500">{selectedConversation.gig_title}</p>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/company/dashboard"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 bg-white border-r border-gray-200`}>
          {conversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sin conversaciones</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Acepta aplicaciones de creadores para comenzar a comunicarte.
                </p>
                <Link
                  href="/company/campaigns"
                  className="text-purple-600 font-medium hover:underline"
                >
                  Ver campanas
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full p-4 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.id === conv.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {conv.creator_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">{conv.creator_name}</h3>
                      {conv.last_message_at && (
                        <span className="text-xs text-gray-400">{formatDate(conv.last_message_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{conv.gig_title}</p>
                  </div>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{conv.unread_count}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-4">💬</div>
                    <p className="text-gray-500">Inicia la conversacion</p>
                    <p className="text-sm text-gray-400">Escribe un mensaje para comenzar</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_type === 'company'
                  const showDate = index === 0 ||
                    new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-2'}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isMe
                                ? 'bg-purple-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className={`text-xs text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecciona una conversacion</h3>
              <p className="text-gray-500">Elige un creador para ver los mensajes</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Only show when no conversation selected on mobile */}
      {!selectedConversation && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex justify-around py-2">
            <Link href="/company/dashboard" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs font-medium mt-1">Dashboard</span>
            </Link>

            <Link href="/company/campaigns" className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs font-medium mt-1">Campanas</span>
            </Link>

            <div className="flex flex-col items-center py-2 px-4 text-purple-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium mt-1">Mensajes</span>
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
      )}
    </div>
  )
}
