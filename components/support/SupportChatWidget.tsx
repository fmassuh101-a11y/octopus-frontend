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

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isEscalated, setIsEscalated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
              return
            }
          }
        } catch (err) {
          console.error('Error loading profile:', err)
        }
        setUser(userData)
      }
    }
    loadUserData()
  }, [])

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
    if (!conversationId || !isEscalated) return

    const interval = setInterval(async () => {
      await checkForAgentMessages()
    }, 8000)

    return () => clearInterval(interval)
  }, [conversationId, isEscalated])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkForAgentMessages = async () => {
    if (!conversationId) return

    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

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
          const exists = messages.some(m => m.id === latestAgent.id)
          if (!exists) {
            const agentMsg: ChatMessage = {
              id: latestAgent.id,
              type: 'agent',
              content: latestAgent.content,
              timestamp: new Date(latestAgent.created_at)
            }
            setMessages(prev => [...prev, agentMsg])
          }
        }
      }
    } catch (err) {
      console.error('Error checking agent messages:', err)
    }
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
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    if (conversationId) {
      await saveMessageToDb(message, 'user')
    }

    if (isEscalated) {
      setIsTyping(false)
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
    setMessages(prev => [...prev, botMsg])

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
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    const aiResponse = await sendToAI(message)
    setIsTyping(false)

    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content: aiResponse,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, botMsg])
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

    for (const msg of messages) {
      if (msg.type === 'user' || msg.type === 'bot') {
        await saveMessageToDb(msg.content, msg.type)
      }
    }

    const escalateMsg: ChatMessage = {
      id: `escalate-${Date.now()}`,
      type: 'system',
      content: 'Te hemos conectado con soporte. Un agente revisara tu caso y te respondera en las proximas horas. Puedes seguir escribiendo.',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, escalateMsg])
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
          conversation_id: conversationId,
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

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-neutral-900 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-neutral-800 transition-all z-50 border border-neutral-700"
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
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] h-[520px] bg-neutral-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-neutral-800">
          {/* Header */}
          <div className="bg-neutral-900 px-5 py-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">Soporte Octopus</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isEscalated ? 'Conectado con agente' : 'Asistente virtual'}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full ${isEscalated ? 'bg-green-500' : 'bg-violet-500'}`}></div>
            </div>
          </div>

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
                      ? 'bg-violet-600 text-white'
                      : msg.type === 'agent'
                      ? 'bg-green-600 text-white'
                      : msg.type === 'system'
                      ? 'bg-neutral-800 text-neutral-300 text-center w-full'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {msg.type === 'agent' && (
                    <p className="text-xs text-green-200 mb-1 font-medium">Agente</p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1.5 ${
                    msg.type === 'user' ? 'text-violet-200' :
                    msg.type === 'agent' ? 'text-green-200' : 'text-neutral-500'
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
                className="w-full py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Hablar con un agente
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-900">
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
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
