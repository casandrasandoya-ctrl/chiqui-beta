import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CHIQUI Entre Señales',
    short_name: 'CHIQUI',
    description: 'Tu compañero de observación y cuidado para la salud de tu mascota.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F5EDE3',
    theme_color: '#8C572F',
    orientation: 'portrait',
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
