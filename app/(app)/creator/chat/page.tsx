'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// Chat embebido de Whop (DMs + grupos) dentro de Octopus, para el creador.
const WhopChat = dynamic(() => import('@/components/oct/WhopChat'), { ssr: false })

export default function CreatorChatPage() {
  const router = useRouter()
  return (
    <div className="relative min-h-[100dvh] bg-[#F7FAFD] pb-24 text-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/dashboard'))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold">Mensajes</h1>
        </div>
        <WhopChat role="creator" />
      </div>
    </div>
  )
}
