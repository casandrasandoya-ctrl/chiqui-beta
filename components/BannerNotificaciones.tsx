'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { notificacionesSoportadas } from '@/utils/pushNotificaciones'

const CLAVE_MASCOTAS_CONFIRMADAS = 'chiqui_mascotas_con_recordatorio_confirmado'

function obtenerMascotasConfirmadas(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const guardado = window.localStorage.getItem(CLAVE_MASCOTAS_CONFIRMADAS)
    return guardado ? JSON.parse(guardado) : []
  } catch {
    return []
  }
}

function marcarMascotaConfirmada(mascotaId: string) {
  if (typeof window === 'undefined') return
  const actuales = obtenerMascotasConfirmadas()
  if (!actuales.includes(mascotaId)) {
    window.localStorage.setItem(CLAVE_MASCOTAS_CONFIRMADAS, JSON.stringify([...actuales, mascotaId]))
  }
}

// Banner chico en el Dashboard que invita a activar (o confirmar) el
// recordatorio diario.
//
// Logica de cuando mostrarlo:
// - Si las notificaciones de la CUENTA nunca se activaron: se muestra
//   siempre (caso normal de alguien nuevo).
// - Si las notificaciones YA estan activas, pero esta MASCOTA especifica
//   es nueva (su id no esta en la lista de "confirmadas" guardada en
//   este dispositivo): se vuelve a mostrar, como confirmacion de que
//   esta mascota tambien va a recibir recordatorios -- aunque tecnicamente
//   ya estaria cubierta (la funcion de envio recorre todas las mascotas
//   del usuario), esto le da a la persona una senal visual clara en vez
//   de asumirlo en silencio.
// - Al tocar el banner e ir a Perfil, se marca esta mascota como
//   "confirmada" para que no se repita la proxima vez con esa misma
//   mascota.
export default function BannerNotificaciones({ mascotaId }: { mascotaId?: string }) {
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

      const activasEnCuenta = !!prefs?.notificaciones_activas

      if (!activasEnCuenta) {
        // Caso normal: la cuenta nunca activo notificaciones.
        setMostrar(true)
        return
      }

      // La cuenta ya tiene notificaciones activas. Mostramos el banner
      // de nuevo SOLO si esta mascota especifica todavia no fue
      // "confirmada" en este dispositivo.
      if (mascotaId) {
        const confirmadas = obtenerMascotasConfirmadas()
        if (!confirmadas.includes(mascotaId)) setMostrar(true)
      }
    }
    revisar()
  }, [mascotaId])

  function irAPerfil() {
    if (mascotaId) marcarMascotaConfirmada(mascotaId)
    router.push('/perfil')
  }

  if (!mostrar) return null

  return (
    <button
      onClick={irAPerfil}
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
