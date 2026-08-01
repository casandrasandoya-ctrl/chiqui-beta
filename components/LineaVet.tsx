'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// LINEA VET — acceso de una sola línea en el Dashboard
// ============================================================
// Compartir el historial con el veterinario es LA función que
// distingue a CHIQUI, pero vivía escondida en Perfil. Esta línea la
// pone donde se ve, redactada por el "para qué" (se acerca una
// consulta) y no por el "qué" (generar un link).
//
// IMPORTANTE — por qué no reusa LinkVet:
// LinkVet hace un INSERT en cada toque, así que cada clic crea una
// fila nueva en links_veterinario. Desde el dashboard eso llenaría la
// tabla de tokens repetidos. Acá, en cambio, primero se busca un link
// VIGENTE (activo y sin expirar) de esta mascota y solo se crea uno
// nuevo si no hay ninguno.
//
// Nota sobre toISOString(): la regla del proyecto prohíbe usarlo para
// obtener el DÍA (ahí va Intl con America/Santiago). Acá se compara un
// timestamptz contra "ahora", que es un instante, no un día — para eso
// el formato UTC de toISOString es justamente el correcto.

export default function LineaVet({ mascotaId, mascotaNombre }: { mascotaId: string; mascotaNombre: string }) {
  const supabase = createClient()
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'copiado' | 'error'>('idle')
  // Si el navegador bloquea el portapapeles (pasa en algunos WebView),
  // mostramos el link en pantalla para que se pueda copiar a mano en
  // vez de dejar a la persona sin salida.
  const [linkVisible, setLinkVisible] = useState('')

  async function obtenerLink(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const ahora = new Date().toISOString()

    // 1) ¿Ya hay un link vigente para esta mascota? Se reusa.
    const { data: vigentes } = await supabase
      .from('links_veterinario')
      .select('token')
      .eq('mascota_id', mascotaId)
      .eq('activo', true)
      .gt('expira_en', ahora)
      .order('created_at', { ascending: false })
      .limit(1)

    if (vigentes && vigentes.length > 0 && vigentes[0].token) {
      return `${window.location.origin}/vet?token=${vigentes[0].token}`
    }

    // 2) No hay ninguno vigente: recién ahí se crea uno.
    const { data: nuevo } = await supabase
      .from('links_veterinario')
      .insert({ mascota_id: mascotaId, user_id: user.id })
      .select('token')
      .single()

    if (!nuevo || !nuevo.token) return null
    return `${window.location.origin}/vet?token=${nuevo.token}`
  }

  async function copiar() {
    if (estado === 'cargando') return
    setEstado('cargando')
    setLinkVisible('')

    const url = await obtenerLink()
    if (!url) {
      setEstado('error')
      setTimeout(() => setEstado('idle'), 4000)
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setEstado('copiado')
      setTimeout(() => setEstado('idle'), 3500)
    } catch {
      // Sin permiso de portapapeles: se muestra el link para copiarlo
      // a mano. La clase .copiable permite seleccionar el texto (el
      // resto de la app lo tiene bloqueado para sentirse nativa).
      setLinkVisible(url)
      setEstado('idle')
    }
  }

  const etiqueta =
    estado === 'copiado' ? '✓ Copiado' :
    estado === 'cargando' ? '...' :
    estado === 'error' ? 'Reintentar' :
    'Copiar'

  return (
    <div className="mx-4 mb-4">
      <button
        onClick={copiar}
        className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left active:opacity-80"
      >
        <img src="/chiqui/chiqui_doctor.png" alt="" className="w-9 h-9 object-contain flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-[#3D2B1F] leading-snug">
            ¿Se acerca una consulta veterinaria?
          </p>
          <p className="text-[11px] text-[#8A7560] leading-snug mt-0.5">
            Copia el link y entrégale el historial de {mascotaNombre} a tu vet.
          </p>
        </div>
        <span
          className="text-[11px] font-bold flex-shrink-0"
          style={{ color: estado === 'copiado' ? '#4CAF7D' : '#CD7421' }}
        >
          {etiqueta}
        </span>
      </button>

      {estado === 'copiado' && (
        <p className="text-[10px] text-[#8A7560] text-center mt-1.5">
          Pégalo en WhatsApp o correo. Tu vet lo abre sin crear cuenta.
        </p>
      )}

      {estado === 'error' && (
        <p className="text-[10px] text-[#E05252] text-center mt-1.5">
          No se pudo generar el link. Revisa tu conexión e intenta de nuevo.
        </p>
      )}

      {linkVisible && (
        <div className="mt-2 bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl p-2.5">
          <p className="text-[10px] text-[#8A7560] mb-1">Copia este link a mano:</p>
          <p className="copiable text-[11px] text-[#3D2B1F] break-all">{linkVisible}</p>
        </div>
      )}
    </div>
  )
}
