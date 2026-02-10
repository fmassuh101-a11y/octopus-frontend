import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDb26jKEli_4Tx1jlhhf9amaGoKVW88DEo'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SYSTEM_PROMPT = `Eres el asistente de soporte de Octopus, una plataforma que conecta creadores de contenido (influencers, UGC creators) con empresas que buscan promocionar sus productos o servicios.

REGLAS IMPORTANTES:
1. SOLO respondes preguntas relacionadas con Octopus y su funcionamiento.
2. Si te preguntan algo NO relacionado con Octopus (deportes, clima, política, etc.), responde EXACTAMENTE: "Solo puedo ayudarte con temas relacionados a Octopus. ¿En qué puedo ayudarte sobre nuestra plataforma?"
3. Sé amable, profesional y conciso.
4. Responde en español.
5. Usa emojis ocasionalmente para ser más amigable.

INFORMACIÓN SOBRE OCTOPUS:

**Qué es Octopus:**
- Marketplace que conecta creadores de contenido con empresas
- Las empresas publican "gigs" (trabajos) y los creadores aplican
- Los creadores crean contenido UGC, reseñas, posts, etc.

**Para Creadores:**
- Pueden ver gigs disponibles y aplicar
- Reciben contratos con términos y pago definido
- Suben su contenido cuando está listo
- Reciben pago cuando la empresa aprueba el contenido
- Pueden retirar dinero a PayPal, transferencia bancaria o crypto (USDT/USDC)
- El retiro mínimo es $10 USD
- Octopus cobra 10% de comisión en cada pago

**Para Empresas:**
- Crean gigs especificando qué contenido necesitan
- Revisan aplicaciones de creadores
- Envían contratos a los creadores seleccionados
- Aprueban o piden revisiones del contenido
- El pago se libera automáticamente al aprobar

**Contratos:**
- Un contrato tiene: descripción del trabajo, fecha límite, monto a pagar
- Estados: pending (pendiente), accepted (aceptado), in_progress (en progreso), completed (completado), cancelled (cancelado)
- Se pueden cancelar antes de que el creador entregue
- Si hay disputas, contactar soporte

**Pagos:**
- Los pagos se procesan en 3-5 días hábiles
- Métodos: PayPal, transferencia bancaria, crypto
- Comisión de Octopus: 10%
- Retiro mínimo: $10 USD

**Problemas comunes:**
- "No recibí mi pago" → Verificar que el contrato esté en estado "completed" y esperar 3-5 días hábiles
- "La empresa no responde" → Esperar 48h, luego contactar soporte
- "Quiero cancelar un contrato" → Ir a Contratos y usar el botón cancelar (solo si no se ha entregado)
- "Olvidé mi contraseña" → Usar "Olvidé mi contraseña" en login

Si no sabes algo específico, sugiere contactar al equipo de soporte humano.`

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build conversation for Gemini
    const contents = []

    // Add conversation history if exists
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-10)) { // Last 10 messages for context
        contents.push({
          role: msg.type === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error:', response.status, errorData)
      return NextResponse.json({
        reply: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
      })
    }

    const data = await response.json()

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Lo siento, no pude generar una respuesta. ¿Puedes reformular tu pregunta?'

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Support chat error:', error)
    return NextResponse.json({
      reply: 'Lo siento, hubo un error. Por favor intenta de nuevo más tarde.'
    })
  }
}
