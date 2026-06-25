'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import SplashScreen from '@/components/SplashScreen'

// Envuelve la app y muestra el SplashScreen con pregunta rotativa
// durante el tiempo que Supabase verifica la sesion del usuario.
// Una vez que sabe si hay sesion o no (1-2 segundos), desaparece
// con una transicion suave y muestra el contenido real.
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // Esperar a que Supabase confirme el estado de sesion
    supabase.auth.getSession().then(() => {
      // Pequeño delay para que la pregunta sea legible
      setTimeout(() => setCargando(false), 800)
    })
  }, [])

  if (cargando) return <SplashScreen />

  return (
    <div className="fade-in">
      {children}
    </div>
  )
}
