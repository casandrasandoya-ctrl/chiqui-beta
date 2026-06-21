'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { notificacionesSoportadas } from '@/utils/pushNotificaciones'

// Banner chico en el Dashboard que invita a activar el recordatorio
// diario, solo si la persona TODAVIA NO lo ha activado. Si ya esta
// activo, este componente no muestra nada (para no ser repetitivo) --
// la configuracion completa (elegir/cambiar hora, desactivar) vive
// exclusivamente en Perfil.
export default function BannerNotificaciones() {
  const router = useRouter()
  const supabase = createClient()
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    async function revisar() {
      if (!notificacionesSoportadas()) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prefs } = await supabase
        .from('preferencias_usuario')
        .select('notificaciones_activas')
        .eq('user_id', user.id)
        .maybeSingle()
      // Si no hay fila todavia, o esta en false, mostramos el banner.
      if (!prefs?.notificaciones_activas) setMostrar(true)
    }
    revisar()
  }, [])

  if (!mostrar) return null

  return (
    <button
      onClick={() => router.push('/perfil')}
      className="mx-4 mb-3 bg-[#FBEAD9] border border-[#FFBD59]/40 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-left w-[calc(100%-2rem)]"
    >
      <span className="text-lg flex-shrink-0">🔔</span>
      <p className="text-xs font-semibold text-[#7A4A2F] flex-1">
        Activa un recordatorio diario para no olvidar registrar a tu mascota
      </p>
      <span className="text-[#8C572F] text-base flex-shrink-0">›</span>
    </button>
  )
}
