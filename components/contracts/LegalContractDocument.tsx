'use client'

interface Deliverable {
  platform: string
  content_type: string
  quantity: number
  duration_seconds?: number
  description?: string
}

interface UsageRights {
  platforms?: string[]
  duration_months: number
  paid_ads?: boolean
  whitelisting?: boolean
}

interface CreatorHandle {
  platform: string
  handle: string
  submitted_at?: string
}

interface LegalContractDocumentProps {
  contract: {
    id: string
    title: string
    description?: string
    deliverables: Deliverable[]
    payment_amount: number
    payment_currency: string
    payment_terms?: string
    content_due_date?: string
    hashtags?: string[]
    mentions?: string[]
    brand_guidelines?: string
    usage_rights?: UsageRights
    exclusivity_enabled?: boolean
    exclusivity_days?: number
    exclusivity_competitors?: string[]
    additional_terms?: string
    status: string
    sent_at?: string
    viewed_at?: string
    accepted_at?: string
    creator_handles?: CreatorHandle[]
    creator_signed_at?: string
    company_signed_at?: string
  }
  companyName: string
  creatorName: string
  companyEmail?: string
  creatorEmail?: string
  onAccept?: () => void
  onReject?: () => void
  onClose?: () => void
  onDeliverContent?: () => void
  showActions?: boolean
}

const PLATFORM_NAMES: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  ugc: 'UGC (User Generated Content)',
}

const CONTENT_TYPE_NAMES: Record<string, string> = {
  video: 'Video',
  reel: 'Reel',
  post: 'Publicación',
  story: 'Historia',
  carousel: 'Carrusel',
  short: 'Short',
  photo: 'Fotografía',
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'Dólares Estadounidenses',
  MXN: 'Pesos Mexicanos',
  BRL: 'Reales Brasileños',
  COP: 'Pesos Colombianos',
  ARS: 'Pesos Argentinos',
  PEN: 'Soles Peruanos',
}

