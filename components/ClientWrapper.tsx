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

  if (cargando) return <SplashScreen />

  return <div className="fade-in">{children}</div>
}
