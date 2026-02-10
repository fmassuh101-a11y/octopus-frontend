'use client'

import { useState, useEffect, useRef } from 'react'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

// Quick suggestion buttons
const QUICK_SUGGESTIONS = [
  { id: 'payment', label: 'Problemas de pago', icon: '💰' },
  { id: 'contract', label: 'Contratos', icon: '📝' },
  { id: 'dispute', label: 'Tengo una disputa', icon: '⚠️' },
  { id: 'how', label: 'Cómo funciona', icon: '❓' },
  { id: 'account', label: 'Mi cuenta', icon: '👤' },
]

interface ChatMessage {
  id: string
  type: 'bot' | 'user' | 'agent'
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
    // Load user info
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
    // Show welcome message when chat opens for the first time
    if (isOpen && messages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: '¡Hola! 👋 Soy el asistente de Octopus. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      }
      setMessages([welcomeMsg])
    }
  }, [isOpen])

  // Poll for agent messages when escalated
  useEffect(() => {
    if (!conversationId || !isEscalated) return

    const interval = setInterval(async () => {
      await checkForAgentMessages()
    }, 10000)

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
          conversationHistory: messages.slice(-10)
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.reply
      }
    } catch (err) {
      console.error('Error calling AI:', err)
    }
    return 'Lo siento, hubo un error. ¿Puedes intentar de nuevo?'
  }

  const handleSendMessage = async () => {
    const message = inputValue.trim()
    if (!message) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    // Save to database if escalated
    if (conversationId) {
      await saveMessageToDb(message, 'user')
    }

    // Get AI response
    const aiResponse = await sendToAI(message)

    setIsTyping(false)

    // Add bot response
    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content: aiResponse,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, botMsg])

    // Save bot response to database if escalated
    if (conversationId) {
      await saveMessageToDb(aiResponse, 'bot')
    }
  }

  const handleSuggestionClick = async (suggestion: typeof QUICK_SUGGESTIONS[0]) => {
    const messageMap: Record<string, string> = {
      'payment': 'Tengo un problema con un pago',
      'contract': 'Tengo una pregunta sobre contratos',
      'dispute': 'Quiero reportar una disputa',
      'how': '¿Cómo funciona Octopus?',
      'account': 'Tengo una pregunta sobre mi cuenta'
    }

    const message = messageMap[suggestion.id] || suggestion.label
    setInputValue(message)

    // Automatically send the message
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
    setIsEscalated(true)

    // Create conversation in database
    const convId = await createConversation()
    if (!convId) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: 'Lo siento, hubo un error al conectar con soporte. Por favor intenta más tarde.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

    // Save conversation history to database
    for (const msg of messages) {
      await saveMessageToDb(msg.content, msg.type === 'user' ? 'user' : 'bot')
    }

    const escalateMsg: ChatMessage = {
      id: `escalate-${Date.now()}`,
      type: 'bot',
      content: '📞 Te estoy conectando con un agente de soporte humano.\n\n⏱️ **Tiempo de respuesta estimado:** 1-2 horas en horario laboral.\n\nPuedes seguir escribiendo tu mensaje y te responderemos lo antes posible.',
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform z-50"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                🐙
              </div>
              <div>
                <h3 className="font-semibold">Soporte Octopus</h3>
                <p className="text-xs text-white/80">
                  {isEscalated ? 'Conectado con agente' : 'Asistente con IA'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                      : msg.type === 'agent'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  }`}
                >
                  {msg.type === 'agent' && (
                    <p className="text-xs text-green-100 mb-1">Agente de soporte</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.type === 'user' ? 'text-white/70' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white">
              <p className="text-xs text-gray-500 mb-2">Sugerencias rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors flex items-center gap-1"
                  >
                    <span>{suggestion.icon}</span>
                    <span>{suggestion.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Escalate Button */}
          {messages.length > 2 && !isEscalated && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white">
              <button
                onClick={handleEscalateToAgent}
                className="w-full py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              >
                💬 Hablar con un agente humano
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
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
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-violet-400 text-gray-800"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="w-10 h-10 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
