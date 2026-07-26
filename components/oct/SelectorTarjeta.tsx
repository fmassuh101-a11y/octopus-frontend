'use client'

import { Check, CreditCard, Landmark, Plus } from 'lucide-react'

// Selector de medios de pago guardados.
//
// Whop entrega la MARCA de la tarjeta (Visa, Mastercard, Amex...), no el banco
// que la emitió. El banco solo viene en cuentas bancarias, en el campo
// bank_name. Por eso una tarjeta del Scotiabank se muestra como "Visa ···· 4242"
// y no como "Scotiabank": el dato del banco no nos lo da nadie, y preferimos no
// inventarlo antes que mostrar algo falso.

export interface Tarjeta {
  id: string
  tipo: string
  marca: string | null
  ultimos4: string | null
  expMes: number | null
  expAno: number | null
  banco: string | null
}

// Cada marca con sus colores reales, para que la tarjetita se reconozca de una.
const ESTILO: Record<string, { grad: string; texto: string }> = {
  visa: { grad: 'from-[#1A1F71] to-[#2A3A9E]', texto: 'text-white' },
  mastercard: { grad: 'from-[#1A1A1A] to-[#3A3A3A]', texto: 'text-white' },
  amex: { grad: 'from-[#016FD0] to-[#0055A5]', texto: 'text-white' },
  discover: { grad: 'from-[#E85C1A] to-[#F79E1B]', texto: 'text-white' },
  diners: { grad: 'from-[#0079BE] to-[#00A0DC]', texto: 'text-white' },
  elo: { grad: 'from-[#1A1A1A] to-[#C4161C]', texto: 'text-white' },
  maestro: { grad: 'from-[#0099DF] to-[#EB001B]', texto: 'text-white' },
  unionpay: { grad: 'from-[#005B9F] to-[#E21836]', texto: 'text-white' },
  jcb: { grad: 'from-[#0E4C96] to-[#D40E2A]', texto: 'text-white' },
}
const NEUTRO = { grad: 'from-neutral-700 to-neutral-900', texto: 'text-white' }

// El logotipo de cada marca, dibujado con tipografía. Nada de imágenes
// externas: cargan lento, se rompen y algunas tienen licencia.
function Logo({ marca, tipo }: { marca: string | null; tipo: string }) {
  if (tipo === 'us_bank_account') return <Landmark className="h-5 w-5 opacity-90" />
  switch (marca) {
    case 'visa':
      return <span className="text-[15px] font-black italic tracking-tight">VISA</span>
    case 'mastercard':
      return (
        <span className="flex items-center">
          <span className="h-5 w-5 rounded-full bg-[#EB001B]" />
          <span className="-ml-2 h-5 w-5 rounded-full bg-[#F79E1B] mix-blend-hard-light" />
        </span>
      )
    case 'amex':
      return <span className="text-[11px] font-black leading-tight">AMEX</span>
    case 'discover':
      return <span className="text-[11px] font-black tracking-tight">DISCOVER</span>
    default:
      return <CreditCard className="h-5 w-5 opacity-90" />
  }
}

export function nombreVisible(t: Tarjeta): string {
  if (t.banco) return t.banco
  const nombres: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    maestro: 'Maestro',
    elo: 'Elo',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  }
  if (t.marca && nombres[t.marca]) return nombres[t.marca]
  const tipos: Record<string, string> = {
    paypal: 'PayPal',
    cashapp: 'Cash App',
    venmo: 'Venmo',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
    link: 'Link',
    us_bank_account: 'Cuenta bancaria',
    crypto: 'Cripto',
  }
  return tipos[t.tipo] || (t.tipo === 'card' ? 'Tarjeta' : t.tipo.replace(/_/g, ' '))
}

// ¿Está vencida? Se avisa en vez de dejar que el cobro falle sin explicación.
function vencida(t: Tarjeta): boolean {
  if (!t.expAno || !t.expMes) return false
  const ano = t.expAno < 100 ? 2000 + t.expAno : t.expAno
  const hoy = new Date()
  return ano < hoy.getFullYear() || (ano === hoy.getFullYear() && t.expMes < hoy.getMonth() + 1)
}

export default function SelectorTarjeta({
  tarjetas,
  elegida,
  onElegir,
  onAgregar,
  ocupado = false,
}: {
  tarjetas: Tarjeta[]
  elegida: string | null
  onElegir: (id: string) => void
  onAgregar: () => void
  ocupado?: boolean
}) {
  return (
    <div className="space-y-2.5">
      {tarjetas.map((t) => {
        const sel = t.id === elegida
        const est = (t.marca && ESTILO[t.marca]) || NEUTRO
        const exp = t.expMes && t.expAno
          ? `${String(t.expMes).padStart(2, '0')}/${String(t.expAno).slice(-2)}`
          : null
        const mala = vencida(t)

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !mala && onElegir(t.id)}
            disabled={ocupado || mala}
            aria-pressed={sel}
            className={`flex w-full items-center gap-3.5 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.99] disabled:cursor-not-allowed ${
              sel ? 'border-cyan-500 bg-cyan-50/60' : 'border-neutral-200 bg-white hover:border-neutral-300'
            } ${mala ? 'opacity-55' : ''}`}
          >
            {/* la tarjetita, con los colores de su marca */}
            <span
              className={`flex h-11 w-[62px] shrink-0 items-end justify-start rounded-lg bg-gradient-to-br p-2 shadow-sm ${est.grad} ${est.texto}`}
            >
              <Logo marca={t.marca} tipo={t.tipo} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold text-neutral-900">
                {nombreVisible(t)}
                {t.ultimos4 && (
                  <span className="ml-1.5 font-semibold tabular-nums text-neutral-500">···· {t.ultimos4}</span>
                )}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-neutral-500">
                {mala ? (
                  <span className="text-red-500">Vencida{exp ? ` en ${exp}` : ''}</span>
                ) : exp ? (
                  <>Vence {exp}</>
                ) : (
                  'Guardada'
                )}
              </span>
            </span>

            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                sel ? 'border-cyan-500 bg-cyan-500' : 'border-neutral-300'
              }`}
            >
              {sel && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
            </span>
          </button>
        )
      })}

      <button
        type="button"
        onClick={onAgregar}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 py-3.5 text-sm font-bold text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {tarjetas.length ? 'Agregar otra tarjeta' : 'Guardar una tarjeta'}
      </button>
    </div>
  )
}
