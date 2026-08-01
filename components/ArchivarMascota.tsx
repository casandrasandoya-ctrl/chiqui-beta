'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { guardarMascotaActivaId } from '@/utils/mascotaActiva'

// ============================================================
// ARCHIVAR MASCOTA — al final del Perfil
// ============================================================
// Archivar NO borra nada. La mascota y todo su historial quedan
// intactos en la base de datos; solo dejan de aparecer en la app
// (dashboard, registro diario, calendario, analisis, salud) y —lo mas
// importante— dejan de generar notificaciones push.
//
// Por que se pregunta el MOTIVO:
// "Restaurar" no significa lo mismo en todos los casos. Quien archivo
// un perfil de prueba quiere que vuelva completo. Quien archivo a una
// mascota que fallecio quiere ver los recuerdos, no que le vuelva a
// sonar el telefono. El motivo es un dato que solo se puede capturar
// en este momento; despues es imposible saberlo.
//
// Por ahora archivar hace lo mismo en todos los casos y el motivo solo
// cambia el tono del mensaje. Cuando la beta muestre que alguien
// restaura una mascota que fallecio, ahi se construye el modo
// "recuerdo" (solo lectura, sin recordatorios) con el dato ya guardado.
//
// NO hay opcion de eliminar definitivamente, y es a proposito: las 21
// tablas hijas estan en CASCADE, asi que borrar arrastraria años de
// registros sin vuelta atras. Ofrecer ese boton a alguien cuya mascota
// acaba de morir es una trampa. Si se agrega algun dia, debe ser desde
// la lista de archivadas —un lugar frio, al que se llega a proposito—
// y escribiendo el nombre de la mascota para confirmar.

interface MascotaArchivada {
  id: string
  nombre: string
  especie: string
  archivada_en: string
  archivo_motivo: string | null
}

const MOTIVOS: { valor: string; label: string; emoji: string }[] = [
  { valor: 'fallecio', label: 'Falleció', emoji: '🕊️' },
  { valor: 'ya_no_conmigo', label: 'Ya no vive conmigo', emoji: '🏠' },
  { valor: 'prueba', label: 'Era un perfil de prueba', emoji: '🧪' },
  { valor: 'otro', label: 'Otro motivo', emoji: '•' },
]

function textoConfirmacion(motivo: string, nombre: string): string {
  if (motivo === 'fallecio') {
    return `${nombre} y todo su historial quedan guardados. No vas a recibir más recordatorios ni avisos de cumpleaños. Puedes volver a verlo cuando quieras.`
  }
  if (motivo === 'ya_no_conmigo') {
    return `${nombre} deja de aparecer en la app y no vas a recibir más recordatorios. Su historial queda guardado por si lo necesitas.`
  }
  if (motivo === 'prueba') {
    return `${nombre} deja de aparecer en la app. Si lo necesitas de vuelta, puedes restaurarlo desde aquí mismo.`
  }
  return `${nombre} deja de aparecer en la app, pero nada se borra. Puedes restaurarlo cuando quieras.`
}

