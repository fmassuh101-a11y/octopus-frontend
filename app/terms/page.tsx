import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-6"
            >
              ← Volver a inicio
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Términos de Servicio</h1>
            <p className="text-gray-600 mt-2">Última actualización: Enero 2026</p>
          </div>

          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Términos de Uso</h2>
            <p className="text-gray-700 mb-4">
              Al utilizar Octopus, aceptas cumplir con estos términos de servicio. Esta plataforma conecta
              creadores de contenido con empresas para oportunidades de trabajo colaborativo.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Responsabilidades del Usuario</h2>
            <ul className="text-gray-700 mb-4 space-y-2">
              <li>• Proporcionar información veraz y actualizada</li>
              <li>• Cumplir con todos los términos acordados en las colaboraciones</li>
              <li>• Mantener un comportamiento profesional y respetuoso</li>
              <li>• No usar la plataforma para actividades ilegales o no autorizadas</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Pagos y Comisiones</h2>
            <p className="text-gray-700 mb-4">
              Octopus cobra una comisión del servicio por facilitar las conexiones entre creadores y empresas.
              Los detalles de pagos se especificarán en cada colaboración individual.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Propiedad Intelectual</h2>
            <p className="text-gray-700 mb-4">
              Los creadores mantienen los derechos de su contenido original, sujeto a los términos específicos
              acordados con las empresas para cada proyecto.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Limitaciones de Responsabilidad</h2>
            <p className="text-gray-700 mb-4">
              Octopus actúa como una plataforma intermediaria. No somos responsables por disputas entre
              creadores y empresas, calidad del contenido, o cumplimiento de acuerdos individuales.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Modificaciones</h2>
            <p className="text-gray-700 mb-4">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los usuarios
              serán notificados de cambios significativos.
            </p>

            <div className="border-t border-gray-200 pt-8 mt-8">
              <p className="text-sm text-gray-600">
                Para preguntas sobre estos términos, contacta a: legal@octopus.app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}