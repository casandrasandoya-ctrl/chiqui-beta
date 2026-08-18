'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// BOTÓN LINK VET
// ============================================================
// Genera el link y lo copia al portapapeles.
//
// HACE EXACTAMENTE LO MISMO QUE components/LinkVet.tsx, que lleva meses
// funcionando. La versión anterior de este botón inventaba su propia
// forma de crear el token —lo generaba en el navegador con
// crypto.randomUUID() y lo escribía a mano— y el resultado eran links
// que daban 404: ese token no coincidía con el que la base genera sola.
//
// Acá se insertan solo mascota_id y user_id, y la base rellena el token
// y su vencimiento con sus valores por defecto. Es la única forma de
// que el token que se guarda sea el mismo que el RPC va a reconocer.
//
// Si el navegador no deja copiar, se muestra el link para copiarlo a
// mano en vez de fallar en silencio.

export default function BotonLinkVet({
  mascotaId,
  mascotaNombre,
}: {
  mascotaId: string
  mascotaNombre: string
}) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [linkManual, setLinkManual] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function generarYCopiar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (cargando) return
    setCargando(true)
    setError('')
    setLinkManual(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No se pudo verificar tu sesión.')
        return
      }

      // Mismo insert que LinkVet: solo estos dos campos. La base genera
      // el token y su vencimiento. Escribir el token a mano desde acá
      // es lo que producía los links rotos.
      const { data, error: errInsert } = await supabase
        .from('links_veterinario')
        .insert({ mascota_id: mascotaId, user_id: user.id })
        .select('token')
        .single()

      if (errInsert || !data) {
        // El mensaje real de Postgres, no una frase genérica: si algo
        // falla, hay que poder saber qué.
        setError('No se pudo generar el link: ' + (errInsert?.message || 'error desconocido'))
        return
      }

      const url = `${window.location.origin}/vet?token=${data.token}`

      try {
        await navigator.clipboard.writeText(url)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      } catch {
        // Algunos navegadores no permiten copiar. Se muestra el link
        // para copiarlo a mano en vez de no hacer nada.
        setLinkManual(url)
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <button
        onClick={generarYCopiar}
        disabled={cargando}
        className="flex-1 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl py-3 flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        <span className="text-sm font-bold text-[#8C572F]">
          {cargando ? 'Generando...' : copiado ? '✓ Link copiado' : 'Link Vet'}
        </span>
        {!cargando && !copiado && <span className="text-sm">🔗</span>}
      </button>

      {(linkManual || error) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-8"
          style={{ background: 'rgba(61,43,31,0.45)' }}
          onClick={() => { setLinkManual(null); setError('') }}
        >
          <div className="bg-[#FFFCF8] rounded-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            {error ? (
              <>
                <p className="font-bold text-sm text-[#E05252] mb-2">No se pudo generar</p>
                <p className="text-xs text-[#8A7560] break-words">{error}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-sm text-[#3D2B1F] mb-1">Link para tu veterinario</p>
                <p className="text-xs text-[#8A7560] mb-3">Cópialo y compártelo.</p>
                <p className="copiable text-[11px] text-[#3D2B1F] bg-[#FBEAD9] rounded-xl p-3 break-all select-all">
                  {linkManual}
                </p>
              </>
            )}
            <button
              onClick={() => { setLinkManual(null); setError('') }}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-[#8A7560] bg-[#F0E2CE]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
