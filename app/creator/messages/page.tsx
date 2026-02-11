'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config/supabase'

interface Conversation {
  company_id: string
  company_name: string
  application_ids: string[] // All applications with this company
  last_message?: string
  last_message_time?: string
  unread_count: number
  has_company_message: boolean // Creator can only respond if company sent first
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

export default function CreatorMessagesPage() {
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
    if (selectedConversation && inputRef.current && messages.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [selectedConversation, messages])

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
      const appsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?creator_id=eq.${userId}&status=eq.accepted&select=id,company_id,gig_id`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (!appsResponse.ok) {
        setLoading(false)
        return
      }

      const applications = await appsResponse.json()

      if (applications.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Group applications by company_id (1 conversation per company)
      const companyAppsMap = new Map<string, string[]>()
      applications.forEach((app: any) => {
        const existing = companyAppsMap.get(app.company_id) || []
        existing.push(app.id)
        companyAppsMap.set(app.company_id, existing)
      })

      const companyIds = Array.from(companyAppsMap.keys())
      const allAppIds = applications.map((a: any) => a.id)
      const headers = { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }

      // PARALLEL: Fetch companies and messages at the same time
      const [companiesRes, messagesRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${companyIds.join(',')})&select=user_id,full_name`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/messages?conversation_id=in.(${allAppIds.join(',')})&select=conversation_id,content,created_at,sender_type,read_at&order=created_at.desc&limit=100`, { headers })
      ])

      const companies = companiesRes.ok ? await companiesRes.json() : []
      const companyMap = new Map<string, string>(companies.map((c: any) => [c.user_id, c.full_name || 'Empresa']))
      const allMessages = messagesRes.ok ? await messagesRes.json() : []

      // Map messages to companies
      const appToCompany = new Map<string, string>()
      applications.forEach((app: any) => {
        appToCompany.set(app.id, app.company_id)
      })

      const companyLastMessage = new Map()
      const companyUnread = new Map()
      const companyHasMessage = new Map()

      allMessages.forEach((m: any) => {
        const companyId = appToCompany.get(m.conversation_id)
        if (!companyId) return

        if (!companyLastMessage.has(companyId)) {
          companyLastMessage.set(companyId, { content: m.content, time: m.created_at })
        }
        if (m.sender_type === 'company' && !m.read_at) {
          companyUnread.set(companyId, (companyUnread.get(companyId) || 0) + 1)
        }
        if (m.sender_type === 'company') {
          companyHasMessage.set(companyId, true)
        }
      })

      // Build conversations (1 per company)
      const convs: Conversation[] = Array.from(companyAppsMap.entries()).map(([companyId, appIds]) => {
        const lastMsg = companyLastMessage.get(companyId)
        return {
          company_id: companyId,
          company_name: companyMap.get(companyId) || 'Empresa',
          application_ids: appIds,
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.time,
          unread_count: companyUnread.get(companyId) || 0,
          has_company_message: companyHasMessage.get(companyId) || false
        }
      })

      convs.sort((a, b) => {
        if (!a.last_message_time) return 1
        if (!b.last_message_time) return -1
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      })

      setConversations(convs)

      const companyId = searchParams.get('company')
      if (companyId) {
        const conv = convs.find(c => c.company_id === companyId)
        if (conv) {
          setSelectedConversation(conv)
          await loadMessages(conv.application_ids, token)
        }
      }

    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (applicationIds: string[], token?: string) => {
    try {
      const authToken = token || localStorage.getItem('sb-access-token')
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=in.(${applicationIds.join(',')})&select=*&order=created_at.asc`,
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
        // Mark all as read
        applicationIds.forEach(appId => markMessagesAsRead(appId, authToken!))
      } else {
        setMessages([])
      }
    } catch (err) {
      setMessages([])
    }
  }

  const markMessagesAsRead = async (conversationId: string, token: string) => {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=eq.${conversationId}&sender_type=eq.company&read_at=is.null`,
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
    } catch (err) {}
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return
    if (messages.length === 0) return // Can't send if company hasn't sent first

    const content = newMessage.trim()
    const conversationId = selectedConversation.application_ids[0]
    const tempId = `temp-${Date.now()}`

    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: 'creator',
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])
    setNewMessage('')
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
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'creator',
          content: content
        })
      })

      if (response.ok) {
        const newMsg = await response.json()
        setMessages(prev => prev.map(m => m.id === tempId ? newMsg[0] : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setNewMessage(content)
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    setConversations(prev => prev.map(c =>
      c.company_id === conv.company_id ? { ...c, unread_count: 0 } : c
    ))
    await loadMessages(conv.application_ids)
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateSeparator = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Hoy'
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }

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
      <div className="min-h-screen bg-neutral-950 pb-20">
        <div className="border-b border-neutral-800 px-4 py-4">
          <div className="h-7 w-28 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-neutral-800">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-neutral-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-neutral-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-10 bg-neutral-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Chat View
  if (selectedConversation) {
    const canSendMessage = messages.length > 0
    const dateGroups = groupMessagesByDate(messages)

    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col">
        {/* Header */}
        <div className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 hover:bg-neutral-800 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{selectedConversation.company_name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-white">{selectedConversation.company_name}</h1>
              <p className="text-xs text-neutral-400">Empresa</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-neutral-900 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-1">Esperando a {selectedConversation.company_name}</h3>
              <p className="text-neutral-400 text-sm">La empresa te escribira pronto</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dateGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-full text-xs text-neutral-400 shadow-sm">
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.messages.map((msg) => {
                      const isMe = msg.sender_type === 'creator'
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${isMe ? 'bg-emerald-500 text-white' : 'bg-neutral-950 border border-neutral-800 text-white'} rounded-2xl px-4 py-2 shadow-sm`}>
                            <p className="text-[15px] leading-relaxed">{msg.content}</p>
                            <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className={`text-[11px] ${isMe ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {isMe && (
                                <span className={`text-[10px] ${msg.read_at ? 'text-emerald-400' : 'text-neutral-400'}`}>
                                  {msg.read_at ? '✓✓ Visto' : '✓ Enviado'}
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

        {/* Input */}
        <div className="border-t border-neutral-800 bg-neutral-950 px-4 py-3">
          {canSendMessage ? (
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2.5 border border-neutral-700 rounded-full focus:outline-none focus:border-emerald-500 text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center disabled:bg-neutral-700 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-neutral-500 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Esperando mensaje de la empresa</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Conversation List
  return (
    <div className="min-h-screen bg-neutral-950 pb-20">
      <div className="border-b border-neutral-800 px-4 py-4">
        <h1 className="text-xl font-bold text-white">Mensajes</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Sin mensajes</h3>
          <p className="text-neutral-400 text-sm text-center">Aplica a trabajos para comenzar a chatear</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-800">
          {conversations.map((conv) => (
            <button
              key={conv.company_id}
              onClick={() => selectConversation(conv)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-800 text-left ${conv.unread_count > 0 ? 'bg-blue-50' : ''}`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-lg">{conv.company_name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium truncate ${conv.unread_count > 0 ? 'text-white' : 'text-neutral-300'}`}>
                    {conv.company_name}
                  </h3>
                  <span className={`text-xs ${conv.unread_count > 0 ? 'text-emerald-400 font-medium' : 'text-neutral-500'}`}>
                    {conv.last_message_time ? formatTime(conv.last_message_time) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-sm truncate pr-2 ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-neutral-400'}`}>
                    {conv.last_message || 'Sin mensajes'}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-950 border-t border-neutral-800">
        <div className="flex justify-around py-2">
          <Link href="/gigs" className="flex flex-col items-center py-2 px-4 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">Trabajos</span>
          </Link>
          <Link href="/creator/contracts" className="flex flex-col items-center py-2 px-4 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1">Contratos</span>
          </Link>
          <div className="flex flex-col items-center py-2 px-4 text-black">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            <span className="text-xs mt-1 font-medium">Mensajes</span>
          </div>
          <Link href="/creator/profile" className="flex flex-col items-center py-2 px-4 text-neutral-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Perfil</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
