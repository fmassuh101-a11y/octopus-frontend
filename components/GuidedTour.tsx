'use client'

import { useEffect, useState } from 'react'

export interface TourStep { title: string; body: string }

// Tour guiado para usuarios nuevos. Se muestra una sola vez (guarda "visto"
// en localStorage). Pasos configurables. Con botón de saltar. Sin emojis.
export default function GuidedTour({ steps, storageKey }: { steps: TourStep[]; storageKey: string }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        const t = setTimeout(() => setOpen(true), 600)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [storageKey])

  const close = () => {
    try { localStorage.setItem(storageKey, '1') } catch {}
    setOpen(false)
  }

  if (!open || steps.length === 0) return null
  const step = steps[i]
  const last = i === steps.length - 1

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-7 shadow-2xl">
        {/* progreso */}
        <div className="flex items-center gap-1.5 mb-5">
          {steps.map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full flex-1 transition-colors ${idx <= i ? 'bg-emerald-500' : 'bg-neutral-700'}`} />
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400 mb-2">
          Paso {i + 1} de {steps.length}
        </p>
        <h3 className="text-2xl font-bold text-white mb-2 text-balance">{step.title}</h3>
        <p className="text-neutral-300 leading-relaxed">{step.body}</p>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button onClick={close} className="text-sm font-medium text-neutral-500 hover:text-neutral-300 transition-colors">
            Saltar
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-semibold text-sm transition-colors">
                Atrás
              </button>
            )}
            <button onClick={() => (last ? close() : setI(i + 1))}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">
              {last ? 'Empezar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
