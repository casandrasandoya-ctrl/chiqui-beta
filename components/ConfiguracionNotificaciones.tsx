'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  notificacionesSoportadas, esIOS, estaInstalada,
  activarNotificaciones, desactivarNotificaciones, tieneSuscripcionActiva,
} from '@/utils/pushNotificaciones'

const HORAS_DISPONIBLES = Array.from({ length: 24 }, (_, h) => {
  const hh = String(h).padStart(2, '0')
  return { valor: `${hh}:00`, label: `${hh}:00` }
})

export default function ConfiguracionNotificaciones() {
  const supabase = createClient()
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [activa, setActiva] = useState(false)
  const [hora, setHora] = useState('20:00')
  const [error, setError] = useState('')
  const [soportado, setSoportado] = useState(true)
  const [iosNoInstalado, setIosNoInstalado] = useState(false)

  useEffect(() => {
    async function init() {
      const soporta = notificacionesSoportadas()
      setSoportado(soporta)

      // En iOS, las notificaciones solo funcionan si la PWA ya esta
      // instalada en la pantalla de inicio. Si esta en Safari normal
      // (no instalada), mostramos instrucciones en vez del boton.
      if (esIOS() && !estaInstalada()) {
        setIosNoInstalado(true)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prefs } = await supabase
          .from('preferencias_usuario')
          .select('hora_recordatorio, notificaciones_activas')
          .eq('user_id', user.id)
          .maybeSingle()
        if (prefs?.hora_recordatorio) setHora(prefs.hora_recordatorio)
      }

      if (soporta) {
        const suscrito = await tieneSuscripcionActiva()
        setActiva(suscrito)
      }

      setCargando(false)
    }
    init()
  }, [])

  async function manejarActivar() {
    setProcesando(true)
    setError('')
    const resultado = await activarNotificaciones()
    if (!resultado.exito) {
      setError(resultado.error || 'No se pudo activar.')
      setProcesando(false)
      return
    }
    await guardarPreferencia(true, hora)
    setActiva(true)
    setProcesando(false)
  }

  async function manejarDesactivar() {
    setProcesando(true)
    await desactivarNotificaciones()
    await guardarPreferencia(false, hora)
    setActiva(false)
    setProcesando(false)
  }

  async function manejarCambioHora(nuevaHora: string) {
    setHora(nuevaHora)
    if (activa) await guardarPreferencia(true, nuevaHora)
  }

  async function guardarPreferencia(activas: boolean, horaElegida: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('preferencias_usuario').upsert({
      user_id: user.id,
      hora_recordatorio: horaElegida,
      notificaciones_activas: activas,
    }, { onConflict: 'user_id' })
  }

  if (cargando) return null

  return (
    <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EEE2D4]">
        <h2 className="font-bold text-sm">🔔 Recordatorio diario</h2>
        <p className="text-xs text-[#8A7560] mt-0.5">Te avisamos si no has registrado a tu mascota hoy</p>
      </div>

      <div className="p-4">
        {!soportado && (
          <p className="text-xs text-[#8A7560]">
            Tu navegador no soporta notificaciones. Prueba desde Chrome o Safari.
          </p>
        )}

        {soportado && iosNoInstalado && (
          <div className="bg-[#FBEAD9] rounded-xl p-3 text-xs text-[#7A4A2F] leading-relaxed">
            <p className="font-semibold mb-1">📲 Un paso más en iPhone</p>
            <p>
              Para recibir notificaciones, primero agrega CHIQUI a tu pantalla de inicio: toca el botón
              de compartir (⬆️) en Safari, y elige "Agregar a inicio". Después abre la app desde ahí.
            </p>
          </div>
        )}

        {soportado && !iosNoInstalado && (
          <>
            <div className="mb-3">
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Hora del recordatorio</label>
              <select
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none"
                value={hora}
                onChange={e => manejarCambioHora(e.target.value)}
              >
                {HORAS_DISPONIBLES.map(h => (
                  <option key={h.valor} value={h.valor}>{h.label}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-[#E05252] mb-3">{error}</p>}

            {activa ? (
              <button
                onClick={manejarDesactivar}
                disabled={procesando}
                className="w-full bg-[#EEE2D4] text-[#8A7560] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {procesando ? 'Desactivando...' : 'Desactivar recordatorio'}
              </button>
            ) : (
              <button
                onClick={manejarActivar}
                disabled={procesando}
                className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-3 rounded-xl text-sm disabled:opacity-50"
              >
                {procesando ? 'Activando...' : '🔔 Activar recordatorio'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
