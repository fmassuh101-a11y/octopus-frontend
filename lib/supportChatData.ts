// Octopus Support Chat - Knowledge Base & Responses
// This file contains all predefined responses for the support chatbot

export interface ChatOption {
  id: string
  label: string
  icon?: string
  response?: string
  subOptions?: ChatOption[]
  escalateToAgent?: boolean
}

export const WELCOME_MESSAGE = "¡Hola! Soy el asistente virtual de Octopus. Estoy aquí para ayudarte con cualquier duda sobre la plataforma."

export const WELCOME_PROMPT = "¿En qué puedo ayudarte hoy?"

export const RESOLVED_QUESTION = "¿Pude resolver tu duda?"

export const RESOLVED_YES = "¡Excelente! Me alegra haberte ayudado. Si tienes más preguntas, estaré aquí."

export const RESOLVED_NO = "Entiendo. Te voy a conectar con un agente de soporte que podrá ayudarte mejor."

export const AGENT_CONNECTING = "Conectándote con un agente de soporte. Por favor describe tu problema y te responderemos lo antes posible."

export const AGENT_OFFLINE = "Nuestro equipo de soporte revisará tu mensaje y te responderá pronto. Recibirás una notificación cuando tengamos una respuesta."

// Main menu options
export const MAIN_OPTIONS: ChatOption[] = [
  {
    id: 'payments',
    label: 'Pagos y facturación',
    icon: '💰',
    subOptions: [
      {
        id: 'payment_not_received',
        label: 'No he recibido mi pago',
        icon: '❌',
        response: `**¿No has recibido tu pago?**

Los pagos en Octopus se procesan de la siguiente manera:

1. **Cuando la empresa aprueba tu contenido**, el pago se libera automáticamente.

2. **Tiempo de procesamiento**: Los pagos pueden tardar entre 3-5 días hábiles en reflejarse en tu cuenta, dependiendo de tu método de pago.

3. **Verifica el estado de tu contrato**: Ve a "Mis Contratos" y asegúrate de que el estado sea "Completado".

4. **Revisa tu método de pago**: Asegúrate de tener configurado correctamente tu método de pago en tu perfil.

**Si han pasado más de 5 días hábiles y no recibes el pago, te recomiendo hablar con un agente.**`,
        subOptions: [
          {
            id: 'payment_pending_5_days',
            label: 'Han pasado más de 5 días',
            escalateToAgent: true,
            response: 'Entiendo tu preocupación. Te voy a conectar con un agente para revisar tu caso específico.'
          },
          {
            id: 'payment_check_status',
            label: 'Cómo verificar el estado',
            response: `**Para verificar el estado de tu pago:**

1. Ve a **"Mis Contratos"** en el menú principal
2. Busca el contrato en cuestión
3. El estado debe mostrar "Completado" para que el pago se procese
4. Si dice "En Progreso", la empresa aún no ha aprobado el contenido

**Estados de pago:**
- 🟡 Pendiente: Esperando aprobación del contenido
- 🔵 Procesando: Pago en camino
- 🟢 Completado: Pago enviado
- 🔴 Disputado: Hay un problema que resolver`
          }
        ]
      },
      {
        id: 'payment_methods',
        label: 'Métodos de pago disponibles',
        icon: '💳',
        response: `**Métodos de pago en Octopus:**

**Para Creadores (recibir pagos):**
- 💳 Transferencia bancaria (todos los países)
- 📱 PayPal
- 🏦 Wise
- 💵 Payoneer

**Monedas soportadas:**
- USD (Dólar estadounidense)
- MXN (Peso mexicano)
- BRL (Real brasileño)
- COP (Peso colombiano)
- ARS (Peso argentino)
- PEN (Sol peruano)

**Para configurar tu método de pago:**
1. Ve a tu Perfil
2. Selecciona "Configuración de pagos"
3. Agrega tu información bancaria o cuenta de pago

**Nota:** Las transferencias internacionales pueden tener comisiones según el método elegido.`
      },
      {
        id: 'payment_timeline',
        label: 'Cuándo recibiré mi pago',
        icon: '📅',
        response: `**Timeline de pagos en Octopus:**

**El proceso es el siguiente:**

1. ✅ **Entregas tu contenido** → El contenido se envía a la empresa

2. 👀 **La empresa revisa** → Tienen hasta 7 días para aprobar o pedir revisiones

3. ✅ **Contenido aprobado** → El pago se libera automáticamente

4. 💰 **Procesamiento** → 3-5 días hábiles para que llegue a tu cuenta

**Tiempos totales estimados:**
- Mejor caso: 3-5 días después de la aprobación
- Caso típico: 5-7 días después de la aprobación
- Con revisiones: Depende del tiempo de correcciones

**Tip:** Asegúrate de tener tu método de pago configurado correctamente para evitar retrasos.`
      },
      {
        id: 'payment_invoice',
        label: 'Necesito una factura',
        icon: '🧾',
        response: `**Facturación en Octopus:**

**Para Creadores:**
Puedes generar un recibo de tus pagos desde:
1. Ve a "Mis Contratos"
2. Selecciona el contrato completado
3. Haz clic en "Descargar Recibo"

**Para Empresas:**
Las facturas se generan automáticamente:
1. Ve a "Historial de Pagos"
2. Selecciona la transacción
3. Haz clic en "Descargar Factura"

**¿Necesitas una factura con datos fiscales específicos?**
Contacta a nuestro equipo de soporte para solicitar una factura personalizada con tu RFC/CNPJ/RUT.`,
        subOptions: [
          {
            id: 'invoice_custom',
            label: 'Necesito factura con RFC/datos fiscales',
            escalateToAgent: true,
            response: 'Te conecto con un agente para ayudarte con tu factura personalizada.'
          }
        ]
      },
      {
        id: 'payment_refund',
        label: 'Solicitar reembolso',
        icon: '↩️',
        escalateToAgent: true,
        response: `**Solicitud de Reembolso**

Los reembolsos se procesan en los siguientes casos:
- El creador no entregó el contenido acordado
- El contenido no cumple con lo especificado en el contrato
- Hay una disputa resuelta a favor de la empresa

Para solicitar un reembolso, necesitamos que hables con un agente que revisará tu caso.`
      }
    ]
  },
  {
    id: 'contracts',
    label: 'Problemas con contratos',
    icon: '📝',
    subOptions: [
      {
        id: 'contract_not_received',
        label: 'No veo el contrato que me enviaron',
        icon: '👀',
        response: `**¿No ves un contrato que te enviaron?**

Sigue estos pasos:

1. **Revisa tu sección de Contratos:**
   - Ve a "Mis Contratos" en el menú
   - Asegúrate de estar en la pestaña "Todos" o "Pendientes"

2. **Verifica tu bandeja de entrada:**
   - A veces los contratos llegan como mensaje en el chat
   - Revisa tus mensajes con la empresa

3. **Posibles razones:**
   - El contrato puede estar en estado "Borrador" (la empresa no lo ha enviado aún)
   - Puede haber un error en el ID de usuario

4. **Si sigues sin verlo:**
   - Contacta directamente a la empresa por el chat
   - O habla con un agente de soporte

**Tip:** Activa las notificaciones para no perderte nuevos contratos.`
      },
      {
        id: 'contract_cancel',
        label: 'Quiero cancelar un contrato',
        icon: '❌',
        response: `**Cancelación de Contratos**

**Antes de cancelar, considera:**
- Las cancelaciones pueden afectar tu reputación en la plataforma
- Si ya recibiste un pago adelantado, deberás devolverlo

**Para cancelar un contrato:**

**Si eres Creador:**
1. Ve a "Mis Contratos"
2. Selecciona el contrato
3. Haz clic en "Rechazar Contrato" (si aún no lo aceptaste)
4. Si ya lo aceptaste, contacta a la empresa para acordar la cancelación

**Si eres Empresa:**
1. Ve a "Mis Contratos"
2. Selecciona el contrato
3. Haz clic en "Cancelar Contrato"
4. Indica el motivo de la cancelación

**Nota:** Si hay una disputa sobre la cancelación, puedes solicitar mediación.`,
        subOptions: [
          {
            id: 'contract_cancel_dispute',
            label: 'La otra parte no acepta cancelar',
            escalateToAgent: true,
            response: 'Entiendo la situación. Te conectaré con un agente para mediar la cancelación.'
          }
        ]
      },
      {
        id: 'contract_modify',
        label: 'Necesito modificar los términos',
        icon: '✏️',
        response: `**Modificar Términos del Contrato**

**Si el contrato NO ha sido aceptado:**
- La empresa puede cancelar el contrato actual y crear uno nuevo con los términos correctos

**Si el contrato YA fue aceptado:**
- Ambas partes deben estar de acuerdo en los cambios
- Contacta a la otra parte por el chat para discutir las modificaciones
- Una vez acordados, la empresa puede cancelar el contrato actual y crear uno nuevo

**Lo que se puede modificar:**
- Monto del pago
- Entregables (cantidad, tipo)
- Fecha de entrega
- Términos de uso del contenido

**Lo que NO se puede modificar después de aceptar:**
- Las partes involucradas (creador/empresa)

**Recomendación:** Siempre revisa bien los términos antes de aceptar un contrato.`
      },
      {
        id: 'contract_dispute',
        label: 'Tengo una disputa con el contrato',
        icon: '⚠️',
        response: `**Sistema de Disputas de Octopus**

**¿Cuándo abrir una disputa?**
- El contenido entregado no cumple con lo acordado
- La empresa no aprueba el contenido sin razón válida
- No se respetan los términos del contrato
- Problemas con el pago

**Proceso de disputa:**

1. **Intenta resolver directamente:**
   - Comunícate con la otra parte por el chat
   - Muchos problemas se resuelven con comunicación

2. **Si no hay acuerdo, abre una disputa:**
   - Ve al contrato en cuestión
   - Haz clic en "Reportar Problema"
   - Describe la situación con detalle
   - Adjunta evidencia (capturas, mensajes, etc.)

3. **Mediación de Octopus:**
   - Nuestro equipo revisará el caso
   - Contactaremos a ambas partes
   - Tomaremos una decisión en 5-7 días hábiles

**¿Necesitas abrir una disputa ahora?**`,
        subOptions: [
          {
            id: 'dispute_open',
            label: 'Sí, quiero abrir una disputa',
            escalateToAgent: true,
            response: 'Te conectaré con un agente para iniciar el proceso de disputa. Por favor, ten lista la información del contrato y evidencia del problema.'
          },
          {
            id: 'dispute_info',
            label: 'Solo quería información',
            response: '¡Perfecto! Si en el futuro necesitas abrir una disputa, ya sabes cómo funciona. Recuerda que siempre es mejor intentar resolver las cosas directamente primero.'
          }
        ]
      },
      {
        id: 'contract_deliverables',
        label: 'Dudas sobre entregables',
        icon: '📦',
        response: `**Todo sobre Entregables**

**¿Qué son los entregables?**
Son los contenidos específicos que el creador debe producir según el contrato. Por ejemplo: 2 videos de TikTok, 1 Reel de Instagram, etc.

**Como Creador:**
1. Revisa los entregables en el contrato antes de aceptar
2. Presta atención a:
   - Plataforma (TikTok, Instagram, YouTube)
   - Tipo de contenido (video, foto, story)
   - Cantidad
   - Duración (si aplica)
   - Fecha límite

3. Para entregar:
   - Ve al contrato aceptado
   - Sube tu contenido para revisión
   - Espera la aprobación de la empresa

**Como Empresa:**
1. Define claramente los entregables al crear el contrato
2. Revisa el contenido cuando el creador lo suba
3. Puedes aprobar, pedir revisiones (máximo 2), o rechazar con justificación

**Tip:** Entre más claro sea el brief, mejores resultados obtendrás.`
      }
    ]
  },
  {
    id: 'account',
    label: 'Mi cuenta',
    icon: '👤',
    subOptions: [
      {
        id: 'account_verify',
        label: 'Cómo verificar mi cuenta',
        icon: '✅',
        response: `**Verificación de Cuenta en Octopus**

**¿Por qué verificar tu cuenta?**
- Mayor confianza de empresas/creadores
- Acceso a más oportunidades
- Badge de verificado en tu perfil
- Límites de pago más altos

**Para Creadores - Verificar redes sociales:**
1. Ve a tu Perfil → Verificación
2. Conecta tus cuentas de TikTok/Instagram
3. Autorizamos el acceso para verificar que eres el dueño
4. ¡Listo! Aparecerá el badge de verificado

**Para Empresas - Verificar empresa:**
1. Ve a Configuración → Verificación
2. Sube documentos de tu empresa:
   - RFC (México)
   - CNPJ (Brasil)
   - NIT (Colombia)
   - RUT (Chile)
3. Nuestro equipo revisará en 2-3 días hábiles

**Nota:** La verificación es opcional pero altamente recomendada.`
      },
      {
        id: 'account_change_type',
        label: 'Cambiar de Creador a Empresa (o viceversa)',
        icon: '🔄',
        response: `**Cambiar Tipo de Cuenta**

Actualmente, cada cuenta en Octopus es de un solo tipo: Creador o Empresa.

**Si necesitas ambos tipos:**
- Puedes crear una segunda cuenta con otro email
- Ejemplo: tu@email.com (Creador) y tu.empresa@email.com (Empresa)

**Si te equivocaste al registrarte:**
Contacta a un agente de soporte para ayudarte a cambiar el tipo de cuenta. Esto solo es posible si:
- No tienes contratos activos
- No tienes pagos pendientes`,
        subOptions: [
          {
            id: 'account_change_request',
            label: 'Quiero cambiar mi tipo de cuenta',
            escalateToAgent: true,
            response: 'Te conectaré con un agente para revisar si es posible cambiar tu tipo de cuenta.'
          }
        ]
      },
      {
        id: 'account_delete',
        label: 'Eliminar mi cuenta',
        icon: '🗑️',
        response: `**Eliminar Cuenta de Octopus**

**Antes de eliminar tu cuenta, considera:**
- Perderás todo tu historial de contratos
- Perderás tus reviews y reputación
- No podrás recuperar la cuenta
- Si tienes pagos pendientes, debes completarlos primero

**Requisitos para eliminar:**
- No tener contratos activos
- No tener pagos pendientes
- No tener disputas abiertas

**Si estás seguro de eliminar tu cuenta:**
Contacta a un agente de soporte para procesar la solicitud.`,
        subOptions: [
          {
            id: 'account_delete_confirm',
            label: 'Sí, quiero eliminar mi cuenta',
            escalateToAgent: true,
            response: 'Te conectaré con un agente para procesar la eliminación de tu cuenta. Te pedirán confirmar tu identidad.'
          },
          {
            id: 'account_delete_pause',
            label: 'Solo quiero pausar mi cuenta',
            response: `**Pausar tu Cuenta**

En lugar de eliminar, puedes simplemente dejar de usar la plataforma temporalmente:
- Tu cuenta permanecerá activa pero inactiva
- No recibirás notificaciones de nuevos trabajos
- Podrás volver cuando quieras

No hay necesidad de hacer nada especial para "pausar" - simplemente deja de usar la plataforma y vuelve cuando estés listo.`
          }
        ]
      },
      {
        id: 'account_password',
        label: 'Cambiar contraseña',
        icon: '🔐',
        response: `**Cambiar tu Contraseña**

**Para cambiar tu contraseña:**
1. Cierra sesión de tu cuenta
2. En la página de login, haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Recibirás un link para crear una nueva contraseña
5. Haz clic en el link (válido por 1 hora)
6. Crea tu nueva contraseña

**Requisitos de contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos un número

**Tip de seguridad:** Usa una contraseña única que no uses en otros sitios.`
      },
      {
        id: 'account_notifications',
        label: 'Configurar notificaciones',
        icon: '🔔',
        response: `**Configuración de Notificaciones**

**Para configurar tus notificaciones:**
1. Ve a tu Perfil
2. Haz clic en el ícono de ⚙️ Configuración
3. Selecciona "Notificaciones"

**Tipos de notificaciones:**
- 📩 Nuevos mensajes
- 📝 Nuevos contratos
- 💰 Pagos recibidos
- ✅ Contenido aprobado
- ⚠️ Alertas importantes

**Canales disponibles:**
- Email
- Notificaciones push (próximamente)

**Recomendación:** Mantén activadas al menos las notificaciones de contratos y pagos para no perderte nada importante.`
      }
    ]
  },
  {
    id: 'how_it_works',
    label: 'Cómo funciona Octopus',
    icon: '🐙',
    subOptions: [
      {
        id: 'how_creator',
        label: 'Soy Creador - ¿Cómo empiezo?',
        icon: '🎨',
        response: `**Guía para Creadores en Octopus**

**Paso 1: Completa tu perfil**
- Agrega tu foto y bio
- Conecta tus redes sociales (TikTok, Instagram)
- Define tu nicho y tarifas

**Paso 2: Busca oportunidades**
- Explora los trabajos publicados por empresas
- Filtra por categoría, pago, plataforma
- Aplica a los que te interesen

**Paso 3: Aplica a trabajos**
- Escribe una propuesta convincente
- Muestra por qué eres el creador ideal
- Espera la respuesta de la empresa

**Paso 4: Recibe y acepta contratos**
- Si te seleccionan, recibirás un contrato
- Revisa los términos cuidadosamente
- Acepta si estás de acuerdo

**Paso 5: Crea y entrega contenido**
- Produce el contenido según el brief
- Súbelo para revisión
- Responde a feedback si es necesario

**Paso 6: Recibe tu pago**
- Una vez aprobado el contenido
- El pago se libera automáticamente
- Recíbelo en tu método de pago configurado

**¡Éxito!** Entre mejor sea tu trabajo, más oportunidades recibirás.`
      },
      {
        id: 'how_company',
        label: 'Soy Empresa - ¿Cómo empiezo?',
        icon: '🏢',
        response: `**Guía para Empresas en Octopus**

**Paso 1: Configura tu perfil de empresa**
- Agrega el logo y descripción de tu marca
- Verifica tu empresa (opcional pero recomendado)

**Paso 2: Publica un trabajo**
- Haz clic en "Publicar Trabajo"
- Define: título, descripción, presupuesto
- Especifica plataformas y tipo de contenido
- Establece requisitos y deadline

**Paso 3: Recibe y revisa aplicaciones**
- Los creadores aplicarán a tu trabajo
- Revisa sus perfiles y métricas
- Filtra por seguidores, engagement, nicho

**Paso 4: Selecciona y contrata**
- Contacta a los creadores que te interesen
- Negocia términos por el chat
- Envía un contrato formal

**Paso 5: Revisa el contenido**
- El creador subirá el contenido para tu revisión
- Puedes aprobar, pedir cambios o rechazar
- Máximo 2 rondas de revisiones incluidas

**Paso 6: Aprueba y paga**
- Al aprobar, el pago se libera automáticamente
- El creador recibe su pago
- ¡Campaña completada!

**Tip:** Sé claro en tu brief para obtener mejores resultados.`
      },
      {
        id: 'how_fees',
        label: '¿Cuánto cobra Octopus?',
        icon: '💵',
        response: `**Comisiones de Octopus**

**Para Creadores:**
- Octopus cobra el **12%** del valor del contrato
- Ejemplo: Contrato de $100 → Recibes $88

**Para Empresas:**
- Sin comisión adicional
- Pagas exactamente lo acordado en el contrato

**¿Por qué esta comisión?**
- Plataforma segura y confiable
- Sistema de pagos protegido (Escrow)
- Contratos legales válidos en LATAM
- Soporte y mediación de disputas
- Sin costo de suscripción mensual

**Comparado con otras plataformas:**
- Algunas cobran 20-30% al creador
- Otras cobran suscripciones de $200-500/mes
- Octopus: Solo 12% cuando ganas dinero

**Nota:** No hay costos ocultos ni cargos sorpresa.`
      },
      {
        id: 'how_safe',
        label: '¿Es seguro usar Octopus?',
        icon: '🔒',
        response: `**Seguridad en Octopus**

**Protección de Pagos (Escrow):**
- El dinero se retiene en custodia
- Solo se libera cuando ambas partes cumplen
- Ni el creador ni la empresa pueden estafar

**Contratos Legales:**
- Todos los contratos son legalmente válidos
- Válidos en México, Brasil, Colombia, Argentina, Chile, Perú
- Incluyen cláusulas de protección para ambas partes

**Verificación:**
- Creadores pueden verificar sus redes sociales
- Empresas pueden verificar su registro fiscal
- Badges de verificado = mayor confianza

**Protección de Datos:**
- Encriptación de datos sensibles
- No compartimos tu información con terceros
- Cumplimos con regulaciones de privacidad

**Sistema de Disputas:**
- Si hay problemas, Octopus media
- Decisiones justas basadas en evidencia
- Protección para creadores y empresas

**En resumen:** Octopus está diseñado para que ambas partes puedan trabajar con confianza.`
      },
      {
        id: 'how_countries',
        label: '¿En qué países está disponible?',
        icon: '🌎',
        response: `**Disponibilidad de Octopus**

**Países donde operamos:**
- 🇲🇽 México
- 🇧🇷 Brasil
- 🇨🇴 Colombia
- 🇦🇷 Argentina
- 🇨🇱 Chile
- 🇵🇪 Perú
- 🇪🇨 Ecuador
- 🇺🇾 Uruguay
- 🇵🇾 Paraguay
- 🇧🇴 Bolivia
- 🇻🇪 Venezuela
- 🇵🇦 Panamá
- 🇨🇷 Costa Rica
- 🇬🇹 Guatemala
- 🇭🇳 Honduras
- 🇸🇻 El Salvador
- 🇳🇮 Nicaragua
- 🇩🇴 República Dominicana
- 🇵🇷 Puerto Rico

**También disponible en:**
- 🇺🇸 Estados Unidos
- 🇪🇸 España

**Monedas soportadas:**
USD, MXN, BRL, COP, ARS, PEN, CLP

**Idiomas:**
- Español
- Portugués (próximamente)
- Inglés (próximamente)`
      }
    ]
  },
  {
    id: 'report',
    label: 'Reportar un problema',
    icon: '🚨',
    subOptions: [
      {
        id: 'report_bug',
        label: 'Error o bug en la app',
        icon: '🐛',
        response: `**Reportar un Bug**

Lamentamos que hayas encontrado un error. Para ayudarnos a solucionarlo:

**Por favor incluye:**
1. ¿Qué estabas intentando hacer?
2. ¿Qué pasó en lugar de lo esperado?
3. ¿En qué página/sección ocurrió?
4. ¿Qué dispositivo usas? (iPhone, Android, PC)
5. ¿Qué navegador? (Chrome, Safari, etc.)

**Si es posible:**
- Toma una captura de pantalla del error
- Copia cualquier mensaje de error que aparezca

Te conectaré con el equipo técnico para reportar el bug.`,
        escalateToAgent: true
      },
      {
        id: 'report_user',
        label: 'Reportar usuario sospechoso',
        icon: '👤',
        response: `**Reportar Usuario**

Tomamos muy en serio los reportes de comportamiento inadecuado.

**Razones válidas para reportar:**
- Comportamiento fraudulento
- Acoso o mensajes inapropiados
- Contenido ofensivo
- Suplantación de identidad
- Seguidores/métricas falsas
- Incumplimiento de contratos repetido

**Para reportar:**
Te conectaré con un agente. Por favor ten lista:
- El nombre de usuario o ID del usuario
- Capturas de pantalla como evidencia
- Descripción del problema

**Nota:** Los reportes falsos también son penalizados.`,
        escalateToAgent: true
      },
      {
        id: 'report_content',
        label: 'Contenido inapropiado',
        icon: '🚫',
        response: `**Reportar Contenido Inapropiado**

**No permitimos:**
- Contenido para adultos
- Violencia o gore
- Discurso de odio
- Contenido ilegal
- Spam o estafas
- Información falsa peligrosa

**Para reportar contenido:**
Te conectaré con el equipo de moderación. Necesitamos:
- Link o ubicación del contenido
- Descripción de por qué es inapropiado
- Capturas de pantalla si es posible

**Tiempo de respuesta:**
Revisamos reportes de contenido en 24-48 horas.`,
        escalateToAgent: true
      },
      {
        id: 'report_scam',
        label: 'Posible estafa',
        icon: '⚠️',
        response: `**Reportar Posible Estafa**

**Señales de alerta:**
- Te piden pagar fuera de Octopus
- Ofrecen pagos demasiado buenos para ser verdad
- Te presionan para actuar rápido
- Piden información personal sensible
- El perfil parece falso o incompleto

**¿Qué hacer?**
1. NO hagas ningún pago fuera de la plataforma
2. NO compartas datos bancarios por chat
3. Reporta inmediatamente

**Para reportar:**
Te conectaré con nuestro equipo de seguridad. Ten lista:
- Nombre/ID del usuario sospechoso
- Capturas de los mensajes
- Cualquier link que te hayan enviado

**Recuerda:** Octopus NUNCA te pedirá pagar fuera de la plataforma.`,
        escalateToAgent: true
      }
    ]
  },
  {
    id: 'other',
    label: 'Otra consulta',
    icon: '💬',
    response: `**Otra Consulta**

No encontré tu pregunta en las opciones anteriores.

Te conectaré con un agente de soporte que podrá ayudarte con tu consulta específica.

Por favor, describe tu pregunta o problema con el mayor detalle posible para que podamos ayudarte mejor.`,
    escalateToAgent: true
  }
]

