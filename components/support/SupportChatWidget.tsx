'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MAIN_OPTIONS,
  WELCOME_MESSAGE,
  WELCOME_PROMPT,
  RESOLVED_QUESTION,
  RESOLVED_YES,
  RESOLVED_NO,
  AGENT_CONNECTING,
  AGENT_OFFLINE,
  GREETING_RESPONSES,
  THANKS_RESPONSES,
  BYE_RESPONSES,
  FALLBACK_RESPONSE,
  ChatOption
} from '@/lib/supportChatData'

const SUPABASE_URL = 'https://ftvqoudlmojdxwjxljzr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnFvdWRsbW9qZHh3anhsanpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyOTM5MTgsImV4cCI6MjA4NDg2OTkxOH0.MsGoOGXmw7GPdC7xLOwAge_byzyc45udSFIBOQ0ULrY'

interface ChatMessage {
  id: string
  type: 'bot' | 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  options?: ChatOption[]
  showResolved?: boolean
}

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentOptions, setCurrentOptions] = useState<ChatOption[]>(MAIN_OPTIONS)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isEscalated, setIsEscalated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [hasNewAgentMessage, setHasNewAgentMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load user info
    const loadUserData = async () => {
      const userStr = localStorage.getItem('sb-user')
      const token = localStorage.getItem('sb-access-token')
      if (userStr && token) {
        const userData = JSON.parse(userStr)
        // Get profile for full_name and user_type
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

    // Check for existing conversation
    const savedConvId = localStorage.getItem('support_conversation_id')
    if (savedConvId) {
      setConversationId(savedConvId)
      loadExistingMessages(savedConvId)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Poll for new agent messages
  useEffect(() => {
    if (!conversationId || !isEscalated) return

    const interval = setInterval(async () => {
      await checkForAgentMessages()
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [conversationId, isEscalated])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadExistingMessages = async (convId: string) => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token) return

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/support_messages?conversation_id=eq.${convId}&order=created_at.asc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const loadedMessages: ChatMessage[] = data.map((m: any) => ({
          id: m.id,
          type: m.sender_type === 'bot' ? 'bot' : m.sender_type === 'agent' ? 'agent' : 'user',
          content: m.content,
          timestamp: new Date(m.created_at)
        }))

        if (loadedMessages.length > 0) {
          setMessages(loadedMessages)
          // Check if conversation was escalated
          const hasAgentMessage = loadedMessages.some(m => m.type === 'agent')
          const hasEscalation = data.some((m: any) => m.is_escalated)
          setIsEscalated(hasEscalation || hasAgentMessage)
        }
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    }
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
        const data = await response.json()
        if (data.length > 0) {
          const lastAgentMessage = data[0]
          const existingIds = messages.map(m => m.id)
          if (!existingIds.includes(lastAgentMessage.id)) {
            // New agent message!
            const newMessage: ChatMessage = {
              id: lastAgentMessage.id,
              type: 'agent',
              content: lastAgentMessage.content,
              timestamp: new Date(lastAgentMessage.created_at)
            }
            setMessages(prev => [...prev, newMessage])
            setHasNewAgentMessage(true)
          }
        }
      }
    } catch (err) {
      console.error('Error checking for agent messages:', err)
    }
  }

  const openChat = () => {
    setIsOpen(true)
    setHasNewAgentMessage(false)

    // Initialize with welcome message if no messages
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: WELCOME_MESSAGE,
        timestamp: new Date()
      }
      const promptMessage: ChatMessage = {
        id: 'prompt',
        type: 'bot',
        content: WELCOME_PROMPT,
        timestamp: new Date(),
        options: MAIN_OPTIONS
      }
      setMessages([welcomeMessage, promptMessage])
    }
  }

  const closeChat = () => {
    setIsOpen(false)
  }

  const addBotMessage = (content: string, options?: ChatOption[], showResolved?: boolean) => {
    setIsTyping(true)

    setTimeout(() => {
      const message: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content,
        timestamp: new Date(),
        options,
        showResolved
      }
      setMessages(prev => [...prev, message])
      setIsTyping(false)
      if (options) {
        setCurrentOptions(options)
      }
    }, 500 + Math.random() * 500) // Simulate typing delay
  }

  const handleOptionClick = async (option: ChatOption) => {
    // Add user selection as message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: option.label,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Save to database if we have a conversation
    if (conversationId) {
      await saveMessage(option.label, 'user')
    }

    // Handle the response
    if (option.escalateToAgent) {
      await handleEscalation(option.response || AGENT_CONNECTING)
    } else if (option.response) {
      // Show response
      addBotMessage(option.response, option.subOptions, !option.subOptions)

      // Save bot response
      if (conversationId) {
        setTimeout(() => saveMessage(option.response!, 'bot'), 600)
      }
    } else if (option.subOptions) {
      // Show sub-options
      addBotMessage(`Has seleccionado: ${option.label}. ¿Qué necesitas específicamente?`, option.subOptions)
    }
  }

  const handleEscalation = async (message: string) => {
    setIsEscalated(true)

    // Create or get conversation
    let convId = conversationId
    if (!convId) {
      convId = await createConversation()
      if (!convId) {
        addBotMessage('Lo siento, hubo un error al conectar con soporte. Por favor intenta más tarde.')
        return
      }
    }

    // Save the escalation message
    await saveMessage(message, 'bot', true)

    addBotMessage(message)

    setTimeout(() => {
      addBotMessage(
        `${AGENT_OFFLINE}\n\n⏱️ **Tiempo estimado de respuesta:** 1-2 horas en horario laboral.\n\nPuedes escribir tu mensaje y te responderemos lo antes posible.`
      )
    }, 1000)
  }

  const createConversation = async (): Promise<string | null> => {
    try {
      const token = localStorage.getItem('sb-access-token')
      if (!token || !user) {
        console.error('No token or user for creating conversation')
        return null
      }

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
        localStorage.setItem('support_conversation_id', conversation.id)
        return conversation.id
      } else {
        const errorText = await response.text()
        console.error('Error creating conversation:', response.status, errorText)
      }
    } catch (err) {
      console.error('Error creating conversation:', err)
    }
    return null
  }

  const saveMessage = async (content: string, senderType: 'user' | 'bot' | 'agent', isEscalated = false) => {
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
          content,
          is_escalated: isEscalated
        })
      })

      // Update conversation status if escalated
      if (isEscalated) {
        await fetch(`${SUPABASE_URL}/rest/v1/support_conversations?id=eq.${conversationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            status: 'waiting_agent',
            updated_at: new Date().toISOString()
          })
        })
      }
    } catch (err) {
      console.error('Error saving message:', err)
    }
  }

  const handleResolvedClick = async (resolved: boolean) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: resolved ? 'Sí, gracias' : 'No, necesito más ayuda',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    if (resolved) {
      addBotMessage(RESOLVED_YES)
      setTimeout(() => {
        addBotMessage('¿Hay algo más en lo que pueda ayudarte?', MAIN_OPTIONS)
      }, 1500)
    } else {
      await handleEscalation(RESOLVED_NO)
    }
  }

  const handleSendMessage = async () => {
    const content = inputValue.trim()
    if (!content) return

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Create conversation if needed (for escalated chats)
    let convId = conversationId
    if (!convId && isEscalated) {
      convId = await createConversation()
    }

    // Save user message
    if (convId) {
      await saveMessage(content, 'user')
    }

    // If escalated, just save message (agent will respond)
    if (isEscalated) {
      addBotMessage('Tu mensaje ha sido enviado. Un agente te responderá pronto.')
      return
    }

    // Simple keyword detection for non-escalated chat
    const lowerContent = content.toLowerCase()

    if (['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hey'].some(g => lowerContent.includes(g))) {
      addBotMessage(GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)], MAIN_OPTIONS)
    } else if (['gracias', 'muchas gracias', 'thanks'].some(t => lowerContent.includes(t))) {
      addBotMessage(THANKS_RESPONSES[Math.floor(Math.random() * THANKS_RESPONSES.length)])
    } else if (['adiós', 'adios', 'chao', 'bye', 'hasta luego'].some(b => lowerContent.includes(b))) {
      addBotMessage(BYE_RESPONSES[Math.floor(Math.random() * BYE_RESPONSES.length)])
    } else if (['agente', 'humano', 'persona', 'hablar con alguien'].some(a => lowerContent.includes(a))) {
      await handleEscalation('Entendido, te conectaré con un agente de soporte.')
    } else if (['pago', 'dinero', 'cobrar', 'factura'].some(p => lowerContent.includes(p))) {
      const paymentOption = MAIN_OPTIONS.find(o => o.id === 'payments')
      if (paymentOption) {
        addBotMessage('Veo que tienes una consulta sobre pagos. Aquí tienes las opciones:', paymentOption.subOptions)
      }
    } else if (['contrato', 'cancelar', 'disputa'].some(c => lowerContent.includes(c))) {
      const contractOption = MAIN_OPTIONS.find(o => o.id === 'contracts')
      if (contractOption) {
        addBotMessage('Veo que tienes una consulta sobre contratos. Aquí tienes las opciones:', contractOption.subOptions)
      }
    } else if (['cuenta', 'perfil', 'contraseña', 'password'].some(a => lowerContent.includes(a))) {
      const accountOption = MAIN_OPTIONS.find(o => o.id === 'account')
      if (accountOption) {
        addBotMessage('Veo que tienes una consulta sobre tu cuenta. Aquí tienes las opciones:', accountOption.subOptions)
      }
    } else {
      addBotMessage(FALLBACK_RESPONSE, MAIN_OPTIONS)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => isOpen ? closeChat() : openChat()}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-neutral-700 hover:bg-neutral-600 rotate-0'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {hasNewAgentMessage && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse">
                1
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🐙</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Soporte Octopus</h3>
              <p className="text-xs text-white/70">
                {isEscalated ? 'Conectado con soporte' : 'Asistente virtual'}
              </p>
            </div>
            <button
              onClick={closeChat}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Message Bubble */}
                <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center mr-2 flex-shrink-0">
                      {msg.type === 'agent' ? (
                        <span className="text-white text-sm">👤</span>
                      ) : (
                        <span className="text-sm">🐙</span>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-md'
                        : msg.type === 'agent'
                        ? 'bg-green-100 text-gray-800 rounded-bl-md border border-green-200'
                        : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                    }`}
                  >
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                    <div className={`text-[10px] mt-1 ${
                      msg.type === 'user' ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.timestamp)}
                      {msg.type === 'agent' && ' · Agente de soporte'}
                    </div>
                  </div>
                </div>

                {/* Options */}
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-3 ml-10 space-y-2">
                    {msg.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all text-sm flex items-center gap-3 group"
                      >
                        {option.icon && <span className="text-lg">{option.icon}</span>}
                        <span className="flex-1 text-gray-700 group-hover:text-violet-700">{option.label}</span>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}

                {/* Resolved Question */}
                {msg.showResolved && (
                  <div className="mt-3 ml-10">
                    <p className="text-sm text-gray-600 mb-2">{RESOLVED_QUESTION}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolvedClick(true)}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                      >
                        ✓ Sí, gracias
                      </button>
                      <button
                        onClick={() => handleResolvedClick(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        No, hablar con agente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center">
                  <span className="text-sm">🐙</span>
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isEscalated ? "Escribe tu mensaje para el agente..." : "Escribe un mensaje..."}
                className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Powered by Octopus Support
            </p>
          </div>
        </div>
      )}
    </>
  )
}
