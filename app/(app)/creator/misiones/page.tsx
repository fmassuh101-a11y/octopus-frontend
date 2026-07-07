'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function MisionesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/creator/academia') }, [router])
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#F7FAFD] text-neutral-400">Redirigiendo…</div>
}
