'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// LINK VET — compartir el historial con el veterinario (Perfil)
// ============================================================
// QUE CAMBIO Y POR QUE:
//
// La version anterior hacia un INSERT en links_veterinario en CADA
// toque del boton, sin revisar si ya existia un link vigente. Cada
// clic dejaba una fila nueva con un token distinto (una cuenta de
// prueba llego a acumular 52). Ademas, al recargar la pagina el link
// generado desaparecia de la vista y la persona volvia a apretar
// "Generar", creando otro mas.
//
// Ahora:
//  1. Al abrir el Perfil se busca un link VIGENTE (activo y sin
//     expirar) de esta mascota. Si existe, se muestra de inmediato.
//  2. El boton solo aparece cuando NO hay ninguno vigente.
//  3. Se muestra hasta cuando sirve el link. Antes nadie sabia que
//     expiraba a los 7 dias: si el veterinario lo abria despues, no
//     funcionaba y no habia forma de entender por que.
//
// Nota sobre toISOString(): la regla del proyecto lo prohibe para
// obtener el DIA (ahi va Intl con America/Santiago). Aca se compara un
// timestamptz contra "ahora", que es un instante y no un dia — para
// eso el formato UTC es justamente el correcto.

function fmtExpira(iso: string): string {
  const d = new Date(iso)
  const ms = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${ms[d.getMonth()]}`
}

export default function LinkVet({ mascotaId }: { mascotaId: string }) {
  const supabase = createClient()
  const [link, setLink] = useState('')
  const [expira, setExpira] = useState('')
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')

  // Al montar: si ya hay un link vigente para esta mascota, se muestra
  // en vez de ofrecer generar otro.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      setBuscando(true)
      const vigente = await buscarVigente()
      if (!cancelado) {
        if (vigente) {
          setLink(`${window.location.origin}/vet?token=${vigente.token}`)
          setExpira(vigente.expira_en)
        }
        setBuscando(false)
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascotaId])

  async function buscarVigente(): Promise<{ token: string; expira_en: string } | null> {
    const ahora = new Date().toISOString()
    const { data } = await supabase
      .from('links_veterinario')
      .select('token, expira_en')
      .eq('mascota_id', mascotaId)
      .eq('activo', true)
      .gt('expira_en', ahora)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0 && data[0].token) {
      return { token: data[0].token as string, expira_en: data[0].expira_en as string }
    }
    return null
  }

  async function generarLink() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('No se pudo verificar tu sesion. Vuelve a entrar e intenta de nuevo.')
      setLoading(false)
      return
    }

    // Doble chequeo antes de insertar: si entre el montaje y este clic
    // aparecio un link vigente (ej. generado desde el Dashboard), se
    // reusa en vez de crear otro.
    const vigente = await buscarVigente()
    if (vigente) {
      setLink(`${window.location.origin}/vet?token=${vigente.token}`)
      setExpira(vigente.expira_en)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('links_veterinario')
      .insert({ mascota_id: mascotaId, user_id: user.id })
      .select('token, expira_en')
      .single()

    if (data && data.token) {
      setLink(`${window.location.origin}/vet?token=${data.token}`)
      setExpira(data.expira_en as string)
    } else {
      setError('No se pudo generar el link. Revisa tu conexion e intenta de nuevo.')
    }
    setLoading(false)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Si el navegador bloquea el portapapeles, el link igual esta
      // visible arriba con la clase .copiable para copiarlo a mano.
      setError('Tu navegador no permitio copiar. Selecciona el link de arriba y copialo a mano.')
    }
  }

  return (
    <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EEE2D4]">
        <div className="flex items-center gap-2 mb-1">
          <img src="/chiqui/chiqui_doctor.png" alt="" className="w-7 h-7 object-contain" />
          <h2 className="font-bold text-sm">Comparte el historial con tu vet</h2>
        </div>
        <p className="text-xs text-[#8A7560] mt-0.5">CHIQUI recomienda enviarlo antes o durante la consulta, para que tu vet llegue con contexto.</p>
      </div>
      <div className="p-4">
        {buscando ? (
          <p className="text-xs text-[#8A7560] text-center py-2">Cargando...</p>
        ) : !link ? (
          <button onClick={generarLink} disabled={loading}
            className="w-full bg-[#4AABDB] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
            {loading ? 'Generando...' : '🔗 Generar link para el vet'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="copiable bg-[#FBEAD9] rounded-xl p-3 text-xs text-[#8A7560] break-all border border-[#EEE2D4]">
              {link}
            </div>
            <button onClick={copiar}
              className="w-full bg-[#4CAF7D] text-[#0a2418] font-bold py-3 rounded-xl text-sm">
              {copiado ? '✅ ¡Copiado!' : '📋 Copiar link'}
            </button>
            <p className="text-xs text-[#8A7560] text-center">El veterinario puede ver el historial sin crear cuenta</p>
            {expira && (
              <p className="text-[11px] text-[#CD7421] text-center font-semibold">
                Este link funciona hasta el {fmtExpira(expira)}. Despues puedes generar uno nuevo.
              </p>
            )}
          </div>
        )}
        {error && (
          <p className="text-[11px] text-[#E05252] text-center mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}
