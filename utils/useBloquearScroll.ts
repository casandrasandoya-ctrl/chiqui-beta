'use client'
import { useEffect } from 'react'

// Bloquea el scroll del fondo (body) mientras un modal esta abierto, y lo
// restaura al cerrarse. Sin esto, en celular el fondo seguia scrolleando
// detras del modal mientras el modal mismo quedaba estatico sin moverse
// -- el comportamiento contrario al que se necesita.
//
// Uso: dentro de cualquier componente con un modal, llamar
// useBloquearScroll(modalEstaAbierto) -- donde modalEstaAbierto es el
// booleano (o valor truthy) que indica si el modal esta visible.
export function useBloquearScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return

    // Guardamos la posicion de scroll actual antes de bloquear, para
    // poder restaurarla exactamente al cerrar el modal.
    const scrollY = window.scrollY
    const bodyEstilosOriginales = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    }

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'

    return () => {
      document.body.style.position = bodyEstilosOriginales.position
      document.body.style.top = bodyEstilosOriginales.top
      document.body.style.left = bodyEstilosOriginales.left
      document.body.style.right = bodyEstilosOriginales.right
      document.body.style.width = bodyEstilosOriginales.width
      // Restauramos la posicion de scroll exacta donde estaba antes de
      // abrir el modal (position:fixed la habia "congelado" visualmente
      // en 0, pero el navegador no vuelve solo a donde estaba).
      window.scrollTo(0, scrollY)
    }
  }, [activo])
}
