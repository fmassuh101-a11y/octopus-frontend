'use client'

import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { X, Zap, ExternalLink, Loader2, Check, ShieldCheck, CreditCard } from 'lucide-react'

// "Deposita sin comisión" — activación de un solo uso, por empresa.
//
// CUÁNTO SE AHORRA
//   Checkout de tarjeta ....... 7,24%  ← MEDIDO por nosotros: $17 reales desde
//                                        Chile acreditaron $15,77. Base 2,7% +
//                                        $0,30, más cross-border y conversión
//                                        por ser tarjeta extranjera.
//   topups.create ............. 0%     ← lo afirma Whop dos veces: no genera
//                                        payment_processing_fee, cross_border
//                                        ni fx_fee. TODAVÍA NO LO MEDIMOS
//                                        nosotros; confirmar en el primer
//                                        depósito real por esta vía.
//
// NOTA para quien venga después: el modal "Top up balance" del panel de Whop
// muestra "incl. 3% fee", pero eso es OTRA operación — mover plata desde el
// saldo personal a la cuenta. No es un cobro a tarjeta y no aplica acá.
//
// POR QUÉ SON DOS PASOS Y NO UNO
// La primera versión mandaba directo a guardar la tarjeta. Whop desviaba a su
// pantalla de verificación de identidad en medio del camino, las instrucciones
// dejaban de calzar con lo que la persona veía, y quedaba perdida. Whop exige
// identidad ANTES de habilitar la cuenta, así que ese es el paso 1.
//
// POR QUÉ EL PASO 2 SALE DE LA APP
// El depósito directo exige una tarjeta guardada A NOMBRE DE LA EMPRESA. Whop
// no expone forma de crearla: ni API, ni componente embebido. Su documentación
// lo dice sin rodeos: "Before using the API, you need to create your first top
// up from the Dashboard." Y su panel no se puede meter dentro de Octapi porque
// responde x-frame-options: SAMEORIGIN.
//
// Por eso se abre en otra pestaña, guiado, una sola vez por empresa. Octapi se
// queda abierto atrás. La cuenta que se abre es SUYA: se creó con su correo.

type Paso = 'cargando' | 'verificar' | 'revisando' | 'tarjeta' | 'listo'

