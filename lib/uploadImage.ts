'use client'

// Sube una imagen data-URL a Storage vía /api/upload y devuelve la URL pública.
// Si ya es una URL http(s) (o falla la subida), devuelve el valor tal cual —
// NUNCA guardar base64 en la base (era la causa principal de la lentitud móvil).
export async function uploadIfDataUrl(
  value: string | null | undefined,
  kind: 'avatar' | 'gig' = 'avatar'
): Promise<string | null> {
  if (!value) return null
  if (!value.startsWith('data:')) return value
  try {
    const token = localStorage.getItem('sb-access-token')
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, dataUrl: value }),
    })
    const data = await res.json()
    if (data.ok && data.url) return data.url
  } catch {}
  return value // fallback: mejor guardar base64 que perder la foto
}