function fmtFecha(iso: string): string {
  const d = new Date(iso)
  const ms = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${ms[d.getMonth()]} de ${d.getFullYear()}`
}

export default function ArchivarMascota({
  mascotaId,
  mascotaNombre,
  totalActivas,
}: {
  mascotaId: string
  mascotaNombre: string
  totalActivas: number
}) {
  const router = useRouter()
  const supabase = createClient()

  const [modal, setModal] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [archivadas, setArchivadas] = useState<MascotaArchivada[]>([])
  const [restaurando, setRestaurando] = useState('')

  const esUnica = totalActivas <= 1

  // Bloqueo de scroll del fondo mientras el modal esta abierto,
  // igual que el resto de los modales de la app.
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modal])

  useEffect(() => {
    cargarArchivadas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarArchivadas() {
    const { data } = await supabase
      .from('mascotas')
      .select('id, nombre, especie, archivada_en, archivo_motivo')
      .not('archivada_en', 'is', null)
      .order('archivada_en', { ascending: false })
    setArchivadas((data as MascotaArchivada[]) || [])
  }

  async function archivar() {
    if (!motivo) return
    setGuardando(true)
    setError('')

    const { error: err } = await supabase
      .from('mascotas')
      .update({ archivada_en: new Date().toISOString(), archivo_motivo: motivo })
      .eq('id', mascotaId)

    if (err) {
      setError('No se pudo archivar. Revisa tu conexión e intenta de nuevo.')
      setGuardando(false)
      return
    }

    // Si era la única mascota activa, no queda nada que mostrar: se va
    // a crear una nueva en vez de dejar una pantalla vacía.
    if (esUnica) {
      router.push('/mascota/nueva')
      return
    }

    // Si quedaban otras, la activa guardada en localStorage ya no sirve
    // (apunta a la que se acaba de archivar). Se limpia recargando el
    // perfil: determinarMascotaActiva elige la primera disponible.
    guardarMascotaActivaId('')
    window.location.href = '/perfil'
  }

  async function restaurar(id: string) {
    setRestaurando(id)
    const { error: err } = await supabase
      .from('mascotas')
      .update({ archivada_en: null, archivo_motivo: null })
      .eq('id', id)
    if (err) {
      setError('No se pudo restaurar. Intenta de nuevo.')
      setRestaurando('')
      return
    }
    guardarMascotaActivaId(id)
    window.location.href = '/perfil'
  }

  return (
    <>
      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EEE2D4]">
          <h2 className="font-bold text-sm">Archivar mascota</h2>
          <p className="text-xs text-[#8A7560] mt-0.5 leading-relaxed">
            Archivar guarda todo el historial pero deja de mostrar a la mascota en la app y de enviarte recordatorios. Nada se borra y puedes restaurarla cuando quieras.
          </p>
        </div>

        <button
          onClick={() => { setMotivo(''); setError(''); setModal(true) }}
          className="w-full px-4 py-3 text-left text-sm text-[#8C572F] font-semibold"
        >
          Archivar a {mascotaNombre}
        </button>

        {archivadas.length > 0 && (
          <div className="border-t border-[#EEE2D4]">
            <p className="px-4 pt-3 pb-1 text-xs text-[#8A7560] uppercase tracking-wider font-semibold">
              Archivadas
            </p>
            {archivadas.map(a => (
              <div key={a.id} className="px-4 py-3 border-t border-[#EEE2D4] flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3D2B1F] truncate">
                    {a.archivo_motivo === 'fallecio' ? '🕊️ ' : ''}{a.nombre}
                  </p>
                  <p className="text-[11px] text-[#8A7560]">
                    Archivada el {fmtFecha(a.archivada_en)}
                  </p>
                </div>
                <button
                  onClick={() => restaurar(a.id)}
                  disabled={restaurando === a.id}
                  className="text-xs font-bold text-[#CD7421] flex-shrink-0 disabled:opacity-50"
                >
                  {restaurando === a.id ? '...' : 'Restaurar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && !modal && (
          <p className="px-4 pb-3 text-[11px] text-[#E05252]">{error}</p>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(61,43,31,0.45)' }}
          onClick={() => !guardando && setModal(false)}
        >
          <div
            className="bg-[#FFFCF8] rounded-t-3xl w-full max-w-[420px] p-5 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-base text-[#3D2B1F] mb-1">
              Archivar a {mascotaNombre}
            </p>
            <p className="text-xs text-[#8A7560] leading-relaxed mb-4">
              ¿Por qué la estás archivando? Nos ayuda a tratar su historial como corresponde.
            </p>

            <div className="space-y-2 mb-4">
              {MOTIVOS.map(m => (
                <button
                  key={m.valor}
                  onClick={() => setMotivo(m.valor)}
                  className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-left"
                  style={motivo === m.valor
                    ? { border: '2px solid #FFBD59', background: '#FBEAD9' }
                    : { border: '2px solid #EEE2D4', background: '#FFFCF8' }}
                >
                  <span className="text-base flex-shrink-0">{m.emoji}</span>
                  <span className="text-sm font-semibold text-[#3D2B1F]">{m.label}</span>
                </button>
              ))}
            </div>

            {motivo && (
              <div className="bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl p-3 mb-3">
                <p className="text-xs text-[#3D2B1F] leading-relaxed">
                  {textoConfirmacion(motivo, mascotaNombre)}
                </p>
              </div>
            )}

            {esUnica && (
              <p className="text-[11px] text-[#CD7421] leading-relaxed mb-3">
                Es tu única mascota activa. Al archivarla te vamos a pedir crear una nueva, pero {mascotaNombre} queda guardada y la puedes restaurar desde aquí.
              </p>
            )}

            {error && (
              <p className="text-[11px] text-[#E05252] mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setModal(false)}
                disabled={guardando}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#8A7560] bg-[#F0E2CE] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={archivar}
                disabled={!motivo || guardando}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-[#1A1200] bg-[#FFBD59] disabled:opacity-40"
              >
                {guardando ? 'Archivando...' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
