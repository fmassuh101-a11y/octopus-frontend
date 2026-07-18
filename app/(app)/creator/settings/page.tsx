'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Crown, KeyRound, Mail, Phone, LifeBuoy, ShieldCheck, FileText, LogOut, Trash2, Pencil } from 'lucide-react'
import { toast } from '@/components/oct/toast'

// Configuración — copia de la pantalla Settings de SideShift:
// grupos de cards blancas con filas + chevron, acciones rojas al final.
export default function SettingsPage() {
  const router = useRouter()

  const logout = async () => {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
    localStorage.removeItem('sb-user')
    localStorage.removeItem('oct-user-type')
    // al cerrar sesión, el navegador vuelve DETRÁS del muro de waitlist
    try { await fetch('/api/waitlist/lock', { method: 'POST' }) } catch {}
    window.location.href = '/waitlist'
  }

  return (
    <div className="min-h-[100dvh] bg-[#F7FAFD] pb-32 text-neutral-900">
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-5 pt-6">
        {/* header */}
        <div className="relative flex items-center justify-center py-2">
          <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/creator/profile'))}
            className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-90" aria-label="Volver">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-extrabold">Configuración</h1>
        </div>

        {/* plan */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <p className="font-bold">Free</p>
            <p className="text-sm text-neutral-500">Completá trabajos para subir de liga y ganar beneficios</p>
          </div>
          <Row icon={<Crown className="h-5 w-5 text-amber-500" />} label="Pasate a Pro" onClick={() => router.push('/creator/pro')} />
          <Row icon={<Crown className="h-5 w-5 text-neutral-400" />} label="Ver mi liga y beneficios" onClick={() => router.push('/leaderboard')} last />
        </div>

        {/* cuenta */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <Row icon={<Pencil className="h-5 w-5 text-neutral-600" />} label="Editar perfil" onClick={() => router.push('/creator/profile/edit')} />
          <Row icon={<KeyRound className="h-5 w-5 text-neutral-600" />} label="Cambiar contraseña" onClick={() => router.push('/creator/profile/edit')} />
          <Row icon={<Mail className="h-5 w-5 text-neutral-600" />} label="Cambiar email" onClick={() => toast('Escribinos por el chat de soporte para cambiar tu email')} />
          <Row icon={<Phone className="h-5 w-5 text-neutral-600" />} label="Cambiar teléfono" onClick={() => router.push('/creator/profile/edit')} last />
        </div>

        {/* ayuda y legales */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <Row icon={<LifeBuoy className="h-5 w-5 text-neutral-600" />} label="Centro de ayuda"
            onClick={() => toast('Tocá el globo de chat abajo a la derecha y te ayudamos')} />
          <Row icon={<ShieldCheck className="h-5 w-5 text-neutral-600" />} label="Política de privacidad" onClick={() => router.push('/privacy')} />
          <Row icon={<FileText className="h-5 w-5 text-neutral-600" />} label="Términos del servicio" onClick={() => router.push('/terms')} last />
        </div>

        {/* peligro */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          <button onClick={logout} className="flex w-full items-center gap-3 border-b border-neutral-100 px-5 py-4 text-left active:bg-neutral-50">
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="flex-1 font-semibold text-red-500">Cerrar sesión</span>
            <ChevronRight className="h-5 w-5 text-neutral-300" />
          </button>
          <button onClick={() => toast('Escribinos por el chat de soporte y eliminamos tu cuenta', 'error')}
            className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-neutral-50">
            <Trash2 className="h-5 w-5 text-red-500" />
            <span className="flex-1 font-semibold text-red-500">Eliminar cuenta</span>
            <ChevronRight className="h-5 w-5 text-neutral-300" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, onClick, last }: { icon: React.ReactNode; label: string; onClick: () => void; last?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-3 px-5 py-4 text-left active:bg-neutral-50 ${last ? '' : 'border-b border-neutral-100'}`}>
      {icon}
      <span className="flex-1 font-semibold">{label}</span>
      <ChevronRight className="h-5 w-5 text-neutral-300" />
    </button>
  )
}