export default function LegalContractDocument({
  contract,
  companyName,
  creatorName,
  companyEmail,
  creatorEmail,
  onAccept,
  onReject,
  onClose,
  onDeliverContent,
  showActions = true
}: LegalContractDocumentProps) {

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatDateTime = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$', MXN: '$', BRL: 'R$', COP: '$', ARS: '$', PEN: 'S/'
    }
    return `${symbols[currency] || '$'}${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currency}`
  }

  const getUsageRightsDuration = () => {
    if (!contract.usage_rights) return '12 meses'
    if (contract.usage_rights.duration_months === 999) return 'Perpetuo'
    return `${contract.usage_rights.duration_months} meses`
  }

  const getDeliverablesList = () => {
    return contract.deliverables.map((d, i) => {
      const platform = PLATFORM_NAMES[d.platform] || d.platform
      const type = CONTENT_TYPE_NAMES[d.content_type] || d.content_type
      return `${d.quantity} ${type}${d.quantity > 1 ? 's' : ''} en ${platform}`
    }).join(', ')
  }

  const contractId = contract.id.substring(0, 8).toUpperCase()
  const generatedDate = formatDateTime(contract.sent_at || new Date().toISOString())
  const effectiveDate = formatDate(contract.sent_at)
  const dueDate = formatDate(contract.content_due_date)

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      {/* Document Container */}
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto bg-neutral-900 text-neutral-900 rounded-lg shadow-2xl overflow-hidden">

          {/* Document Header */}
          <div className="bg-neutral-100 px-8 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              <span className="font-mono">ID: OCT-{contractId}</span>
            </div>
            <div className="text-sm text-neutral-600">
              Generado: {generatedDate}
            </div>
          </div>

          {/* Document Title */}
          <div className="px-8 py-8 text-center border-b border-neutral-200">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-3xl text-white"></span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              ACUERDO DE PARTICIPACIÓN EN PROGRAMA DE CREADORES
            </h1>
            <p className="text-lg text-neutral-600">Program Participation Agreement</p>
          </div>

          {/* Document Content */}
          <div className="px-8 py-8 space-y-8">

            {/* WHEREAS Clauses */}
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>CONSIDERANDO</strong> que <strong>{companyName}</strong> (en adelante, la "Empresa")
                desea contratar los servicios de creación de contenido de <strong>{creatorName}</strong> (en adelante, el "Creador")
                para la promoción de sus productos y/o servicios a través de plataformas digitales;
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>CONSIDERANDO</strong> que el Creador posee las habilidades, la audiencia y la capacidad
                para producir contenido de calidad en las plataformas especificadas en este acuerdo;
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>CONSIDERANDO</strong> que ambas partes desean establecer los términos y condiciones
                bajo los cuales se llevará a cabo esta colaboración;
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>POR LO TANTO</strong>, las partes acuerdan lo siguiente:
              </p>
            </div>

            {/* Key Contract Information Table */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-100 px-4 py-3 border-b border-neutral-300">
                <h2 className="font-bold text-neutral-900">INFORMACIÓN CLAVE DEL CONTRATO</h2>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-neutral-200">
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700 w-1/3">Empresa</td>
                    <td className="px-4 py-3 text-neutral-900">{companyName}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700">Creador</td>
                    <td className="px-4 py-3 text-neutral-900">{creatorName}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700">Campaña / Programa</td>
                    <td className="px-4 py-3 text-neutral-900">{contract.title}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700">Fecha Efectiva</td>
                    <td className="px-4 py-3 text-neutral-900">{effectiveDate}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700">Fecha Límite de Entrega</td>
                    <td className="px-4 py-3 text-neutral-900">{dueDate}</td>
                  </tr>
                  <tr className="border-b border-neutral-200">
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700">Compensación Total</td>
                    <td className="px-4 py-3 text-neutral-900 font-bold text-green-700">
                      {formatCurrency(contract.payment_amount, contract.payment_currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 bg-neutral-50 font-medium text-neutral-700">Duración de Derechos</td>
                    <td className="px-4 py-3 text-neutral-900">{getUsageRightsDuration()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 1: Definitions */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                1. DEFINICIONES
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>1.1 "Contenido"</strong> se refiere a todo material creado por el Creador en el marco de este
                acuerdo, incluyendo pero no limitado a: videos, imágenes, textos, audio y cualquier otro formato
                digital especificado en los Entregables.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>1.2 "Plataformas"</strong> se refiere a las redes sociales y sitios web donde el Contenido
                será publicado, específicamente: {Array.from(new Set(contract.deliverables.map(d => PLATFORM_NAMES[d.platform] || d.platform))).join(', ')}.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>1.3 "Entregables"</strong> se refiere al contenido específico que el Creador debe producir
                y entregar según los términos de este acuerdo.
              </p>
            </div>

            {/* Section 2: Scope of Work */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                2. ALCANCE DEL TRABAJO Y ENTREGABLES
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>2.1</strong> El Creador se compromete a producir y entregar el siguiente contenido:
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2">
                {contract.deliverables.map((del, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-neutral-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900">
                        {del.quantity}x {CONTENT_TYPE_NAMES[del.content_type] || del.content_type}
                      </span>
                      <span className="text-neutral-600">
                        en {PLATFORM_NAMES[del.platform] || del.platform}
                      </span>
                    </div>
                    {del.duration_seconds && (
                      <span className="text-neutral-500">
                        Duración: {del.duration_seconds}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>2.2</strong> Todo el contenido debe ser entregado antes del {dueDate} o según lo acordado
                por ambas partes por escrito.
              </p>
              {contract.description && (
                <p className="text-sm leading-relaxed text-neutral-700">
                  <strong>2.3</strong> Descripción adicional del proyecto: {contract.description}
                </p>
              )}
            </div>

            {/* Section 3: Compensation */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                3. COMPENSACIÓN Y TÉRMINOS DE PAGO
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>3.1</strong> La Empresa pagará al Creador la cantidad total de{' '}
                <strong className="text-green-700">{formatCurrency(contract.payment_amount, contract.payment_currency)}</strong>{' '}
                ({CURRENCY_NAMES[contract.payment_currency] || contract.payment_currency}) por la realización de
                los Entregables descritos en este acuerdo.
              </p>
              {contract.payment_terms && (
                <p className="text-sm leading-relaxed text-neutral-700">
                  <strong>3.2</strong> Términos de pago: {contract.payment_terms}
                </p>
              )}
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>3.3</strong> El pago se realizará a través de la plataforma Octopus, la cual actúa como
                intermediario de pagos entre las partes. Los impuestos aplicables son responsabilidad de cada parte
                según las leyes de su jurisdicción.
              </p>
            </div>

            {/* Section 4: Content Requirements */}
            {(contract.hashtags?.length || contract.mentions?.length || contract.brand_guidelines) && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                  4. REQUISITOS DEL CONTENIDO
                </h2>
                {contract.hashtags && contract.hashtags.length > 0 && (
                  <p className="text-sm leading-relaxed text-neutral-700">
                    <strong>4.1 Hashtags obligatorios:</strong> El Creador debe incluir los siguientes hashtags
                    en cada publicación: {contract.hashtags.join(', ')}
                  </p>
                )}
                {contract.mentions && contract.mentions.length > 0 && (
                  <p className="text-sm leading-relaxed text-neutral-700">
                    <strong>4.2 Menciones obligatorias:</strong> El Creador debe mencionar las siguientes cuentas
                    en cada publicación: {contract.mentions.join(', ')}
                  </p>
                )}
                {contract.brand_guidelines && (
                  <div className="text-sm leading-relaxed text-neutral-700">
                    <strong>4.3 Instrucciones de marca:</strong>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mt-2 whitespace-pre-wrap">
                      {contract.brand_guidelines}
                    </div>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-neutral-700">
                  <strong>4.4 Cumplimiento publicitario:</strong> El Creador se compromete a cumplir con todas las
                  regulaciones de publicidad aplicables en su jurisdicción, incluyendo pero no limitado a la
                  divulgación clara del contenido patrocinado mediante las etiquetas requeridas por ley.
                </p>
              </div>
            )}

            {/* Section 5: Content Rights & Usage */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                5. DERECHOS DE CONTENIDO Y USO
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>5.1</strong> El Creador otorga a la Empresa una licencia{' '}
                {contract.usage_rights?.duration_months === 999 ? 'perpetua' : `por ${getUsageRightsDuration()}`},{' '}
                no exclusiva, mundial y libre de regalías para usar, reproducir, modificar, distribuir y mostrar
                públicamente el Contenido creado bajo este acuerdo.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>5.2</strong> El Creador conserva los derechos morales sobre el Contenido de acuerdo con
                las leyes aplicables de su jurisdicción. Los derechos morales son inalienables en los países de
                derecho civil de América Latina.
              </p>
              {contract.usage_rights?.paid_ads && (
                <p className="text-sm leading-relaxed text-neutral-700">
                  <strong>5.3</strong> La Empresa tiene autorización para utilizar el Contenido en campañas de
                  publicidad pagada (Paid Ads) en las plataformas acordadas.
                </p>
              )}
              {contract.usage_rights?.whitelisting && (
                <p className="text-sm leading-relaxed text-neutral-700">
                  <strong>5.4</strong> La Empresa tiene autorización para realizar whitelisting, es decir,
                  publicar contenido publicitario desde la cuenta del Creador según los términos acordados.
                </p>
              )}
            </div>

            {/* Section 6: Exclusivity (if applicable) */}
            {contract.exclusivity_enabled && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                  6. EXCLUSIVIDAD
                </h2>
                <p className="text-sm leading-relaxed text-neutral-700">
                  <strong>6.1</strong> El Creador se compromete a no promocionar, colaborar con, ni crear contenido
                  para empresas competidoras de la Empresa por un período de <strong>{contract.exclusivity_days} días</strong>{' '}
                  a partir de la fecha de publicación del último Entregable.
                </p>
                {contract.exclusivity_competitors && contract.exclusivity_competitors.length > 0 && (
                  <p className="text-sm leading-relaxed text-neutral-700">
                    <strong>6.2</strong> Se consideran competidores directos las siguientes marcas:{' '}
                    {contract.exclusivity_competitors.join(', ')}.
                  </p>
                )}
              </div>
            )}

            {/* Section 7: Confidentiality */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                {contract.exclusivity_enabled ? '7' : '6'}. CONFIDENCIALIDAD
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '7' : '6'}.1</strong> Ambas partes acuerdan mantener en
                estricta confidencialidad los términos financieros de este acuerdo, así como cualquier información
                propietaria compartida durante la colaboración.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '7' : '6'}.2</strong> Esta obligación de confidencialidad
                permanecerá vigente por un período de dos (2) años después de la terminación de este acuerdo.
              </p>
            </div>

            {/* Section 8: Relationship of the Parties */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                {contract.exclusivity_enabled ? '8' : '7'}. RELACIÓN DE LAS PARTES
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '8' : '7'}.1</strong> El Creador actúa como contratista
                independiente y no como empleado de la Empresa. Nada en este acuerdo crea una relación de empleo,
                sociedad o agencia entre las partes.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '8' : '7'}.2</strong> El Creador es responsable de sus
                propios impuestos, seguros y cumplimiento con las leyes laborales de su jurisdicción.
              </p>
            </div>

            {/* Section 9: Term, Suspension & Termination */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                {contract.exclusivity_enabled ? '9' : '8'}. VIGENCIA, SUSPENSIÓN Y TERMINACIÓN
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '9' : '8'}.1</strong> Este acuerdo entra en vigor a
                partir de la fecha de aceptación por ambas partes y permanecerá vigente hasta que se cumplan
                todos los Entregables y obligaciones de pago.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '9' : '8'}.2</strong> Cualquiera de las partes puede
                terminar este acuerdo por incumplimiento material de la otra parte, previa notificación por
                escrito y un período de cura de diez (10) días hábiles.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '9' : '8'}.3</strong> En caso de terminación anticipada
                sin causa justificada, la parte que termine pagará a la otra una compensación proporcional al
                trabajo realizado.
              </p>
            </div>

            {/* Section 10: Limitation of Liability */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                {contract.exclusivity_enabled ? '10' : '9'}. LIMITACIÓN DE RESPONSABILIDAD
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '10' : '9'}.1</strong> En ningún caso la responsabilidad
                de cualquiera de las partes excederá el monto total de la compensación acordada en este contrato.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '10' : '9'}.2</strong> Ninguna de las partes será
                responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos.
              </p>
            </div>

            {/* Section 11: General Provisions */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                {contract.exclusivity_enabled ? '11' : '10'}. DISPOSICIONES GENERALES
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '11' : '10'}.1 Ley aplicable:</strong> Este acuerdo se
                regirá e interpretará de acuerdo con las leyes del país de residencia del Creador.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '11' : '10'}.2 Resolución de disputas:</strong> Cualquier
                disputa será resuelta primero mediante negociación de buena fe. Si no se llega a un acuerdo,
                las partes se someterán a arbitraje vinculante.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '11' : '10'}.3 Acuerdo completo:</strong> Este documento
                constituye el acuerdo completo entre las partes y reemplaza cualquier negociación o acuerdo previo.
              </p>
              <p className="text-sm leading-relaxed text-neutral-700">
                <strong>{contract.exclusivity_enabled ? '11' : '10'}.4 Modificaciones:</strong> Cualquier
                modificación a este acuerdo debe ser por escrito y firmada por ambas partes.
              </p>
            </div>

            {/* Additional Terms */}
            {contract.additional_terms && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                  {contract.exclusivity_enabled ? '12' : '11'}. TÉRMINOS ADICIONALES
                </h2>
                <div className="text-sm leading-relaxed text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg p-4 whitespace-pre-wrap">
                  {contract.additional_terms}
                </div>
              </div>
            )}

            {/* Creator Handles (if accepted) */}
            {contract.status === 'accepted' && contract.creator_handles && contract.creator_handles.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-300 pb-2">
                  INFORMACIÓN DEL CREADOR
                </h2>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-emerald-900 mb-2">Handles de redes sociales:</p>
                  <div className="space-y-1">
                    {contract.creator_handles.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-emerald-800">
                        <span className="font-medium">{PLATFORM_NAMES[h.platform] || h.platform}:</span>
                        <span>{h.handle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Signature Section */}
            <div className="border-t border-neutral-300 pt-8 mt-8">
              <h2 className="text-lg font-bold text-neutral-900 mb-6 text-center">
                FIRMAS
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Company Signature */}
                <div className="border border-neutral-300 rounded-lg p-6">
                  <p className="text-sm font-bold text-neutral-700 mb-4">POR LA EMPRESA:</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-neutral-500">Nombre de la Empresa</p>
                      <p className="text-sm font-medium text-neutral-900 border-b border-neutral-300 pb-1">{companyName}</p>
                    </div>
                    {contract.company_signed_at ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Firmado electrónicamente</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          {formatDateTime(contract.company_signed_at)}
                        </p>
                      </div>
                    ) : (
                      <div className="h-16 border-b border-neutral-300"></div>
                    )}
                  </div>
                </div>

                {/* Creator Signature */}
                <div className="border border-neutral-300 rounded-lg p-6">
                  <p className="text-sm font-bold text-neutral-700 mb-4">POR EL CREADOR:</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-neutral-500">Nombre del Creador</p>
                      <p className="text-sm font-medium text-neutral-900 border-b border-neutral-300 pb-1">{creatorName}</p>
                    </div>
                    {contract.creator_signed_at ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Firmado electrónicamente</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          {formatDateTime(contract.creator_signed_at)}
                        </p>
                      </div>
                    ) : (
                      <div className="h-16 border-b border-neutral-300 flex items-center justify-center">
                        <span className="text-sm text-neutral-400 italic">Pendiente de firma</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Electronic Signature Notice */}
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                <strong>Aviso de firma electrónica:</strong> Las firmas electrónicas en este documento son
                legalmente válidas y vinculantes de acuerdo con la Ley Modelo de Firma Electrónica de UNCITRAL
                y las leyes locales aplicables, incluyendo: Ley de Firma Electrónica Avanzada (México),
                Medida Provisória 2.200-2 (Brasil), Ley 527 de 1999 (Colombia), Ley 25.506 (Argentina),
                y Ley 27269 (Perú).
              </p>
            </div>

            {/* Platform Notice */}
            <div className="text-center text-xs text-neutral-500 pt-4">
              <p>Este contrato fue generado y administrado a través de</p>
              <p className="font-bold text-emerald-600">Octopus - Marketplace de Creadores para LATAM</p>
              <p className="mt-2">Octopus actúa únicamente como intermediario y no es parte de este contrato.</p>
            </div>

          </div>

          {/* Action Footer */}
          {showActions && ['sent', 'viewed'].includes(contract.status) && (
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-200 px-8 py-4 flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-6 py-3 text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
              >
                Cerrar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onReject}
                  className="px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl font-medium transition-colors"
                >
                  Rechazar
                </button>
                <button
                  onClick={onAccept}
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Aceptar y Firmar
                </button>
              </div>
            </div>
          )}

          {/* Status Footer for other statuses */}
          {contract.status === 'accepted' && (
            <div className="bg-green-50 border-t border-green-200 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-green-700">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold">Contrato Aceptado y Firmado</span>
                <span className="text-sm">el {formatDate(contract.accepted_at)}</span>
              </div>
              <div className="flex gap-3">
                {onDeliverContent && (
                  <button
                    onClick={onDeliverContent}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Entregar Contenido
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {contract.status === 'rejected' && (
            <div className="bg-red-50 border-t border-red-200 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-700">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-bold">Contrato Rechazado</span>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {!['sent', 'viewed', 'accepted', 'rejected'].includes(contract.status) && (
            <div className="bg-neutral-100 border-t border-neutral-200 px-8 py-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
