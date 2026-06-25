import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'cl.chiqui.entresenhales',
    name: 'CHIQUI Entre Señales',
    short_name: 'CHIQUI',
    description: 'Tu compañero de observación y cuidado para la salud de tu mascota. Registra síntomas, vacunas, paseos y más.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F5EDE3',
    theme_color: '#8C572F',
    orientation: 'portrait',
    categories: ['health', 'lifestyle', 'utilities'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
