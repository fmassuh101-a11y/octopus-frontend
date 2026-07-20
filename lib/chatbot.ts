// Chatbot propio de Octopus (sin APIs externas, sin costo, sin filtrar datos).
// Base de conocimiento + matcher por intención. Solo información pública de
// cómo funciona la app; nunca datos de usuarios.

interface Intent {
  keywords: string[]
  answer: string
}

const INTENTS: Intent[] = [
  {
    keywords: ['como funciona', 'que es octopus', 'para que sirve', 'como usar', 'empezar'],
    answer: 'Octopus conecta creadores de contenido con empresas de Latinoamérica. Las empresas publican campañas (UGC, clipping, faceless y más), los creadores aplican, la empresa acepta y envía un contrato, el creador entrega el contenido y — al aprobarse — se libera el pago automáticamente. ¿Sos creador o empresa?',
  },
  {
    keywords: ['aplicar', 'postular', 'aplico a un trabajo', 'como consigo trabajo', 'quiero trabajar'],
    answer: 'Para aplicar: entra a "Trabajos", filtra por categoría o busca lo que te interese, abre la campaña y toca "Aplicar". La empresa verá tu perfil y, si le gustás, te acepta y te manda un contrato. Podés seguir tus aplicaciones en la sección "Aplicaciones".',
  },
  {
    keywords: ['pago', 'pagar', 'cobrar', 'cuando me pagan', 'plata', 'dinero', 'retirar', 'retiro'],
    answer: 'El pago se libera automáticamente cuando la empresa APRUEBA tu contenido entregado. La comisión de la plataforma depende del plan de la empresa (entre 7% y 2.3%). Para retirar tu dinero conectás tu método de pago en tu Wallet. Si un pago no aparece, un admin puede revisarlo.',
  },
  {
    keywords: ['contrato', 'aceptar contrato', 'handles', 'firmar'],
    answer: 'Cuando una empresa te acepta, te llega un contrato en la sección "Contratos". Ahí ves los términos (entregables, pago, derechos de uso) y lo aceptás poniendo tus handles de redes (TikTok/IG/YT). Recién ahí empieza el trabajo. Todo queda registrado en la app.',
  },
  {
    keywords: ['entregar', 'subir contenido', 'delivery', 'como entrego', 'mandar video'],
    answer: 'Con el contrato aceptado, en "Contratos" toca "Entregar Contenido", pega el link de tu video y el título. La empresa lo revisa y puede aprobarlo (te pagan) o pedir cambios (hasta 3 rondas). Recibís una notificación con el resultado.',
  },
  {
    keywords: ['disputa', 'problema con', 'estafa', 'no me pago', 'reclamo', 'reportar'],
    answer: 'Si tienes un problema serio con una entrega o pago, se puede abrir una disputa y nuestro equipo media entre ambas partes de forma justa. Cuéntanos qué pasó y, si hace falta, un admin se conectará para resolverlo.',
  },
  {
    keywords: ['plan', 'precio', 'suscripcion', 'cuanto cuesta', 'starter', 'pro', 'scale', 'enterprise', 'planes'],
    answer: 'Para empresas hay 4 planes: Starter (gratis, comisión 7%), Pro ($99/mes, 4.7%), Scale ($499/mes, 2.3%) y Enterprise ("Hablemos", a medida). Los planes pagos bajan la comisión y suman campañas, asientos de equipo y analíticas. Mirá los detalles en la sección de Planes.',
  },
  {
    keywords: ['equipo', 'invitar', 'team', 'agregar personas', 'miembros', 'roles'],
    answer: 'Las empresas pueden invitar personas a su equipo (según su plan: Starter 1, Pro 3, Scale 10). Cada miembro entra con su propia cuenta y ve las campañas de la empresa. El dueño asigna roles (Manager, Editor, Colaborador) y permisos específicos.',
  },
  {
    keywords: ['campaña', 'publicar', 'crear trabajo', 'contratar', 'como contrato creadores', 'postear'],
    answer: 'Las empresas crean una Campaña (el contenedor grande, ej. "Lanzar mi app") y adentro agregan Formatos: UGC, Clipping, Faceless, Social Media Manager, etc. Cada formato es un trabajo con su tipo y su forma de pago (fijo o por views). Los creadores lo ven en el feed y aplican.',
  },
  {
    keywords: ['clipping', 'clips', 'por views', 'cpm', 'vistas'],
    answer: 'El clipping es cuando la empresa te da su contenido y tú haces clips que subes a tu propia cuenta; te pagan por cada 1.000 views (CPM). Es ideal para creadores que generan muchas vistas. Busca campañas de tipo "Clipping" en el feed.',
  },
  {
    keywords: ['nivel', 'bronce', 'plata', 'oro', 'gamif', 'xp', 'ranking', 'leaderboard', 'recompensa'],
    answer: 'Ganas nivel completando trabajos aprobados: Bronce → Plata → Oro → Platino. Un nivel más alto te da más visibilidad ante las empresas y mejores oportunidades. ¡Entrega buen contenido y sube de nivel!',
  },
  {
    keywords: ['cuenta', 'perfil', 'foto', 'contraseña', 'email', 'registro', 'registrarme'],
    answer: 'Puedes editar tu perfil (foto, datos, redes) desde la sección Perfil/Configuración. Un buen perfil con foto y tus redes conectadas hace que las empresas confíen más en ti y te acepten más rápido.',
  },
]

const GREETING = ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'que tal', 'hey']

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export const ESCALATION_MESSAGE =
  'No tengo la respuesta exacta a eso, pero no te preocupes: un miembro de nuestro equipo se conectará para ayudarte. El tiempo de respuesta promedio es de unas 2 horas. ¿Querés dejar tu consulta y seguimos por acá?'

export function getBotResponse(message: string): { answer: string; escalate: boolean } {
  const msg = normalize(message)

  // saludo
  if (GREETING.some(g => msg.includes(g)) && msg.length < 25) {
    return { answer: '¡Hola! Soy el asistente de Octopus. Puedo ayudarte con pagos, contratos, cómo aplicar a trabajos, planes y más. ¿Qué necesitás?', escalate: false }
  }
  if (['gracias', 'genial', 'perfecto', 'listo'].some(g => msg.includes(g)) && msg.length < 20) {
    return { answer: '¡De nada! Si necesitás algo más, escribime cuando quieras.', escalate: false }
  }

  // puntaje por intención
  let best: Intent | null = null
  let bestScore = 0
  for (const intent of INTENTS) {
    let score = 0
    for (const kw of intent.keywords) {
      if (msg.includes(normalize(kw))) score += kw.split(' ').length // frases pesan más
    }
    if (score > bestScore) { bestScore = score; best = intent }
  }

  if (best && bestScore > 0) return { answer: best.answer, escalate: false }
  return { answer: ESCALATION_MESSAGE, escalate: true }
}
