'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    h: '1. Quiénes somos',
    p: 'Octopus es un marketplace que conecta creadores de contenido con empresas y marcas en Latinoamérica. Esta Política de Privacidad explica qué datos recopilamos, cómo los usamos y qué derechos tienes. Al usar Octopus, aceptas estas prácticas.',
  },
  {
    h: '2. Información que recopilamos',
    p: 'Recopilamos: (a) datos de cuenta: nombre, email, teléfono, contraseña; (b) datos de perfil: biografía, ubicación, foto, categorías, nivel; (c) datos de redes sociales que conectas voluntariamente (TikTok, Instagram, YouTube): usuario público, seguidores y métricas públicas; (d) datos de transacciones: campañas, contratos, montos y método de pago (procesados por nuestros proveedores de pago); (e) datos técnicos: dirección IP, tipo de dispositivo y navegador, para seguridad y funcionamiento.',
  },
  {
    h: '3. Cómo usamos tu información',
    p: 'Usamos tus datos para: operar la plataforma y conectar creadores con empresas; procesar pagos y comisiones; verificar identidad y prevenir fraude; mostrarte campañas relevantes; enviarte avisos importantes de tu cuenta; y cumplir obligaciones legales.',
  },
  {
    h: '4. Base para el tratamiento',
    p: 'Tratamos tus datos con tu consentimiento, para ejecutar el contrato de uso de la plataforma, para cumplir obligaciones legales, y para nuestros intereses legítimos (seguridad y mejora del servicio). Puedes retirar tu consentimiento en cualquier momento.',
  },
  {
    h: '5. Integración con redes sociales',
    p: 'Cuando conectas TikTok, Instagram u otra red, solo accedemos a la información necesaria para verificar tu cuenta y mostrar tu información pública (usuario, seguidores, métricas). No publicamos en tu nombre sin tu permiso, y puedes desconectar tus cuentas cuando quieras.',
  },
  {
    h: '6. Pagos',
    p: 'Los pagos a creadores y el cobro a empresas se procesan a través de proveedores externos (por ejemplo Whop para payouts y MercadoPago para suscripciones). No almacenamos los datos completos de tu tarjeta; los maneja el proveedor de pago bajo sus propios estándares de seguridad (PCI-DSS). Para retirar fondos, los creadores completan una verificación de identidad (KYC).',
  },
  {
    h: '7. Con quién compartimos datos',
    p: 'No vendemos tu información personal. Compartimos datos únicamente con: las empresas o creadores con los que decides trabajar; proveedores que operan el servicio (pagos, hosting, autenticación); y autoridades cuando la ley lo exige.',
  },
  {
    h: '8. Cookies y almacenamiento local',
    p: 'Usamos almacenamiento local del navegador y cookies necesarias para mantener tu sesión iniciada y hacer funcionar la plataforma. No usamos cookies de publicidad de terceros.',
  },
  {
    h: '9. Seguridad',
    p: 'Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado en tránsito (HTTPS), políticas de acceso a nivel de fila (RLS) en nuestra base de datos, límites de peticiones y control de sesiones. Ningún sistema es 100% infalible, pero trabajamos para mantener tus datos seguros.',
  },
  {
    h: '10. Retención de datos',
    p: 'Conservamos tus datos mientras tu cuenta esté activa y el tiempo necesario para cumplir obligaciones legales, contables y tributarias. Si eliminas tu cuenta, borramos o anonimizamos tus datos personales salvo lo que debamos conservar por ley.',
  },
  {
    h: '11. Tus derechos',
    p: 'Tienes derecho a acceder, rectificar, actualizar y eliminar tus datos, así como a oponerte a ciertos tratamientos y a solicitar una copia de tu información. En Chile, estos derechos se enmarcan en la Ley N° 19.628 sobre Protección de la Vida Privada. Para ejercerlos, escríbenos.',
  },
  {
    h: '12. Menores de edad',
    p: 'Octopus es solo para mayores de 18 años. No recopilamos conscientemente datos de menores. Si detectamos una cuenta de un menor, la eliminaremos.',
  },
  {
    h: '13. Transferencias internacionales',
    p: 'Algunos de nuestros proveedores (hosting, pagos) pueden procesar datos fuera de tu país. En esos casos, tomamos medidas para que tus datos reciban un nivel de protección adecuado.',
  },
  {
    h: '14. Cambios a esta política',
    p: 'Podemos actualizar esta política. Si hacemos cambios importantes, te avisaremos por la plataforma o por email. La fecha de "última actualización" indica la versión vigente.',
  },
  {
    h: '15. Contacto',
    p: '¿Preguntas sobre tu privacidad? Escríbenos a fmassuh133@gmail.com y te responderemos.',
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
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
          <Link href="/terms" className="text-neutral-400 hover:text-white">Términos de Servicio →</Link>
        </div>
      </div>
    </div>
  )
}
