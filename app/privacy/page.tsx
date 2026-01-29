import Link from 'next/link'

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
            <p className="text-gray-600 mt-2">Última actualización: Enero 2026</p>
          </div>

          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Información que Recopilamos</h2>
            <p className="text-gray-700 mb-4">
              Recopilamos información que nos proporcionas directamente, como:
            </p>
            <ul className="text-gray-700 mb-4 space-y-2">
              <li>• Información de perfil (nombre, email, foto de perfil)</li>
              <li>• Información profesional (habilidades, experiencia, portfolio)</li>
              <li>• Comunicaciones entre usuarios de la plataforma</li>
              <li>• Información de pagos y facturación</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Cómo Usamos tu Información</h2>
            <p className="text-gray-700 mb-4">
              Utilizamos la información recopilada para:
            </p>
            <ul className="text-gray-700 mb-4 space-y-2">
              <li>• Facilitar conexiones entre creadores y empresas</li>
              <li>• Procesar pagos y transacciones</li>
              <li>• Mejorar nuestros servicios y experiencia del usuario</li>
              <li>• Enviar comunicaciones importantes sobre tu cuenta</li>
              <li>• Cumplir con requisitos legales</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Compartir Información</h2>
            <p className="text-gray-700 mb-4">
              Solo compartimos tu información en las siguientes circunstancias:
            </p>
            <ul className="text-gray-700 mb-4 space-y-2">
              <li>• Con otros usuarios de la plataforma cuando es necesario para facilitar colaboraciones</li>
              <li>• Con proveedores de servicios que nos ayudan a operar la plataforma</li>
              <li>• Cuando es requerido por ley o para proteger nuestros derechos</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Seguridad de Datos</h2>
            <p className="text-gray-700 mb-4">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información
              personal contra acceso no autorizado, alteración, divulgación o destrucción.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Tus Derechos</h2>
            <p className="text-gray-700 mb-4">
              Tienes derecho a:
            </p>
            <ul className="text-gray-700 mb-4 space-y-2">
              <li>• Acceder a tu información personal</li>
              <li>• Corregir información inexacta</li>
              <li>• Solicitar la eliminación de tu información</li>
              <li>• Objeta al procesamiento de tu información</li>
              <li>• Portabilidad de datos</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Cookies y Tecnologías Similares</h2>
            <p className="text-gray-700 mb-4">
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia en la plataforma,
              analizar el uso y personalizar el contenido.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Retención de Datos</h2>
            <p className="text-gray-700 mb-4">
              Conservamos tu información personal solo durante el tiempo necesario para los fines descritos
              en esta política o según lo requiera la ley.
            </p>

            <div className="border-t border-gray-200 pt-8 mt-8">
              <p className="text-sm text-gray-600">
                Para preguntas sobre esta política de privacidad, contacta a: privacy@octopus.app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}