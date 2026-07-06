'use client'

// Cielo estilo SideShift: degradado azul con arcos concéntricos y nubes.
// Se posiciona absolute detrás del contenido del header de cada pantalla.
export default function Sky({
  height = 320,
  hue = 'blue',
}: {
  height?: number
  hue?: 'blue' | 'orange' | 'yellow'
}) {
  const grad =
    hue === 'orange'
      ? 'linear-gradient(180deg,#F7A741 0%,#FBC97B 34%,#FDEBCB 70%,rgba(255,255,255,0) 100%)'
      : hue === 'yellow'
      ? 'linear-gradient(180deg,#F8DE7E 0%,#FBEDB9 40%,#FEFAEA 75%,rgba(255,255,255,0) 100%)'
      : 'linear-gradient(180deg,#63A9F0 0%,#8FC4F6 34%,#D6EBFC 70%,rgba(255,255,255,0) 100%)'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height }}>
      <div className="absolute inset-0" style={{ background: grad }} />
      {/* arcos concéntricos */}
      {[0.42, 0.62, 0.82, 1.02].map((s, i) => (
        <div
          key={i}
          className="absolute left-1/2 rounded-full border border-white/25"
          style={{
            width: height * 2.6 * s,
            height: height * 2.6 * s,
            top: -height * 1.3 * s,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
      {/* nubes: fila de círculos blancos difuminados en la base */}
      <div className="absolute inset-x-0" style={{ bottom: -height * 0.16, height: height * 0.62 }}>
        {[6, 22, 40, 58, 76, 92].map((x, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: height * (i % 2 === 0 ? 0.72 : 0.56),
              height: height * (i % 2 === 0 ? 0.72 : 0.56),
              left: `${x}%`,
              bottom: 0,
              transform: 'translateX(-50%)',
              filter: 'blur(2px)',
            }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
      </div>
    </div>
  )
}
