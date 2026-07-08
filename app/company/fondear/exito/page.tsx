'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Wallet, Rocket } from 'lucide-react'

// Depósito exitoso — celebración limpia y elegante.
function ExitoInner() {
  const router = useRouter()
  const params = useSearchParams()
  const monto = Math.max(0, Number(params.get('monto')) || 0)
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0891B2] via-[#0E7490] to-[#155E75] px-6 text-white">
      {/* burbujas subiendo */}
      {ready && [12, 26, 44, 60, 76, 88, 34, 68].map((x, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/15"
          style={{ left: `${x}%`, width: 10 + (i % 4) * 8, height: 10 + (i % 4) * 8 }}
          initial={{ y: '105vh', opacity: 0 }}
          animate={{ y: '-10vh', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 7 + (i % 5), repeat: Infinity, delay: i * 0.9, ease: 'linear' }}
        />
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-white/30" style={{ animationIterationCount: 3 }} />
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600">
          <Check className="h-11 w-11 text-white" strokeWidth={3.5} />
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="mt-8 text-center text-[40px] font-extrabold leading-tight tracking-tight"
      >
        ¡Felicitaciones!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="mt-2 max-w-sm text-center text-lg text-cyan-100"
      >
        Tu depósito se acreditó y ya está disponible en tu cuenta.
      </motion.p>

      {monto > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}
          className="mt-7 rounded-3xl bg-white/10 px-10 py-5 text-center backdrop-blur-sm"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-200">Se acreditaron</p>
          <p className="mt-1 text-[44px] font-extrabold leading-none tabular-nums">${fmt(monto)}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
        className="mt-9 w-full max-w-sm space-y-3"
      >
        <button onClick={() => router.push('/company/wallet')}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-lg font-bold text-cyan-800 shadow-xl transition-transform active:scale-[0.98]">
          <Wallet className="h-5 w-5" /> Ver mi balance
        </button>
        <button onClick={() => router.push('/company/dashboard')}
          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/40 py-3.5 font-bold text-white transition-transform active:scale-[0.98]">
          <Rocket className="h-5 w-5" /> Lanzar una campaña
        </button>
      </motion.div>
    </div>
  )
}

export default function ExitoPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#0891B2]" />}>
      <ExitoInner />
    </Suspense>
  )
}
