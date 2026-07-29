'use client'

import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { X, ShieldCheck, ExternalLink, Loader2, Check } from 'lucide-react'

// Verificación de identidad de la empresa.
//
// POR QUÉ ESTÁ SOLA Y NO MEZCLADA CON EL DEPÓSITO
// Antes esto vivía dentro de la pantalla de "deposita sin comisión", junto con
// un segundo paso para guardar la tarjeta. Ese segundo paso resultó no servir:
// Whop no permite registrar el medio de pago de una empresa por API, y el
// camino manual por su panel era largo y terminaba en pantallas distintas
// según por dónde entrara la persona.
//
// La verificación, en cambio, SÍ funciona bien: el enlace lleva a la cuenta
// correcta con sesión iniciada, y Whop suele aprobar al instante. Así que
// queda sola, que es lo que hace bien.
//
// Es un requisito real: sin identidad verificada, el procesador retiene los
// depósitos y no deja operar la cuenta.

type Paso = 'cargando' | 'verificar' | 'revisando' | 'listo'

export default function VerificarEmpresa({
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
        // Acá solo importa la identidad. Que tenga o no tarjeta guardada es
        // otro asunto y ya no se le pide a nadie.
        if (d.verificada) { setPaso('listo'); onListo(); return }
        setPaso(d.enRevision ? 'revisando' : 'verificar')
        if (!silencioso) {
          setAviso(
            d.enRevision
              ? 'Tu verificación sigue en revisión. Te avisamos apenas la aprueben.'
              : 'Todavía no la vemos aprobada. Si acabas de terminar, espera unos segundos y prueba de nuevo.'
          )
        }
        return
      }
      if (!silencioso) setAviso('No pudimos revisar el estado de tu cuenta.')
    } catch {
      if (!silencioso) setAviso('No pudimos revisar el estado de tu cuenta.')
    }
    setRevisando(false)
  }

  useEffect(() => { leerEstado(true) }, [])

  // El enlace VINCULA a la persona con su cuenta. Con una dirección normal al
  // panel, Whop le pide iniciar sesión, entra con un usuario suelto y no llega
  // a su cuenta. Esto ya está probado y funciona.
  const abrirVerificacion = async () => {
    setAbriendo(true)
    setAviso('')
    // La pestaña se abre ANTES de pedir el enlace: si se abriera después, el
    // navegador la bloquea por no venir de un clic directo.
    const pestana = window.open('', '_blank')
    try {
      const res = await fetch('/api/whop/onboarding-link', { headers: authHeaders() })
      const d = await res.json()
      if (d?.ok && d.url) {
        if (pestana) pestana.location.href = d.url
        else window.location.href = d.url
      } else {
        pestana?.close()
        setAviso(d?.error || 'No se pudo abrir la verificación.')
      }
    } catch {
      pestana?.close()
      setAviso('No se pudo abrir la verificación.')
    }
    setAbriendo(false)
  }

  const pasos = [
    'Se abre una pestaña con tu cuenta. Octapi se queda acá.',
    'Completa tu nombre, fecha de nacimiento y dirección.',
    'Sube tu documento de identidad cuando te lo pida.',
    'Vuelve a esta pestaña y aprieta "Ya me verifiqué".',
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative bg-gradient-to-br from-cyan-500 to-cyan-600 px-6 py-7 text-white">
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <ShieldCheck className="h-7 w-7" />
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Verifica tu empresa</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-cyan-50">
            Es un requisito de nuestro procesador de pagos, igual que en un banco.
            Se hace <strong>una sola vez</strong> y suele aprobarse al instante.
          </p>
        </div>

        {paso === 'cargando' ? (
          <div className="flex items-center justify-center gap-2 py-16 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Revisando tu cuenta…
          </div>
        ) : paso === 'revisando' ? (
          /* Sin botón para abrir Whop: la persona ya hizo su parte y no hay
             nada que pueda apurar desde allá. */
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-neutral-900">En revisión</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Ya enviaste tus datos. No tienes que hacer nada más — te avisamos
                apenas quede aprobada.
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
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <ol className="space-y-3">
              {pasos.map((texto, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed text-neutral-700">{texto}</p>
                </li>
              ))}
            </ol>

            <button
              onClick={abrirVerificacion}
              disabled={abriendo}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-600 py-4 text-base font-bold text-white shadow-lg shadow-cyan-200 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {abriendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Verificar mi empresa
            </button>

            <button
              onClick={() => leerEstado()}
              disabled={revisando}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-neutral-200 py-3.5 font-bold text-neutral-700 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {revisando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Ya me verifiqué
            </button>

            {aviso && <p className="text-center text-sm font-semibold text-amber-600">{aviso}</p>}

            <p className="text-center text-xs leading-relaxed text-neutral-400">
              La cuenta que se abre es tuya: se creó con tu correo al registrarte
              en Octapi. Nosotros nunca tocamos tu dinero.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
