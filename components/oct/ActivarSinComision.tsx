'use client'

import { useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { X, Zap, ExternalLink, Loader2, Check, PlayCircle } from 'lucide-react'

// "Paga menos comisión" — guía de un solo uso, por empresa.
//
// CUÁNTO SE AHORRA, MEDIDO EN PRODUCCIÓN (no lo que dice la documentación)
//   Checkout de tarjeta ....... 7,24%  (probado con $17 reales de Chile)
//   Depósito con tarjeta ...... 3%     (dice la propia pantalla de Whop)
// La documentación de Whop dice que los depósitos "no tienen comisión". Es
// falso para tarjeta: su modal muestra "Total $103.00 incl. 3% fee". Acá se
// promete 3%, que es lo que se ve, no 0% que es lo que está escrito.
//
// POR QUÉ ESTA PANTALLA EXISTE Y POR QUÉ ES ASÍ
// El depósito directo exige una tarjeta guardada A NOMBRE DE LA EMPRESA.
// Whop no expone ninguna forma de crearla: ni API, ni componente embebido. Su
// documentación lo dice sin rodeos: "Before using the API, you need to create
// your first top up from the Dashboard."
//
// Tampoco se puede meter Whop dentro de Octapi: su servidor responde
// x-frame-options: SAMEORIGIN, así que un iframe queda en blanco.
//
// Lo único que queda es abrir su panel en OTRA PESTAÑA. Por eso esta pantalla
// existe: para que ese salto sea corto, guiado y de una sola vez en la vida de
// cada empresa. Octapi se queda abierto atrás; al volver, un botón confirma.
//
// La cuenta a la que entra es SUYA: se crea con su email, así que le pertenece.

export default function ActivarSinComision({
  enlacePanel,
  onListo,
  onCerrar,
}: {
  enlacePanel: string
  /** Se llama cuando ya se detectó la tarjeta de empresa. */
  onListo: () => void
  onCerrar: () => void
}) {
  const [revisando, setRevisando] = useState(false)
  const [noEncontrada, setNoEncontrada] = useState(false)

  const revisar = async () => {
    setRevisando(true)
    setNoEncontrada(false)
    try {
      const res = await fetch('/api/whop/company-cards', { headers: authHeaders() })
      const d = await res.json()
      if (d?.puedeGratis) { onListo(); return }
      setNoEncontrada(true)
    } catch {
      setNoEncontrada(true)
    }
    setRevisando(false)
  }

  // Los nombres son los REALES de la pantalla de Whop, comprobados uno por
  // uno. La primera versión decía "Add Funds" y ese botón no existe: se llama
  // "Deposit". Y decía "entra a Balance" cuando el enlace ya cae ahí. Una
  // instrucción que no calza con lo que la persona ve es peor que ninguna.
  const pasos = [
    'Se abre tu cuenta de pagos en otra pestaña. Octapi se queda acá.',
    'Arriba a la derecha, aprieta el botón "Deposit".',
    'Elige "Card" como forma de pago y escribe tu tarjeta.',
    'Vuelve a esta pestaña y aprieta "Ya la guardé".',
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* encabezado */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-7 text-white">
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            <X className="h-4.5 w-4.5" />
          </button>
          <Zap className="h-7 w-7" />
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Paga menos comisión</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-50">
            Hoy cada depósito paga alrededor de <strong>7%</strong>. Guardando tu
            tarjeta una sola vez, las próximas recargas bajan a <strong>3%</strong>.
            En $100 son $40 de diferencia.
          </p>
        </div>

        <div className="space-y-5 p-6">
          {/* espacio para el video explicativo */}
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <PlayCircle className="h-8 w-8 shrink-0 text-neutral-400" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900">Son 4 pasos, menos de 2 minutos</p>
              <p className="text-xs text-neutral-500">Se hace una sola vez y queda para siempre.</p>
            </div>
          </div>

          <ol className="space-y-3">
            {pasos.map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-neutral-700">{paso}</p>
              </li>
            ))}
          </ol>

          <a
            href={enlacePanel}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98]"
          >
            <ExternalLink className="h-4.5 w-4.5" />
            Abrir mi cuenta de pagos
          </a>

          <button
            onClick={revisar}
            disabled={revisando}
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-neutral-200 py-3.5 font-bold text-neutral-700 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {revisando ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Check className="h-4.5 w-4.5" />}
            Ya la guardé
          </button>

          {noEncontrada && (
            <p className="text-center text-sm font-semibold text-amber-600">
              Todavía no vemos tu tarjeta. Revisa que hayas completado el
              depósito con tarjeta y prueba de nuevo en unos segundos.
            </p>
          )}

          <p className="text-center text-xs leading-relaxed text-neutral-400">
            La cuenta que se abre es tuya: se creó con tu correo cuando te
            registraste. Octapi nunca toca tu dinero.
          </p>
        </div>
      </div>
    </div>
  )
}
