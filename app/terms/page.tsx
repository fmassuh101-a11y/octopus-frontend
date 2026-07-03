'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    h: '1. Aceptación de los términos',
    p: 'Al crear una cuenta o usar Octopus, aceptas estos Términos de Servicio y nuestra Política de Privacidad. Si no estás de acuerdo, no uses la plataforma.',
  },
  {
    h: '2. Qué es Octopus',
    p: 'Octopus es un marketplace que conecta creadores de contenido con empresas y marcas. Facilitamos la publicación de campañas, la postulación de creadores, los contratos y el procesamiento de pagos. No somos empleadores de los creadores ni agencia de las empresas: actuamos como intermediario tecnológico.',
  },
  {
    h: '3. Elegibilidad',
    p: 'Debes ser mayor de 18 años y tener capacidad legal para contratar. Al registrarte declaras que la información que entregas es verdadera y que mantendrás tu cuenta actualizada.',
  },
  {
    h: '4. Cuentas y seguridad',
    p: 'Eres responsable de la actividad en tu cuenta y de mantener tu contraseña segura. Avísanos de inmediato ante cualquier uso no autorizado. Podemos suspender cuentas que violen estos términos o que presenten actividad fraudulenta.',
  },
  {
    h: '5. Rol de creadores',
    p: 'Los creadores actúan como contratistas independientes. Al aceptar un contrato, se comprometen a entregar el contenido acordado, en los plazos y condiciones especificados, y otorgan a la empresa los derechos de uso pactados en cada contrato. El creador es responsable de sus obligaciones tributarias.',
  },
  {
    h: '6. Rol de empresas',
    p: 'Las empresas son responsables del brief, los derechos que solicitan y el pago acordado. Al publicar una campaña, garantizan que tienen derecho a usar los materiales que entregan (marcas, logos, contenido) y que la campaña no infringe leyes ni derechos de terceros.',
  },
  {
    h: '7. Pagos y comisiones',
    p: 'Octopus cobra una comisión por cada pago procesado, cuyo porcentaje depende del plan de la empresa (indicado en la página de Planes). Las suscripciones de empresa se cobran de forma recurrente hasta que se cancelen. Los pagos a creadores se liberan según lo pactado en cada contrato y tras la aprobación del contenido por parte de la empresa.',
  },
  {
    h: '8. Contenido y propiedad intelectual',
    p: 'El creador conserva la autoría de su contenido y otorga a la empresa la licencia de uso acordada en el contrato. No se permite contenido ilegal, engañoso, que infrinja derechos de autor, ni que vulnere los términos de las plataformas donde se publica (TikTok, Instagram, etc.).',
  },
  {
    h: '9. Conducta prohibida',
    p: 'No se permite: fraude, suplantación de identidad, manipulación de métricas (bots, views o seguidores falsos), acoso, spam, ni intentar vulnerar la seguridad de la plataforma. El incumplimiento puede resultar en la suspensión de la cuenta y la retención de pagos asociados a la conducta.',
  },
  {
    h: '10. Disputas entre usuarios',
    p: 'Las empresas aprueban el contenido entregado. Si hay desacuerdo entre una empresa y un creador, Octopus puede mediar de buena fe, pero no garantiza un resultado. Recomendamos dejar todo por escrito dentro de la plataforma.',
  },
  {
    h: '11. Cancelaciones y reembolsos',
    p: 'Puedes cancelar tu suscripción cuando quieras; seguirá activa hasta el fin del período pagado. Los pagos ya liberados a creadores por trabajo entregado no son reembolsables, salvo casos de fraude comprobado.',
  },
  {
    h: '12. Limitación de responsabilidad',
    p: 'Octopus se ofrece "tal cual". No garantizamos resultados específicos de las campañas ni la conducta de los usuarios. En la medida que la ley lo permita, nuestra responsabilidad se limita a los montos que nos hayas pagado en los últimos 3 meses.',
  },
  {
    h: '13. Cambios en el servicio y los términos',
    p: 'Podemos modificar la plataforma y estos términos. Si los cambios son importantes, te avisaremos. El uso continuado después de un cambio implica su aceptación.',
  },
  {
    h: '14. Ley aplicable',
    p: 'Estos términos se rigen por las leyes de Chile. Cualquier disputa se someterá a los tribunales competentes, sin perjuicio de los derechos que la ley te otorgue como consumidor.',
  },
  {
    h: '15. Contacto',
    p: '¿Dudas sobre estos términos? Escríbenos a fmassuh133@gmail.com.',
  },
]

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Términos de Servicio</h1>
        <p className="text-neutral-500 mb-10">Última actualización: julio 2026</p>

        <div className="space-y-8">
          {SECTIONS.map(s => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold mb-2 text-white">{s.h}</h2>
              <p className="text-neutral-300 leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-800 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 hover:underline">← Volver al inicio</Link>
          <Link href="/privacy" className="text-neutral-400 hover:text-white">Política de Privacidad →</Link>
        </div>
      </div>
    </div>
  )
}
