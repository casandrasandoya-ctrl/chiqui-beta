'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Si la persona llega con ?instalar=true en la URL (como pasa al
// escanear el QR de descarga), este componente dispara el cuadro de
// instalacion de Chrome/Android automaticamente, apenas el navegador lo
// tenga disponible -- sin esperar a que la persona navegue un rato
// para que aparezca el banner normal.
//
// En iPhone esto no hace nada (Apple no permite que ningun sitio
// dispare instalacion automatica bajo ninguna circunstancia), asi que
// en iPhone la persona sigue viendo las instrucciones manuales de
// "agregar a inicio" que ya estan en Perfil.
export default function InstalarAutomatico() {
  const searchParams = useSearchParams()
  const [eventoInstalacion, setEventoInstalacion] = useState<any>(null)
  const vieneDelQR = searchParams.get('instalar') === 'true'

  useEffect(() => {
    if (!vieneDelQR) return

    function manejarBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setEventoInstalacion(e)
    }
    window.addEventListener('beforeinstallprompt', manejarBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', manejarBeforeInstallPrompt)
  }, [vieneDelQR])

  useEffect(() => {
    if (!eventoInstalacion) return
    // Apenas el evento este disponible, disparamos el cuadro de
    // instalacion sin esperar a que la persona toque nada.
    eventoInstalacion.prompt()
  }, [eventoInstalacion])

  return null
}
