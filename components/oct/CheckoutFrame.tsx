'use client'

import { ReactNode } from 'react'
import { SiVisa, SiMastercard, SiAmericanexpress } from '@icons-pack/react-simple-icons'
import { Lock, ShieldCheck, X } from 'lucide-react'

// Marco premium y confiable para envolver cualquier checkout embebido de Whop.
// Cabecera con candado + sellos, tarjetas aceptadas, y pie "cifrado / Powered by Whop".
export default function CheckoutFrame({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(8,80,110,0.18)]">
      {/* cabecera de confianza */}
      <div className="bg-gradient-to-r from-[#0891B2] to-[#0E7490] px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight">{title}</p>
            {subtitle ? <p className="mt-0.5 text-sm text-cyan-50/90">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button onClick={onClose} aria-label="Cerrar"
              className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-2 text-cyan-50/90">
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
            <Lock className="h-3 w-3" /> Pago seguro cifrado
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <SiVisa className="h-4 w-7" />
            <SiMastercard className="h-4 w-6" />
            <SiAmericanexpress className="h-4 w-6" />
          </span>
        </div>
      </div>

      {/* contenido (el checkout embebido) */}
      <div className="px-4 py-4">{children}</div>

      {/* pie */}
      <div className="flex items-center justify-center gap-1.5 border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-[11px] font-semibold text-neutral-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        Cifrado de extremo a extremo · Procesado por Whop
      </div>
      {footer}
    </div>
  )
}
