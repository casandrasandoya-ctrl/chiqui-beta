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
      height: document.body.style.height,
      overflow: document.body.style.overflow,
    }

    // IMPORTANTE: no se fija "width: 100%" aqui, porque el body de esta
    // app ya tiene max-width: 420px (definido en globals.css) para verse
    // como una app movil centrada en pantallas grandes. Forzar
    // width:100% chocaba con eso y rompia el calculo de alto disponible
    // dentro de los modales (90vh dejaba de calcularse bien).
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.height = '100%'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.position = bodyEstilosOriginales.position
      document.body.style.top = bodyEstilosOriginales.top
      document.body.style.left = bodyEstilosOriginales.left
      document.body.style.right = bodyEstilosOriginales.right
      document.body.style.height = bodyEstilosOriginales.height
      document.body.style.overflow = bodyEstilosOriginales.overflow
      // Restauramos la posicion de scroll exacta donde estaba antes de
      // abrir el modal (position:fixed la habia "congelado" visualmente
      // en 0, pero el navegador no vuelve solo a donde estaba).
      window.scrollTo(0, scrollY)
    }
  }, [activo])
}
