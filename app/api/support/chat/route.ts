import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = 'AIzaSyDb26jKEli_4Tx1jlhhf9amaGoKVW88DEo'

const SYSTEM_PROMPT = `Eres el asistente de soporte de Octopus, una plataforma que conecta creadores de contenido (influencers, UGC creators) con empresas que buscan promocionar sus productos o servicios.

REGLAS IMPORTANTES:
1. SOLO respondes preguntas relacionadas con Octopus y su funcionamiento.
2. Si te preguntan algo NO relacionado con Octopus (deportes, clima, politica, etc.), responde: "Solo puedo ayudarte con temas relacionados a Octopus. En que puedo ayudarte sobre nuestra plataforma?"
3. Se amable, profesional y conciso.
4. Responde en espanol.
5. NO uses emojis.

INFORMACION SOBRE OCTOPUS:

Que es Octopus:
- Marketplace que conecta creadores de contenido con empresas
- Las empresas publican gigs (trabajos) y los creadores aplican
- Los creadores crean contenido UGC, resenas, posts, etc.

Para Creadores:
- Pueden ver gigs disponibles y aplicar
- Reciben contratos con terminos y pago definido
- Suben su contenido cuando esta listo
- Reciben pago cuando la empresa aprueba el contenido
- Pueden retirar dinero a PayPal, transferencia bancaria o crypto (USDT/USDC)
- El retiro minimo es $10 USD
- Octopus cobra 10% de comision en cada pago

Para Empresas:
- Crean gigs especificando que contenido necesitan
- Revisan aplicaciones de creadores
- Envian contratos a los creadores seleccionados
- Aprueban o piden revisiones del contenido
- El pago se libera automaticamente al aprobar

Contratos:
- Un contrato tiene: descripcion del trabajo, fecha limite, monto a pagar
- Estados: pending, accepted, in_progress, completed, cancelled
- Se pueden cancelar antes de que el creador entregue
- Si hay disputas, contactar soporte

Pagos:
- Los pagos se procesan en 3-5 dias habiles
- Metodos: PayPal, transferencia bancaria, crypto
- Comision de Octopus: 10%
- Retiro minimo: $10 USD

Problemas comunes:
- No recibi mi pago: Verificar que el contrato este en estado completed y esperar 3-5 dias habiles
- La empresa no responde: Esperar 48h, luego contactar soporte
- Quiero cancelar un contrato: Ir a Contratos y usar el boton cancelar
- Olvide mi contrasena: Usar Olvide mi contrasena en login

Si no sabes algo especifico, sugiere contactar al equipo de soporte humano.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build conversation for Gemini
    const contents: any[] = []

    // Add conversation history if exists
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-6)) {
        if (msg.content && msg.type) {
          contents.push({
            role: msg.type === 'user' ? 'user' : 'model',
            parts: [{ text: String(msg.content) }]
          })
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: String(message) }]
    })

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini API error:', response.status, JSON.stringify(data))

      // Handle quota exceeded error with helpful fallback
      if (response.status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
        // Provide a helpful fallback response based on common questions
        const lowerMessage = message.toLowerCase()

        if (lowerMessage.includes('pago') || lowerMessage.includes('dinero') || lowerMessage.includes('cobrar')) {
          return NextResponse.json({
            reply: 'Los pagos se procesan en 3-5 dias habiles despues de que la empresa aprueba tu trabajo. Puedes retirar a PayPal, transferencia bancaria o crypto. El minimo es $10 USD. Si tienes un problema especifico con un pago, te recomiendo contactar con soporte humano usando el boton "Hablar con un agente".'
          })
        }

        if (lowerMessage.includes('contrato') || lowerMessage.includes('cancelar')) {
          return NextResponse.json({
            reply: 'Los contratos se pueden cancelar desde la seccion "Contratos" si aun no has entregado el trabajo. Si ya entregaste y hay una disputa, contacta soporte humano usando el boton "Hablar con un agente".'
          })
        }

        if (lowerMessage.includes('aplicar') || lowerMessage.includes('trabajo') || lowerMessage.includes('gig')) {
          return NextResponse.json({
            reply: 'Para aplicar a trabajos, ve a la seccion "Buscar Gigs" y selecciona los que te interesen. Necesitas tener tu cuenta verificada (al menos una red social conectada) para poder aplicar. Las empresas revisaran tu perfil y te contactaran si les interesa.'
          })
        }

        if (lowerMessage.includes('verificar') || lowerMessage.includes('tiktok') || lowerMessage.includes('instagram')) {
          return NextResponse.json({
            reply: 'Para verificar tu cuenta, ve a tu Perfil > Verificacion y conecta tu TikTok o Instagram. Esto permite que las empresas vean tus estadisticas reales y es requisito para aplicar a trabajos.'
          })
        }

        // Generic fallback
        return NextResponse.json({
          reply: 'El asistente automatico esta temporalmente ocupado. Para preguntas generales: Los pagos se procesan en 3-5 dias, el retiro minimo es $10, y necesitas verificar tu cuenta para aplicar a trabajos. Para ayuda personalizada, usa el boton "Hablar con un agente".'
        })
      }

      return NextResponse.json({
        reply: 'Disculpa, hay un problema tecnico. Por favor intenta de nuevo o contacta a soporte.'
      })
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!reply) {
      console.error('No reply from Gemini:', JSON.stringify(data))
      return NextResponse.json({
        reply: 'No pude generar una respuesta. Por favor reformula tu pregunta.'
      })
    }

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Support chat error:', error)
    return NextResponse.json({
      reply: 'Error de conexion. Por favor intenta de nuevo.'
    })
  }
}
