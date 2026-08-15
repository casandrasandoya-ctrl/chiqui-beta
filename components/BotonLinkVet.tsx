'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// BOTÓN LINK VET
// ============================================================
// Botón simple que copia el link al portapapeles. Reemplaza al bloque
// explicativo que ocupaba media pantalla: en el dashboard lo que se
// necesita es la acción, no la explicación.
//
// REUSA EL LINK VIGENTE en vez de crear uno nuevo en cada toque. Sin
// eso, la cuenta de Casandra llegó a acumular 52 links generados — uno
// por cada vez que alguien tocó el botón.
//
// Si el navegador no deja copiar (pasa en algunos contextos), se
// muestra el link para copiarlo a mano en vez de fallar en silencio.

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

  async function generarYCopiar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (cargando) return
    setCargando(true)
    setLinkManual(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); return }

      const ahora = new Date().toISOString()

      // Se busca un link que siga vigente antes de crear otro. Crear uno
      // en cada toque llena la tabla de links que nadie usa.
      const { data: existente } = await supabase
        .from('links_veterinario')
        .select('token, expira_en')
        .eq('mascota_id', mascotaId)
        .eq('activo', true)
        .gt('expira_en', ahora)
        .order('expira_en', { ascending: false })
        .limit(1)
        .maybeSingle()

      let token = existente?.token as string | undefined

      if (!token) {
        const nuevoToken = crypto.randomUUID()
        const expira = new Date()
        expira.setDate(expira.getDate() + 7)
        const { error } = await supabase.from('links_veterinario').insert({
          mascota_id: mascotaId,
          user_id: user.id,
          token: nuevoToken,
          activo: true,
          expira_en: expira.toISOString(),
        })
        if (error) { setCargando(false); return }
        token = nuevoToken
      }

      const url = `${window.location.origin}/vet/${token}`

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

      {linkManual && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-8"
          style={{ background: 'rgba(61,43,31,0.45)' }}
          onClick={() => setLinkManual(null)}
        >
          <div className="bg-[#FFFCF8] rounded-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-sm text-[#3D2B1F] mb-1">Link para tu veterinario</p>
            <p className="text-xs text-[#8A7560] mb-3">Cópialo y compártelo. Dura 7 días.</p>
            <p className="text-[11px] text-[#3D2B1F] bg-[#FBEAD9] rounded-xl p-3 break-all select-all">
              {linkManual}
            </p>
            <button
              onClick={() => setLinkManual(null)}
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
