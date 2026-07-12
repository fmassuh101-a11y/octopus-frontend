'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// Chat embebido de Whop (DMs + grupos) dentro de Octopus, para la empresa.
// ?user=<id> abre directo el DM con ese creador.
const WhopChat = dynamic(() => import('@/components/oct/WhopChat'), { ssr: false })

function CompanyChatInner() {
  const router = useRouter()
  const params = useSearchParams()
  const userId = params.get('user') || ''
  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] px-4 py-4 text-neutral-900 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/company/dashboard'))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold">Mensajes</h1>
        </div>
        <WhopChat role="company" initialUserId={userId} />
      </div>
    </div>
  )
}

export default function CompanyChatPage() {
  // useSearchParams necesita Suspense en Next 14
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F7FAFD]" />}>
      <CompanyChatInner />
    </Suspense>
  )
}
