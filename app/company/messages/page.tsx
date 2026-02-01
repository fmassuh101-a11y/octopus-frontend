'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Conversation {
  creator_id: string
  creator_name: string
  application_ids: string[] // All applications with this creator
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
        `${SUPABASE_URL}/rest/v1/applications?company_id=eq.${userId}&status=eq.accepted&select=id,creator_id,gig_id`,
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

      // Group applications by creator_id (1 conversation per person)
      const creatorAppsMap = new Map<string, string[]>()
      applications.forEach((app: any) => {
        const existing = creatorAppsMap.get(app.creator_id) || []
        existing.push(app.id)
        creatorAppsMap.set(app.creator_id, existing)
      })

      const creatorIds = Array.from(creatorAppsMap.keys())

      const creatorsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,bio`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const creators = creatorsRes.ok ? await creatorsRes.json() : []

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

      // Get all messages for all applications
      const allAppIds = applications.map((a: any) => a.id)
      const messagesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=in.(${allAppIds.join(',')})&select=conversation_id,content,created_at,sender_type,read_at&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const allMessages = messagesRes.ok ? await messagesRes.json() : []

      // Map messages to creators
      const appToCreator = new Map<string, string>()
      applications.forEach((app: any) => {
        appToCreator.set(app.id, app.creator_id)
      })

      const creatorLastMessage = new Map()
      const creatorUnread = new Map()

      allMessages.forEach((m: any) => {
        const creatorId = appToCreator.get(m.conversation_id)
        if (!creatorId) return

        if (!creatorLastMessage.has(creatorId)) {
          creatorLastMessage.set(creatorId, { content: m.content, time: m.created_at })
        }
        if (m.sender_type === 'creator' && !m.read_at) {
          creatorUnread.set(creatorId, (creatorUnread.get(creatorId) || 0) + 1)
        }
      })

      // Build conversations (1 per creator)
      const convs: Conversation[] = Array.from(creatorAppsMap.entries()).map(([creatorId, appIds]) => {
        const lastMsg = creatorLastMessage.get(creatorId)
        return {
          creator_id: creatorId,
          creator_name: creatorMap.get(creatorId) || 'Creador',
          application_ids: appIds,
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.time,
          unread_count: creatorUnread.get(creatorId) || 0
        }
      })

      convs.sort((a, b) => {
        if (!a.last_message_time) return 1
        if (!b.last_message_time) return -1
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      })

      setConversations(convs)

      const creatorId = searchParams.get('creator')
      if (creatorId) {
        const conv = convs.find(c => c.creator_id === creatorId)
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
    } catch (err) {}
  }

  const sendMessage = async () => {
    const content = newMessage.trim()
    if (!content || !selectedConversation || !user) return
    if (sending) return

    // Use first application_id for sending
    const conversationId = selectedConversation.application_ids[0]
    const tempId = `temp-${Date.now()}`

    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: 'company',
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])
    setNewMessage('')
    setSending(true)

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
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'company',
          content: content
        })
      })

      const data = await res.json()

      if (res.ok && Array.isArray(data) && data[0]) {
        setMessages(prev => prev.map(m => m.id === tempId ? data[0] : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setNewMessage(content)
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(content)
    }
    setSending(false)
  }

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    setConversations(prev => prev.map(c =>
      c.creator_id === conv.creator_id ? { ...c, unread_count: 0 } : c
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Chat View
  if (selectedConversation) {
    const dateGroups = groupMessagesByDate(messages)

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{selectedConversation.creator_name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">{selectedConversation.creator_name}</h1>
              <p className="text-xs text-gray-500">Creador</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Envia el primer mensaje</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dateGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 shadow-sm">
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.messages.map((msg) => {
                      const isMe = msg.sender_type === 'company'
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${isMe ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-900'} rounded-2xl px-4 py-2 shadow-sm`}>
                            <p className="text-[15px] leading-relaxed">{msg.content}</p>
                            <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className={`text-[11px] ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {isMe && (
                                <span className={`text-[10px] ${msg.read_at ? 'text-blue-400' : 'text-gray-500'}`}>
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
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:border-black text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
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
        </div>
      </div>
    )
  }

  // Conversation List
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Sin mensajes</h3>
          <p className="text-gray-500 text-sm text-center">Acepta aplicantes para comenzar a chatear</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {conversations.map((conv) => (
            <button
              key={conv.creator_id}
              onClick={() => selectConversation(conv)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left ${conv.unread_count > 0 ? 'bg-blue-50' : ''}`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-lg">{conv.creator_name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {conv.creator_name}
                  </h3>
                  <span className={`text-xs ${conv.unread_count > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {conv.last_message_time ? formatTime(conv.last_message_time) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-sm truncate pr-2 ${conv.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {conv.last_message || 'Sin mensajes'}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
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
          <div className="flex flex-col items-center py-2 px-4 text-black">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
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
