'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// El sistema viejo de mensajes fue reemplazado por el chat de Whop embebido.
// Esta página solo redirige (los links viejos traían ?company=<id>).
// Respaldo del código anterior: _legacy/creator-messages-page.tsx.bak
function RedirectInner() {
  const router = useRouter()
  const params = useSearchParams()
  useEffect(() => {
    const company = params.get('company') || ''
    router.replace(company ? `/creator/chat?user=${company}` : '/creator/chat')
  }, [params, router])
  return <div className="min-h-[100dvh] bg-[#F7FAFD]" />
}

export default function CreatorMessagesRedirect() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F7FAFD]" />}>
      <RedirectInner />
    </Suspense>
  )
}
