'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle } from 'lucide-react'

// Toast liviano estilo iOS: cápsula blanca que baja desde arriba y se va sola.
// Uso: toast('Postulaste con éxito') | toast('No se pudo', 'error')
type ToastMsg = { id: number; text: string; kind: 'ok' | 'error' }
let push: ((t: ToastMsg) => void) | null = null
let seq = 1

export function toast(text: string, kind: 'ok' | 'error' = 'ok') {
  push?.({ id: seq++, text, kind })
}

export default function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([])

  useEffect(() => {
    push = (t) => {
      setItems((prev) => [...prev.slice(-2), t])
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 2600)
    }
    return () => { push = null }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[200] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="flex items-center gap-2.5 rounded-full border border-black/[0.06] bg-white px-5 py-3 text-[15px] font-semibold text-neutral-900 shadow-[0_10px_35px_rgba(0,0,0,0.16)]"
          >
            {t.kind === 'ok'
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-600" />
              : <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
