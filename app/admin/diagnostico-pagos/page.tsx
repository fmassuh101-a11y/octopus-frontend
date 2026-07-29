'use client'

import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/auth/clientToken'
import { Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

// Diagnóstico de medios de pago.
//
// Existe porque una tarjeta se guardó bien en Whop y la app no la encontraba,
// y sin ver la respuesta cruda de Whop solo podíamos suponer por qué. Esta
// pantalla corre la consulta con la sesión de quien la abre y muestra qué
// devolvió cada camino, incluidos los errores.

interface Paso { paso: string; ok: boolean; resultado?: any; error?: string }

export default function DiagnosticoPagos() {
  const [datos, setDatos] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [deposito, setDeposito] = useState<any>(null)

  // Métodos de depósito (transferencia y cripto). Es una consulta aparte y no
  // cobra nada: solo pide las instrucciones para ver si están habilitados.
  const verDeposito = async () => {
    try {
      const res = await fetch('/api/whop/metodos-deposito', { headers: authHeaders() })
      setDeposito(await res.json())
    } catch {
      setDeposito({ ok: false, detalle: 'no se pudo consultar' })
    }
  }

  const correr = async () => {
    setCargando(true); setError('')
    verDeposito()
    try {
      const res = await fetch('/api/whop/diagnostico-tarjetas', { headers: authHeaders() })
      const d = await res.json()
      if (res.status === 401) {
        // "No autorizado" a secas no le dice a nadie qué hacer. Casi siempre es
        // la sesión vencida, no un problema de permisos.
        setError('Tu sesión venció. Cierra sesión, vuelve a entrar y abre esta página de nuevo.')
      } else if (!res.ok) {
        setError(d?.error || 'No se pudo correr el diagnóstico')
      } else setDatos(d)
    } catch { setError('No se pudo correr el diagnóstico') }
    setCargando(false)
  }

  useEffect(() => { correr() }, [])

  const pasos: Paso[] = datos?.pasos || []
  // Un paso "con hallazgo" es el que devolvió algo, no solo el que no falló.
  const conHallazgo = pasos.filter((p) => p.ok && Array.isArray(p.resultado) && p.resultado.length > 0)

  return (
    <div className="min-h-[100dvh] bg-neutral-50 px-5 py-8 text-neutral-900">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Diagnóstico de medios de pago</h1>
            <p className="mt-1 text-sm text-neutral-500">Dónde quedan guardadas las tarjetas en Whop.</p>
          </div>
          <button onClick={correr} disabled={cargando}
            className="flex shrink-0 items-center gap-2 rounded-full border-2 border-neutral-300 px-4 py-2.5 text-sm font-bold transition-colors hover:border-neutral-400 disabled:opacity-50">
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Repetir
          </button>
        </div>

        {error && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
        )}

        {deposito && (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-sm font-extrabold text-neutral-900">Métodos de depósito de tu cuenta</p>
            <p className="mt-1 text-xs text-neutral-500">
              Whop no publica la comisión de estos métodos. Esto dice si están habilitados.
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="font-semibold">Transferencia bancaria:</span>{' '}
                {deposito?.transferencia?.habilitada
                  ? <span className="font-bold text-emerald-600">habilitada</span>
                  : <span className="text-neutral-400">no habilitada</span>}
              </p>
              <p>
                <span className="font-semibold">Cripto:</span>{' '}
                {deposito?.cripto?.habilitada
                  ? <span className="font-bold text-emerald-600">{deposito.cripto.redes.length} red(es)</span>
                  : <span className="text-neutral-400">no habilitada</span>}
              </p>
              {deposito?.paginaAlojada && (
                <p className="break-all text-xs text-neutral-500">
                  Página de depósito: {deposito.paginaAlojada}
                </p>
              )}
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3">
              <pre className="text-[11px] leading-relaxed text-neutral-700">
                {JSON.stringify(deposito, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {datos && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Mi cuenta de pagos</p>
                <p className="mt-1 break-all font-mono text-sm font-semibold">{datos.miCuenta || '— sin cuenta —'}</p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Cuenta de Octapi</p>
                <p className="mt-1 break-all font-mono text-sm font-semibold">{datos.octapi || '—'}</p>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border p-4 ${conHallazgo.length ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-sm font-bold ${conHallazgo.length ? 'text-emerald-900' : 'text-amber-900'}`}>
                {conHallazgo.length
                  ? `Se encontró algo en ${conHallazgo.length} de ${pasos.length} consultas.`
                  : `Ninguna de las ${pasos.length} consultas devolvió medios de pago.`}
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              {pasos.map((p, i) => {
                const vacio = p.ok && Array.isArray(p.resultado) && p.resultado.length === 0
                return (
                  <div key={i} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                    <div className="flex items-start gap-2.5 p-4">
                      {p.ok
                        ? <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${vacio ? 'text-neutral-300' : 'text-emerald-500'}`} />
                        : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="break-all font-mono text-xs font-semibold text-neutral-700">{p.paso}</p>
                        {p.error && <p className="mt-1.5 text-sm font-semibold text-red-600">{p.error}</p>}
                        {vacio && <p className="mt-1 text-sm text-neutral-400">Sin resultados</p>}
                      </div>
                    </div>
                    {p.ok && Array.isArray(p.resultado) && p.resultado.length > 0 && (
                      <div className="overflow-x-auto border-t border-neutral-100 bg-neutral-50 p-4">
                        <pre className="text-xs leading-relaxed text-neutral-700">{JSON.stringify(p.resultado, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {cargando && !datos && (
          <div className="mt-6 space-y-2.5">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-200" />)}
          </div>
        )}
      </div>
    </div>
  )
}
