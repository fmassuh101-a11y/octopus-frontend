'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateContractModal from '@/components/contracts/CreateContractModal'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface Conversation {
  creator_id: string
  creator_name: string
  creator_avatar?: string
  application_ids: string[]
  gig_ids: string[]
  gig_titles: string[]
  last_message?: string
  last_message_time?: string
  unread_count: number
  has_contract?: boolean
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

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-800 rounded ${className || ''}`} />
}

function ConversationSkeleton() {
  return (
    <div className="px-4 py-4 flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  )
}

function MessageSkeleton({ isMe }: { isMe: boolean }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <Skeleton className={`h-12 rounded-2xl ${isMe ? 'w-48' : 'w-56'}`} />
    </div>
  )
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
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
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

      const creatorAppsMap = new Map<string, { appIds: string[], gigIds: string[] }>()
      applications.forEach((app: any) => {
        const existing = creatorAppsMap.get(app.creator_id) || { appIds: [], gigIds: [] }
        existing.appIds.push(app.id)
        if (app.gig_id) existing.gigIds.push(app.gig_id)
        creatorAppsMap.set(app.creator_id, existing)
      })

      // Fetch gig titles
      const allGigIds = Array.from(new Set(applications.map((a: any) => a.gig_id).filter(Boolean)))
      let gigsMap = new Map<string, string>()
      if (allGigIds.length > 0) {
        const gigsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/gigs?id=in.(${allGigIds.join(',')})&select=id,title`,
          { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
        )
        if (gigsRes.ok) {
          const gigs = await gigsRes.json()
          gigs.forEach((g: any) => gigsMap.set(g.id, g.title))
        }
      }

      const creatorIds = Array.from(creatorAppsMap.keys())

      const creatorsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${creatorIds.join(',')})&select=user_id,full_name,username,bio,avatar_url`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )

      const creators = creatorsRes.ok ? await creatorsRes.json() : []

      // Also fetch from auth.users for email fallback
      const usersRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      ).catch(() => null)

      const usersEmailMap = new Map<string, string>()
      if (usersRes && usersRes.ok) {
        try {
          const usersData = await usersRes.json()
          if (usersData.users) {
            usersData.users.forEach((u: any) => {
              if (u.id && u.email) {
                usersEmailMap.set(u.id, u.email.split('@')[0])
              }
            })
          }
        } catch (e) {}
      }

      const creatorMap = new Map()
      creators.forEach((c: any) => {
        let name = 'Creador'

        // Try to get name from bio first
        if (c.bio) {
          try {
            const bioData = JSON.parse(c.bio)
            if (bioData.firstName && bioData.lastName) {
              name = `${bioData.firstName} ${bioData.lastName}`
            } else if (bioData.name) {
              name = bioData.name
            } else if (bioData.fullName) {
              name = bioData.fullName
            }
          } catch (e) {}
        }

        // If still default, try full_name
        if (name === 'Creador' && c.full_name && c.full_name.trim()) {
          name = c.full_name
        }

        // If still default, try username
        if (name === 'Creador' && c.username && c.username.trim()) {
          name = c.username
        }

        // If still default, try email prefix
        if (name === 'Creador') {
          const emailName = usersEmailMap.get(c.user_id)
          if (emailName) {
            name = emailName
          }
        }

        creatorMap.set(c.user_id, { name, avatar: c.avatar_url })
      })

      const allAppIds = Array.from(creatorAppsMap.values()).flatMap(d => d.appIds)
      const messagesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?conversation_id=in.(${allAppIds.join(',')})&select=conversation_id,content,created_at,sender_type,read_at&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY } }
      )
      const allMessages = messagesRes.ok ? await messagesRes.json() : []

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

      const convs: Conversation[] = Array.from(creatorAppsMap.entries()).map(([creatorId, data]) => {
        const lastMsg = creatorLastMessage.get(creatorId)
        const creatorInfo = creatorMap.get(creatorId) || { name: 'Creador', avatar: null }
        return {
          creator_id: creatorId,
          creator_name: creatorInfo.name,
          creator_avatar: creatorInfo.avatar,
          application_ids: data.appIds,
          gig_ids: data.gigIds,
          gig_titles: data.gigIds.map((gid: string) => gigsMap.get(gid) || 'Campaña'),
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
    setLoadingMessages(true)
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
        applicationIds.forEach(appId => markMessagesAsRead(appId, authToken!))
      } else {
        setMessages([])
      }
    } catch (err) {
      setMessages([])
    }
    setLoadingMessages(false)
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

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white pb-20">
        <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="divide-y divide-neutral-800">
          {[1,2,3,4,5].map(i => <ConversationSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  // Chat View
  if (selectedConversation) {
    const dateGroups = groupMessagesByDate(messages)

    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
        {/* Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-2 -ml-2 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {selectedConversation.creator_avatar ? (
              <img
                src={selectedConversation.creator_avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="font-semibold">{selectedConversation.creator_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-semibold">{selectedConversation.creator_name}</h1>
              <p className="text-xs text-neutral-500">Creador</p>
            </div>
            <button
              onClick={() => setShowContractModal(true)}
              className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
              title="Crear Contrato"
            >
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <Link
              href={`/company/creator/${selectedConversation.creator_id}`}
              className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Contract Modal */}
        <CreateContractModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          onSuccess={(contract) => {
            console.log('Contract created:', contract)
            loadMessages(selectedConversation.application_ids)
          }}
          applicationId={selectedConversation.application_ids[0]}
          gigId={selectedConversation.gig_ids?.[0] || ''}
          companyId={user?.id || ''}
          creatorId={selectedConversation.creator_id}
          creatorName={selectedConversation.creator_name}
          gigTitle={selectedConversation.gig_titles?.[0] || 'Campaña'}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loadingMessages ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <MessageSkeleton key={i} isMe={i % 2 === 0} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-neutral-500 text-sm">Envia el primer mensaje</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dateGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-neutral-800 rounded-full text-xs text-neutral-400">
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.messages.map((msg) => {
                      const isMe = msg.sender_type === 'company'
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${
                            isMe
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                              : 'bg-neutral-800 text-white'
                          } rounded-2xl px-4 py-2.5`}>
                            <p className="text-[15px] leading-relaxed">{msg.content}</p>
                            <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className="text-[11px] text-white/60">
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-white/60">
                                  {msg.read_at ? '✓✓' : '✓'}
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
        <div className="border-t border-neutral-800 bg-neutral-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl focus:outline-none focus:border-violet-500 text-sm transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/company/dashboard" className="p-2 -ml-2 hover:bg-neutral-800 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Mensajes</h1>
              {totalUnread > 0 && (
                <p className="text-sm text-violet-400">{totalUnread} sin leer</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Sin mensajes</h3>
          <p className="text-neutral-500 text-center mb-6 max-w-sm">
            Acepta aplicantes para comenzar a chatear con creadores
          </p>
          <Link
            href="/company/applicants"
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors"
          >
            Ver Aplicantes
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-neutral-800/50">
          {conversations.map((conv) => (
            <button
              key={conv.creator_id}
              onClick={() => selectConversation(conv)}
              className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-900/50 text-left transition-colors ${
                conv.unread_count > 0 ? 'bg-violet-500/5' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                {conv.creator_avatar ? (
                  <img
                    src={conv.creator_avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-lg">{conv.creator_name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                {conv.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-medium truncate ${conv.unread_count > 0 ? 'text-white' : 'text-neutral-300'}`}>
                    {conv.creator_name}
                  </h3>
                  <span className={`text-xs flex-shrink-0 ml-2 ${
                    conv.unread_count > 0 ? 'text-violet-400' : 'text-neutral-500'
                  }`}>
                    {conv.last_message_time ? formatTime(conv.last_message_time) : ''}
                  </span>
                </div>
                <p className={`text-sm truncate ${
                  conv.unread_count > 0 ? 'text-neutral-300' : 'text-neutral-500'
                }`}>
                  {conv.last_message || 'Sin mensajes'}
                </p>
              </div>
              <svg className="w-5 h-5 text-neutral-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
        <div className="flex justify-around py-3">
          {[
            { icon: '🏠', label: 'Dashboard', href: '/company/dashboard', active: false },
            { icon: '📝', label: 'Contratos', href: '/company/contracts', active: false },
            { icon: '💬', label: 'Mensajes', href: '/company/messages', active: true },
            { icon: '👥', label: 'Aplicantes', href: '/company/applicants', active: false },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-1 ${
                item.active ? 'text-violet-400' : 'text-neutral-500 hover:text-neutral-300'
              } transition-colors`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
