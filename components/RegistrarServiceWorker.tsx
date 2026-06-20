'use client'
import { useEffect } from 'react'

// Registra el service worker (public/sw.js) apenas se carga la app.
// Esto es necesario, ademas del manifest, para que Chrome considere la
// app instalable, y es el primer paso para poder recibir notificaciones
// push mas adelante.
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        // Si falla el registro, la app sigue funcionando normalmente
        // como sitio web comun -- solo no sera instalable ni podra
        // recibir notificaciones push hasta que se resuelva.
      })
  }, [])

  return null
}
