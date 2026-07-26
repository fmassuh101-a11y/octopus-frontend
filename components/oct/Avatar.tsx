'use client'

import { useState } from 'react'

// Avatar con respaldo automático.
//
// POR QUÉ EXISTE
// Las fotos de perfil venían de un <img> pelado. Cuando la URL falla —y falla
// seguido, porque las de TikTok son firmadas y EXPIRAN— el navegador muestra
// su ícono de imagen rota con el texto alternativo al lado. Se ve como si la
// app estuviera mal hecha.
//
// Acá, si la imagen no carga, se cambia sola al círculo con la inicial, que es
// lo que ya se muestra cuando directamente no hay foto. El usuario nunca ve
// una imagen rota.

export default function Avatar({
  src,
  name,
  size = 48,
  className = '',
  gradient = 'from-emerald-500 to-emerald-600',
}: {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
  gradient?: string
}) {
  const [falló, setFalló] = useState(false)
  const inicial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const px = { width: size, height: size }

  if (!src || falló) {
    return (
      <div
        style={px}
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ${className}`}
      >
        <span className="font-bold text-white" style={{ fontSize: Math.round(size * 0.4) }}>
          {inicial}
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name || 'Foto de perfil'}
      style={px}
      onError={() => setFalló(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  )
}