export default function ActivarSinComision({
  onListo,
  onCerrar,
}: {
  onListo: () => void
  onCerrar: () => void
}) {
  const [paso, setPaso] = useState<Paso>('cargando')
  const [abriendo, setAbriendo] = useState(false)
  const [revisando, setRevisando] = useState(false)
  const [aviso, setAviso] = useState('')

  const leerEstado = async (silencioso = false) => {
    if (!silencioso) { setRevisando(true); setAviso('') }
    try {
      const res = await fetch('/api/whop/estado-cuenta', { headers: authHeaders() })
      const d = await res.json()
      if (d?.ok) {
        setPaso(d.paso)
        if (d.paso === 'listo') { onListo(); return }
        if (!silencioso) {
          setAviso(
            d.paso === 'revisando'
              ? 'Tu verificación sigue en revisión. Te avisamos apenas la aprueben.'
              : d.paso === 'verificar'
                ? 'Todavía no vemos tu cuenta verificada. Si acabas de terminar, espera unos segundos y prueba de nuevo.'
                : 'Todavía no vemos tu tarjeta. Revisa que hayas completado el depósito con tarjeta y prueba de nuevo.'
          )
        }
      } else if (!silencioso) {
        setAviso('No pudimos revisar el estado de tu cuenta.')
      }
    } catch {
      if (!silencioso) setAviso('No pudimos revisar el estado de tu cuenta.')
    }
    setRevisando(false)
  }

  useEffect(() => { leerEstado(true) }, [])

  // Se abre la cuenta por un enlace que VINCULA a la persona con ella. Crear la
  // cuenta por API no le da acceso a nadie: con un enlace normal al panel, Whop
  // le pide iniciar sesión, entra con un usuario suelto y no llega a su cuenta.
  const abrirCuenta = async () => {
    setAbriendo(true)
    setAviso('')
    // La pestaña se abre ANTES de pedir el enlace: si se abriera después, el
    // navegador la bloquea por no venir de un clic directo.
    const pestana = window.open('', '_blank')
    try {
      // Para guardar la tarjeta hay que ir al saldo, no a la verificación: si
      // la identidad ya se envió, el enlace de verificación devuelve de
      // inmediato sin mostrar nada.
      const ruta = paso === 'tarjeta'
        ? '/api/whop/onboarding-link?destino=balance'
        : '/api/whop/onboarding-link'
      const res = await fetch(ruta, { headers: authHeaders() })
      const d = await res.json()
      if (d?.ok && d.url) {
        if (pestana) pestana.location.href = d.url
        else window.location.href = d.url
      } else {
        pestana?.close()
        setAviso(d?.error || 'No se pudo abrir tu cuenta de pagos.')
      }
    } catch {
      pestana?.close()
      setAviso('No se pudo abrir tu cuenta de pagos.')
    }
    setAbriendo(false)
  }

  const pasosVerificar = [
    'Se abre tu cuenta en otra pestaña. Octapi se queda acá.',
    'Completa tu nombre, fecha de nacimiento y dirección.',
    'Sube tu documento de identidad cuando te lo pida.',
    'Vuelve a esta pestaña y aprieta "Ya me verifiqué".',
  ]

  // PASOS REALES, sacados de la pantalla de Whop una por una.
  //
  // NO se describe dónde está el botón por su POSICIÓN. Whop lo pone arriba a
  // la derecha en la página de Balance y abajo al centro en Home, y según por
  // dónde entre la persona cae en una u otra. Decir "arriba a la derecha" la
  // dejó buscando un botón que en su pantalla estaba abajo. Se describe por
  // sus vecinos, que no cambian: va junto a "Accept" y "Send".
  //
  // El camino no es obvio y por eso hay que decirlo completo: dentro de
  // "Deposit" NO aparece la opción de tarjeta a la vista. Whop llega con
  // "Personal balance" preseleccionado y la tarjeta está escondida detrás del
  // botón "Change".
  //
  // Y hay algo que no se puede maquillar: Whop no tiene un "guardar tarjeta" a
  // secas. La única forma de dejarla guardada es HACER un primer depósito con
  // ella. Por eso se le pide un monto chico y se le dice para qué sirve, en vez
  // de mandarlo a "conectar la tarjeta" y que se encuentre pagando sin aviso.
  const pasosTarjeta = [
    'Se abre tu cuenta en otra pestaña. Octapi se queda acá.',
    'Busca el botón "Deposit" — está junto a "Accept" y "Send".',
    'Escribe un monto chico, por ejemplo 5.',
    'Abajo aparece "Personal balance". Aprieta "Change" al lado.',
    'Elige "Card", escribe tu tarjeta y aprieta "Select".',
    'Aprieta "Pay" para confirmar ese primer depósito.',
    'Vuelve a esta pestaña y aprieta "Ya la guardé".',
  ]

  const enVerificar = paso === 'verificar'
  const lista = enVerificar ? pasosVerificar : pasosTarjeta

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-7 text-white">
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <Zap className="h-7 w-7" />
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Deposita sin comisión</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-50">
            Hoy cada depósito paga cerca de <strong>7%</strong> de comisión. Con
            esto activado, tus recargas entran <strong>completas</strong>. Son dos
            pasos y se hacen una sola vez.
          </p>
        </div>

        {paso === 'cargando' ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Revisando tu cuenta…
          </div>
        ) : paso === 'revisando' ? (
          /* EN REVISIÓN. Acá NO va ningún botón que abra Whop: la persona ya
             hizo su parte y no hay nada que pueda apurar. Ofrecerle "abrir mi
             cuenta" sería mandarla a una pantalla donde no puede hacer nada. */
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-neutral-900">Tu verificación está en revisión</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Ya enviaste tus datos y el procesador los está revisando. Suele
                tardar unos minutos, a veces algunas horas. No tienes que hacer
                nada más: te avisamos apenas quede aprobada.
              </p>
            </div>
            <button
              onClick={() => leerEstado()}
              disabled={revisando}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-neutral-200 py-3.5 font-bold text-neutral-700 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {revisando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Revisar de nuevo
            </button>
            {aviso && <p className="text-sm font-semibold text-amber-600">{aviso}</p>}
            <button onClick={onCerrar} className="w-full py-2 text-sm font-semibold text-neutral-500">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {/* Dónde va. El paso ya hecho queda tachado, para que se vea avance
                en vez de dos pasos idénticos sin contexto. */}
            <div className="flex gap-2">
              <div
                className={`flex flex-1 items-center gap-2 rounded-xl border p-3 ${
                  enVerificar ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                {enVerificar ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={3} />
                )}
                <span className={`text-xs font-bold ${enVerificar ? 'text-emerald-900' : 'text-neutral-400 line-through'}`}>
                  1. Verifica tu identidad
                </span>
              </div>
              <div
                className={`flex flex-1 items-center gap-2 rounded-xl border p-3 ${
                  !enVerificar ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <CreditCard className={`h-4 w-4 shrink-0 ${!enVerificar ? 'text-emerald-600' : 'text-neutral-300'}`} />
                <span className={`text-xs font-bold ${!enVerificar ? 'text-emerald-900' : 'text-neutral-400'}`}>
                  2. Guarda tu tarjeta
                </span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-600">
              {enVerificar
                ? 'Nuestro procesador de pagos necesita confirmar tu identidad antes de habilitar tu cuenta. Es el mismo trámite que pide cualquier banco, y se hace una sola vez.'
                : 'Tu identidad ya está verificada. Falta guardar tu tarjeta. Whop no tiene un botón de "solo guardar": la tarjeta queda registrada al hacer un primer depósito con ella. Con $5 basta — esa plata queda en tu balance, no se pierde.'}
            </p>

            <ol className="space-y-3">
              {lista.map((texto, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-700">{texto}</p>
                </li>
              ))}
            </ol>

            <button
              onClick={abrirCuenta}
              disabled={abriendo}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {abriendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {enVerificar ? 'Verificar mi cuenta' : 'Abrir mi cuenta de pagos'}
            </button>

            <button
              onClick={() => leerEstado()}
              disabled={revisando}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-neutral-200 py-3.5 font-bold text-neutral-700 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {revisando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {enVerificar ? 'Ya me verifiqué' : 'Ya la guardé'}
            </button>

            {aviso && <p className="text-center text-sm font-semibold text-amber-600">{aviso}</p>}

            <p className="text-center text-xs leading-relaxed text-neutral-400">
              La cuenta que se abre es tuya: se creó con tu correo cuando te
              registraste en Octapi. Nosotros nunca tocamos tu dinero.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
