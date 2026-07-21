// Esqueletos de carga para loading.tsx de cada ruta — Next.js los muestra
// automáticamente mientras el segmento de la ruta carga (antes de que la
// página monte), reemplazando el flash de pantalla en blanco por algo que
// ya se parece al contenido real. Dos temas: creador (claro, cian) y
// empresa (oscuro, esmeralda), igual que el resto de la app.

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className || ''}`} />
}

// ---------- Tema creador (claro) ----------

function CreatorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] pb-32 bg-[#F7FAFD]">
      <div className="px-5 pt-6">{children}</div>
    </div>
  )
}

export function CreatorDashboardSkeleton() {
  return (
    <CreatorShell>
      <Block className="h-6 w-40 bg-neutral-200 mb-6" />
      <Block className="h-28 w-full bg-cyan-100 mb-4" />
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Block className="h-20 bg-neutral-200" />
        <Block className="h-20 bg-neutral-200" />
      </div>
      <Block className="h-5 w-32 bg-neutral-200 mb-3" />
      <div className="space-y-3">
        <Block className="h-16 bg-neutral-200" />
        <Block className="h-16 bg-neutral-200" />
        <Block className="h-16 bg-neutral-200" />
      </div>
    </CreatorShell>
  )
}

export function CreatorListSkeleton() {
  return (
    <CreatorShell>
      <Block className="h-6 w-36 bg-neutral-200 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} className="h-24 bg-neutral-200" />
        ))}
      </div>
    </CreatorShell>
  )
}

export function CreatorProfileSkeleton() {
  return (
    <CreatorShell>
      <div className="flex items-center gap-4 mb-6">
        <Block className="h-16 w-16 rounded-full bg-cyan-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <Block className="h-4 w-32 bg-neutral-200" />
          <Block className="h-3 w-20 bg-neutral-200" />
        </div>
      </div>
      <div className="space-y-3">
        <Block className="h-12 bg-neutral-200" />
        <Block className="h-12 bg-neutral-200" />
        <Block className="h-12 bg-neutral-200" />
      </div>
    </CreatorShell>
  )
}

export function CreatorChatSkeleton() {
  return (
    <CreatorShell>
      <Block className="h-6 w-28 bg-neutral-200 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Block className="h-11 w-11 rounded-full bg-cyan-100 shrink-0" />
            <Block className="h-10 flex-1 bg-neutral-200" />
          </div>
        ))}
      </div>
    </CreatorShell>
  )
}

export function CreatorSimpleSkeleton() {
  return (
    <CreatorShell>
      <div className="flex items-center justify-center pt-20">
        <div className="h-8 w-8 rounded-full border-[3px] border-cyan-500 border-t-transparent animate-spin" />
      </div>
    </CreatorShell>
  )
}

// ---------- Tema empresa (oscuro) ----------

function CompanyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 pb-24">
      <div className="max-w-5xl mx-auto px-4 pt-6">{children}</div>
    </div>
  )
}

export function CompanyDashboardSkeleton() {
  return (
    <CompanyShell>
      <Block className="h-6 w-44 bg-neutral-800 mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Block className="h-20 bg-neutral-900" />
        <Block className="h-20 bg-neutral-900" />
        <Block className="h-20 bg-neutral-900" />
      </div>
      <Block className="h-5 w-36 bg-neutral-800 mb-3" />
      <div className="space-y-3">
        <Block className="h-16 bg-neutral-900" />
        <Block className="h-16 bg-neutral-900" />
      </div>
    </CompanyShell>
  )
}

export function CompanyListSkeleton() {
  return (
    <CompanyShell>
      <Block className="h-6 w-40 bg-neutral-800 mb-6" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-40 bg-neutral-900 border border-neutral-800" />
        ))}
      </div>
    </CompanyShell>
  )
}

export function CompanyProfileSkeleton() {
  return (
    <CompanyShell>
      <div className="flex items-center gap-4 mb-6">
        <Block className="h-16 w-16 rounded-full bg-emerald-500/15 shrink-0" />
        <div className="flex-1 space-y-2">
          <Block className="h-4 w-32 bg-neutral-800" />
          <Block className="h-3 w-20 bg-neutral-800" />
        </div>
      </div>
      <div className="space-y-3">
        <Block className="h-12 bg-neutral-900" />
        <Block className="h-12 bg-neutral-900" />
        <Block className="h-12 bg-neutral-900" />
      </div>
    </CompanyShell>
  )
}

export function CompanyChatSkeleton() {
  return (
    <CompanyShell>
      <Block className="h-6 w-28 bg-neutral-800 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Block className="h-11 w-11 rounded-full bg-emerald-500/15 shrink-0" />
            <Block className="h-10 flex-1 bg-neutral-900" />
          </div>
        ))}
      </div>
    </CompanyShell>
  )
}

export function CompanySimpleSkeleton() {
  return (
    <CompanyShell>
      <div className="flex items-center justify-center pt-20">
        <div className="h-8 w-8 rounded-full border-[3px] border-emerald-500 border-t-transparent animate-spin" />
      </div>
    </CompanyShell>
  )
}
