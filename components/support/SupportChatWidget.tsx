'use client'

import { useState, useEffect, useRef } from 'react'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

const QUICK_SUGGESTIONS = [
  { id: 'payment', label: 'Problemas de pago' },
  { id: 'contract', label: 'Contratos' },
  { id: 'dispute', label: 'Reportar disputa' },
  { id: 'how', label: 'Como funciona' },
]

interface ChatMessage {
  id: string
  type: 'bot' | 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
}

interface SavedChat {
  id: string
  name: string
  messages: ChatMessage[]
  isEscalated: boolean
  isResolved: boolean
  conversationId: string | null
  createdAt: Date
  updatedAt: Date
}

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isEscalated, setIsEscalated] = useState(false)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [showChatList, setShowChatList] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [isResolved, setIsResolved] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resolvedShownRef = useRef(false)

  // Load user and saved chats on mount
  useEffect(() => {
    const loadUserData = async () => {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (userStr && token) {
        const userData = JSON.parse(userStr)
        try {
          const profileRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userData.id}&select=full_name,user_type`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
              }
            }
          )
          if (profileRes.ok) {
            const profiles = await profileRes.json()
            if (profiles.length > 0) {
              setUser({ ...userData, ...profiles[0] })
              loadSavedChats(userData.id)
              return
            }
          }
        } catch (err) {
          console.error('Error loading profile:', err)
        }
        setUser(userData)
        loadSavedChats(userData.id)
      }
    }
    loadUserData()
  }, [])

  // Load saved chats from localStorage
  const loadSavedChats = (userId: string) => {
    const saved = localStorage.getItem(`octopus-chats-${userId}`)
    if (saved) {
      const chats = JSON.parse(saved).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }))
      setSavedChats(chats)
    }
  }

  // Save chats to localStorage
  const saveChatsToStorage = (chats: SavedChat[]) => {
    if (!user?.id) return
    localStorage.setItem(`octopus-chats-${user.id}`, JSON.stringify(chats))
  }

  // Save current chat
  const saveCurrentChat = (newMessages?: ChatMessage[]) => {
    if (!user?.id) return

    const messagesToSave = newMessages || messages
    if (messagesToSave.length <= 1) return // Don't save empty chats

    const chatName = generateChatName(messagesToSave)

    let updatedChats: SavedChat[]

    if (currentChatId) {
      // Update existing chat
      updatedChats = savedChats.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: messagesToSave, updatedAt: new Date(), isEscalated, isResolved, conversationId }
          : chat
      )
    } else {
      // Create new chat
      const newChat: SavedChat = {
        id: `chat-${Date.now()}`,
        name: chatName,
        messages: messagesToSave,
        isEscalated,
        isResolved,
        conversationId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setCurrentChatId(newChat.id)
      updatedChats = [newChat, ...savedChats]
    }

    setSavedChats(updatedChats)
    saveChatsToStorage(updatedChats)
  }

  // Generate chat name from first user message
  const generateChatName = (msgs: ChatMessage[]): string => {
    const firstUserMsg = msgs.find(m => m.type === 'user')
    if (firstUserMsg) {
      const text = firstUserMsg.content.slice(0, 30)
      return text.length < firstUserMsg.content.length ? `${text}...` : text
    }
    return `Chat ${new Date().toLocaleDateString('es-ES')}`
  }

  // Load a saved chat
  const loadChat = (chat: SavedChat) => {
    setMessages(chat.messages)
    setCurrentChatId(chat.id)
    setIsEscalated(chat.isEscalated)
    setIsResolved(chat.isResolved || false)
    setConversationId(chat.conversationId)
    setShowChatList(false)
    setShowRating(false)
    setSelectedRating(0)
    setHoverRating(0)
    setRatingSubmitted(chat.isResolved || false)
    setShowEndConfirm(false)
    resolvedShownRef.current = chat.isResolved || false
  }

  // Start new chat
  const startNewChat = () => {
    // Save current chat before starting new one
    if (messages.length > 1) {
      saveCurrentChat()
    }

    setMessages([])
    setCurrentChatId(null)
    setIsEscalated(false)
    setConversationId(null)
    setShowChatList(false)
    setShowRating(false)
    setSelectedRating(0)
    setHoverRating(0)
    setIsResolved(false)
    setRatingSubmitted(false)
    setShowEndConfirm(false)
    resolvedShownRef.current = false
  }

  // Delete a chat
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updatedChats = savedChats.filter(c => c.id !== chatId)
    setSavedChats(updatedChats)
    saveChatsToStorage(updatedChats)

    if (currentChatId === chatId) {
      startNewChat()
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: 'Hola, soy el asistente de Octopus. En que puedo ayudarte?',
        timestamp: new Date()
      }
      setMessages([welcomeMsg])
    }
  }, [isOpen, messages.length])

  useEffect(() => {
    if (!conversationId || !isEscalated || isResolved) return

    const interval = setInterval(async () => {
      await checkForAgentMessages()
    }, 8000)

    return () => clearInterval(interval)
  }, [conversationId, isEscalated, isResolved])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkForAgentMessages = async () => {
    if (!conversationId || isResolved || resolvedShownRef.current) return

    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      // Check conversation status
      const statusRes = await fetch(
        `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${conversationId}&select=status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (statusRes.ok) {
        const convData = await statusRes.json()
        if (convData.length > 0 && convData[0].status === 'resolved' && !resolvedShownRef.current) {
          resolvedShownRef.current = true
          setMessages(prev => [...prev, {
            id: `resolved-${Date.now()}`,
            type: 'system' as const,
            content: 'El agente ha marcado esta conversacion como resuelta.',
            timestamp: new Date()
          }])
          setIsResolved(true)
          setShowRating(true)
          return
        }
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${conversationId}&sender_type=eq.agent&order=created_at.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const agentMessages = await response.json()
        if (agentMessages.length > 0) {
          const latestAgent = agentMessages[0]
          setMessages(prev => {
            const exists = prev.some(m => m.id === latestAgent.id)
            if (exists) return prev
            const agentMsg: ChatMessage = {
              id: latestAgent.id,
              type: 'agent',
              content: latestAgent.content,
              timestamp: new Date(latestAgent.created_at)
            }
            const newMessages = [...prev, agentMsg]
            // Show notification if chat is closed
            if (!isOpen) {
              setHasNewMessage(true)
            }
            return newMessages
          })
        }
      }
    } catch (err) {
      console.error('Error checking agent messages:', err)
    }
  }

  const handleEndConversation = async () => {
    setShowEndConfirm(false)

    if (conversationId) {
      try {
        const token = localStorage.getItem('sb-access-token')
        if (token) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${conversationId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
              },
              body: JSON.stringify({ status: 'resolved', resolved_at: new Date().toISOString() })
            }
          )
        }
      } catch (err) {
        console.error('Error ending conversation:', err)
      }
    }

    setIsResolved(true)
    setShowRating(true)
    const endMsg: ChatMessage = {
      id: `end-${Date.now()}`,
      type: 'system',
      content: 'Conversacion finalizada.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, endMsg])
  }

  const submitRating = async () => {
    if (selectedRating === 0) return

    if (conversationId) {
      try {
        const token = localStorage.getItem('sb-access-token')
        if (token) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${conversationId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
              },
              body: JSON.stringify({ rating: selectedRating })
            }
          )
        }
      } catch (err) {
        console.error('Error saving rating:', err)
      }
    }

    setRatingSubmitted(true)
    setShowRating(false)

    const thankMsg: ChatMessage = {
      id: `thank-${Date.now()}`,
      type: 'system',
      content: `Gracias por tu calificacion de ${selectedRating} estrella${selectedRating > 1 ? 's' : ''}.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thankMsg])
    saveCurrentChat()
  }

  const sendToAI = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.slice(-8).map(m => ({
            type: m.type,
            content: m.content
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.reply || 'No pude procesar tu mensaje.'
      }
      return 'Error de conexion. Intenta de nuevo.'
    } catch (err) {
      console.error('Error calling AI:', err)
      return 'Error de conexion. Intenta de nuevo.'
    }
  }

  const handleSendMessage = async () => {
    const message = inputValue.trim()
    if (!message || isTyping) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInputValue('')
    setIsTyping(true)

    if (conversationId) {
      await saveMessageToDb(message, 'user')
    }

    if (isEscalated) {
      setIsTyping(false)
      saveCurrentChat(newMessages)
      return
    }

    const aiResponse = await sendToAI(message)
    setIsTyping(false)

    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content: aiResponse,
      timestamp: new Date()
    }
    const finalMessages = [...newMessages, botMsg]
    setMessages(finalMessages)
    saveCurrentChat(finalMessages)

    if (conversationId) {
      await saveMessageToDb(aiResponse, 'bot')
    }
  }

  const handleSuggestionClick = async (label: string) => {
    if (isTyping) return

    const messageMap: Record<string, string> = {
      'Problemas de pago': 'Tengo un problema con un pago',
      'Contratos': 'Tengo una pregunta sobre contratos',
      'Reportar disputa': 'Quiero reportar una disputa',
      'Como funciona': 'Como funciona Octopus?'
    }

    const message = messageMap[label] || label

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsTyping(true)

    const aiResponse = await sendToAI(message)
    setIsTyping(false)

    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content: aiResponse,
      timestamp: new Date()
    }
    const finalMessages = [...newMessages, botMsg]
    setMessages(finalMessages)
    saveCurrentChat(finalMessages)
  }

  const handleEscalateToAgent = async () => {
    if (isEscalated) return

    setIsEscalated(true)

    const convId = await createConversation()
    if (!convId) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'No se pudo conectar con soporte. Intenta mas tarde.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      setIsEscalated(false)
      return
    }

    // Save all previous messages to DB with the new conversation ID
    for (const msg of messages) {
      if (msg.type === 'user' || msg.type === 'bot') {
        await saveMessageToDbDirect(convId, msg.content, msg.type)
      }
    }

    const escalateMsg: ChatMessage = {
      id: `escalate-${Date.now()}`,
      type: 'system',
      content: 'Te hemos conectado con soporte. Un agente revisara tu caso y te respondera en las proximas horas. Puedes seguir escribiendo.',
      timestamp: new Date()
    }
    const newMessages = [...messages, escalateMsg]
    setMessages(newMessages)
    saveCurrentChat(newMessages)
  }

  const createConversation = async (): Promise<string | null> => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token || !user) return null

      const response = await fetch(`${SUPABASE_URL}/rest/v1/support_conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.full_name || 'Usuario',
          user_type: user.user_type || 'creator',
          status: 'waiting_agent',
          subject: 'Solicitud de soporte'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const conversation = Array.isArray(data) ? data[0] : data
        setConversationId(conversation.id)
        return conversation.id
      } else {
        const err = await response.text()
        console.error('Create conversation error:', err)
      }
    } catch (err) {
      console.error('Error creating conversation:', err)
    }
    return null
  }

  const saveMessageToDb = async (content: string, senderType: 'user' | 'bot' | 'agent') => {
    if (!conversationId) return
    await saveMessageToDbDirect(conversationId, content, senderType)
  }

  const saveMessageToDbDirect = async (convId: string, content: string, senderType: 'user' | 'bot' | 'agent') => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      await fetch(`${SUPABASE_URL}/rest/v1/support_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          conversation_id: convId,
          sender_type: senderType,
          sender_id: senderType === 'user' ? user?.id : null,
          content
        })
      })
    } catch (err) {
      console.error('Error saving message:', err)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)

    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} dias`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      {/* Chat Button with notification badge */}
      <button
        onClick={() => { setIsOpen(!isOpen); setHasNewMessage(false) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-neutral-900 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-neutral-800 transition-all z-40 border border-neutral-700"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
            !
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-12rem)] bg-neutral-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40 border border-neutral-800">
          {/* Header */}
          <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChatList(!showChatList)}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Ver chats"
                >
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h3 className="font-semibold text-white text-sm">Soporte Octopus</h3>
                  <p className="text-xs text-neutral-400">
                    {isEscalated ? 'Conectado con agente' : 'Asistente virtual'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startNewChat}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Nuevo chat"
                >
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div className={`w-2 h-2 rounded-full ${isEscalated ? 'bg-emerald-500' : 'bg-emerald-500'}`}></div>
              </div>
            </div>
          </div>

          {/* Chat List Sidebar */}
          {showChatList && (
            <div className="absolute top-[52px] left-0 right-0 bottom-0 bg-neutral-950 z-10 flex flex-col">
              <div className="p-3 border-b border-neutral-800">
                <h4 className="text-sm font-medium text-white">Tus conversaciones</h4>
              </div>
              <div className="flex-1 overflow-y-auto">
                {savedChats.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500 text-sm">
                    No tienes conversaciones guardadas
                  </div>
                ) : (
                  savedChats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => loadChat(chat)}
                      className={`w-full p-3 text-left hover:bg-neutral-900 border-b border-neutral-800/50 flex items-start justify-between gap-2 ${
                        currentChatId === chat.id ? 'bg-neutral-900' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{chat.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {formatDate(chat.updatedAt)} {chat.isEscalated && '• Con agente'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </button>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-neutral-800">
                <button
                  onClick={() => setShowChatList(false)}
                  className="w-full py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                    msg.type === 'user'
                      ? 'bg-emerald-600 text-white'
                      : msg.type === 'agent'
                      ? 'bg-sky-600 text-white'
                      : msg.type === 'system'
                      ? 'bg-neutral-800 text-neutral-300 text-center w-full'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {msg.type === 'agent' && (
                    <p className="text-xs text-sky-200 mb-1 font-medium">Soporte Octopus</p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1.5 ${
                    msg.type === 'user' ? 'text-emerald-200' :
                    msg.type === 'agent' ? 'text-sky-200' : 'text-neutral-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-neutral-800 rounded-xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length <= 1 && !isEscalated && (
            <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900">
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestionClick(s.label)}
                    disabled={isTyping}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-300 transition-colors disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Escalate Button */}
          {messages.length > 2 && !isEscalated && (
            <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900">
              <button
                onClick={handleEscalateToAgent}
                className="w-full py-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Hablar con un agente
              </button>
            </div>
          )}

          {/* End Conversation Button */}
          {isEscalated && !isResolved && !showRating && (
            <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900">
              <button
                onClick={() => setShowEndConfirm(true)}
                className="w-full py-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Finalizar conversacion
              </button>
            </div>
          )}

          {/* End Confirmation Dialog */}
          {showEndConfirm && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
              <div className="bg-neutral-900 rounded-xl p-5 max-w-xs w-full border border-neutral-700">
                <h4 className="text-white font-semibold text-center mb-2">Finalizar conversacion?</h4>
                <p className="text-neutral-400 text-sm text-center mb-4">
                  Seguro que quieres finalizar esta conversacion de soporte?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEndConversation}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rating UI */}
          {showRating && !ratingSubmitted && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
              <div className="bg-neutral-900 rounded-xl p-5 max-w-xs w-full border border-neutral-700">
                <h4 className="text-white font-semibold text-center mb-2">Como fue tu experiencia?</h4>
                <p className="text-neutral-400 text-sm text-center mb-4">
                  Califica tu atencion de soporte
                </p>
                <div className="flex justify-center gap-2 mb-5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <svg
                        className={`w-10 h-10 ${
                          star <= (hoverRating || selectedRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-neutral-600'
                        } transition-colors`}
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
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRating(false); setRatingSubmitted(true) }}
                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Omitir
                  </button>
                  <button
                    onClick={submitRating}
                    disabled={selectedRating === 0}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-900">
            {isResolved && ratingSubmitted ? (
              <button
                onClick={startNewChat}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Iniciar nueva conversacion
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={isEscalated ? "Escribe al agente..." : "Escribe tu mensaje..."}
                  disabled={isTyping || isResolved}
                  className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping || isResolved}
                  className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