// Quick replies for common situations
export const QUICK_REPLIES = {
  greeting: ['¡Hola!', 'Buenos días', 'Buenas tardes', 'Hola, necesito ayuda'],
  thanks: ['Gracias', 'Muchas gracias', 'Gracias por la ayuda'],
  bye: ['Adiós', 'Hasta luego', 'Chao'],
  agent: ['Hablar con agente', 'Necesito un humano', 'Quiero hablar con alguien']
}

export const GREETING_RESPONSES = [
  "¡Hola! ¿En qué puedo ayudarte hoy?",
  "¡Bienvenido a Octopus! ¿Cómo puedo asistirte?",
  "¡Hola! Estoy aquí para ayudarte. ¿Qué necesitas?"
]

export const THANKS_RESPONSES = [
  "¡De nada! Si tienes más preguntas, aquí estaré.",
  "¡Con gusto! No dudes en volver si necesitas algo más.",
  "¡Es un placer ayudarte! ¿Hay algo más en lo que pueda asistirte?"
]

export const BYE_RESPONSES = [
  "¡Hasta pronto! Que tengas un excelente día.",
  "¡Adiós! Recuerda que estamos aquí cuando nos necesites.",
  "¡Hasta luego! Éxito con tus campañas en Octopus."
]

export const FALLBACK_RESPONSE = "No estoy seguro de entender tu pregunta. ¿Podrías seleccionar una de las opciones del menú o describir tu problema de otra manera?"
