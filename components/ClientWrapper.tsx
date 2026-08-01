'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import SplashScreen from '@/components/SplashScreen'

// Muestra el SplashScreen con pregunta rotativa durante la carga inicial.
// Siempre espera un minimo de 2.5 segundos para que la pregunta sea
// legible, aunque Supabase responda mas rapido.
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const tiempoMinimo = new Promise(res => setTimeout(res, 2500))
    const sesion = supabase.auth.getSession()
    // Esperar AMBOS: que Supabase responda Y que pasen 2.5 segundos
    Promise.all([sesion, tiempoMinimo]).then(() => setCargando(false))
  }, [])

  // Cancela el menú del navegador que aparece al mantener presionado
  // (sobre enlaces, imágenes, etc.): "abrir en nueva pestaña", "compartir
  // vínculo", "copiar dirección"... Esto hace que la app se sienta nativa
  // y no como una web dentro de un navegador.
  // Excepción: dentro de campos de texto (input/textarea) y de elementos
  // marcados como .copiable (ej. el código de co-tutor) SÍ se permite,
  // para no perder el menú de copiar/pegar donde es útil.
  useEffect(() => {
    function alMenuContextual(e: Event) {
      const objetivo = e.target as HTMLElement | null
      if (objetivo && objetivo.closest('input, textarea, [contenteditable="true"], .copiable')) {
        return // permitir el menú en campos y elementos copiables
      }
      e.preventDefault()
    }
    document.addEventListener('contextmenu', alMenuContextual)
    return () => document.removeEventListener('contextmenu', alMenuContextual)
  }, [])

  if (cargando) return <SplashScreen />

  return <div className="fade-in">{children}</div>
}
