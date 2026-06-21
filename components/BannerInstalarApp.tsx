'use client'
import { useState, useEffect } from 'react'

// Banner que invita a instalar CHIQUI como app, usando el evento nativo
// "beforeinstallprompt" que dispara Chrome/Edge/Samsung Internet cuando
// detectan que el sitio cumple los requisitos de instalacion (manifest +
// service worker, que ya tenemos desde antes).
//
// Solo aparece si: el navegador soporta este evento (Chrome y similares,
// NO Safari/iPhone), el evento ya se disparo (el navegador decidio que
// la app es instalable), y la app NO esta ya instalada (si ya esta
// instalada, no tiene sentido seguir mostrando el banner).
export default function BannerInstalarApp() {
  const [eventoInstalacion, setEventoInstalacion] = useState<any>(null)
  const [yaInstalada, setYaInstalada] = useState(false)

  useEffect(() => {
    // Si la app ya esta corriendo en modo "standalone" (instalada), no
    // mostramos nada.
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setYaInstalada(standalone)

    function manejarBeforeInstallPrompt(e: Event) {
      // Evita que el navegador muestre su propio mini-banner automatico;
      // en vez de eso, guardamos el evento para mostrarlo nosotros
      // cuando la persona toque nuestro boton.
      e.preventDefault()
      setEventoInstalacion(e)
    }

    function manejarAppInstalada() {
      setYaInstalada(true)
      setEventoInstalacion(null)
    }

    window.addEventListener('beforeinstallprompt', manejarBeforeInstallPrompt)
    window.addEventListener('appinstalled', manejarAppInstalada)

    return () => {
      window.removeEventListener('beforeinstallprompt', manejarBeforeInstallPrompt)
      window.removeEventListener('appinstalled', manejarAppInstalada)
    }
  }, [])

  async function instalar() {
    if (!eventoInstalacion) return
    eventoInstalacion.prompt()
    // El evento solo se puede usar una vez, asi que lo limpiamos sin
    // importar lo que elija la persona (aceptar o cancelar).
    await eventoInstalacion.userChoice
    setEventoInstalacion(null)
  }

  if (yaInstalada || !eventoInstalacion) return null

  return (
    <button
      onClick={instalar}
      className="mx-4 mb-3 bg-[#FBEAD9] border border-[#FFBD59]/40 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left w-[calc(100%-2rem)]"
    >
      <span className="text-lg flex-shrink-0">📲</span>
      <p className="text-xs font-semibold text-[#7A4A2F] flex-1">
        Instala CHIQUI como app para acceder más rápido
      </p>
      <span className="text-[#8C572F] text-xs font-bold flex-shrink-0">Instalar</span>
    </button>
  )
}
