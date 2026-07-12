'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// Chat embebido de Whop (DMs + grupos) dentro de Octopus, para la empresa.
const WhopChat = dynamic(() => import('@/components/oct/WhopChat'), { ssr: false })

export default function CompanyChatPage() {
  const router = useRouter()
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
        <WhopChat role="company" />
      </div>
    </div>
  )
}
