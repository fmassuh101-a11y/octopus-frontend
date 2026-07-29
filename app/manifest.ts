import type { MetadataRoute } from 'next'

// Manifiesto de la app.
//
// POR QUÉ IMPORTA
// Sin esto, Octapi es una página web: se abre con la barra del navegador
// encima, no se puede guardar en la pantalla de inicio, y se siente prestada.
// Con esto, quien la instale la abre a pantalla completa, con su ícono, y
// arranca desde la caché. Es el cambio más barato que existe para que se
// sienta una app de verdad.
//
// `app/layout.tsx` ya declaraba `appleWebApp`, pero sin manifiesto eso no hacía
// nada: iOS lo necesita para permitir "Agregar a inicio".
//
// NOTA: acá NO va service worker. Guardar en caché datos de plata que cambian
// —saldos, pagos— es riesgoso, y el beneficio grande (que se instale y abra a
// pantalla completa) ya se consigue solo con esto.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Octapi — Creadores y marcas',
    short_name: 'Octapi',
    description:
      'Conecta con creadores de contenido en Chile y Latinoamérica. Publica campañas, recibe contenido y paga directo.',
    // Arranca en la raíz y no en el panel del creador: quien instala puede ser
    // creador o empresa, y la raíz ya sabe a cuál mandar a cada uno.
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Mismo fondo que las pantallas del creador, para que la pantalla de
    // arranque no destelle en blanco antes de pintar.
    background_color: '#F7FAFD',
    theme_color: '#0a0a0a',
    lang: 'es-CL',
    dir: 'ltr',
    categories: ['business', 'productivity', 'social'],
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
