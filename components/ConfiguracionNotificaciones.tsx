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
  // Permiso bloqueado a nivel de navegador/SO (Android vuelve a pedirlo
  // al instalar la app desde Google Play, ya que la trata como app
  // nueva). Si el usuario ya lo rechazó, el navegador NO deja volver a
  // pedirlo con un clic -- hay que avisarle que vaya a Configuración.
  const [permisoDenegado, setPermisoDenegado] = useState(false)
  // Diagnóstico visible: los tres estados que tienen que estar bien
  // para que llegue una notificación. Se muestra solo cuando el
  // recordatorio está apagado, para poder ver cuál de los tres falla
  // en vez de adivinar.
  const [diag, setDiag] = useState<{ permiso: string; navegador: boolean; base: boolean } | null>(null)

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

      // Detectar si el permiso del navegador ya quedó denegado
      // (ej. Android tras reinstalar desde Google Play). Si es así, no
      // tiene sentido mostrar el botón "Activar" -- nunca va a
      // funcionar hasta que la persona lo habilite manualmente desde
      // Configuración del teléfono.
      if (soporta && typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermisoDenegado(true)
      }

      const { data: { user } } = await supabase.auth.getUser()
      // La base guarda la INTENCIÓN de la persona. El navegador
      // guarda la suscripción técnica, que se puede perder sola
      // (por ejemplo cada vez que se reinstala el service worker,
      // o sea en cada despliegue). Hay que mirar las dos cosas.
      let prefActiva = false
      if (user) {
        const { data: prefs } = await supabase
          .from('preferencias_usuario')
          .select('hora_recordatorio, notificaciones_activas')
          .eq('user_id', user.id)
          .maybeSingle()
        if (prefs?.hora_recordatorio) setHora(prefs.hora_recordatorio)
        prefActiva = prefs?.notificaciones_activas === true
      }

      if (soporta) {
        const permisoOk = typeof Notification !== 'undefined' && Notification.permission === 'granted'
        let suscrito = await tieneSuscripcionActiva()

        // Recuperación silenciosa: la persona ya dijo que sí y el
        // permiso sigue dado, pero el navegador perdió la
        // suscripción. Se rehace sin molestarla — antes esto se
        // veía como "desactivada" y había que activar de nuevo.
        if (!suscrito && prefActiva && permisoOk) {
          const recuperado = await activarNotificaciones()
          suscrito = recuperado.exito
        }

        // El servidor decide a quien mandarle mirando la BASE, no este
        // navegador. Si hay preferencia activa y una suscripcion
        // guardada, la persona SI va a recibir sus recordatorios,
        // aunque este dispositivo haya perdido su copia local.
        //
        // Mostrar "activar" en ese caso la hacia intentar de nuevo y
        // chocar con la suscripcion que ya existia — el error que
        // reportaron las usuarias.
        const { data: { user: usuarioActual } } = await supabase.auth.getUser()
        let haySuscripcionGuardada = false
        if (usuarioActual) {
          const { count } = await supabase
            .from('suscripciones_push')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', usuarioActual.id)
          haySuscripcionGuardada = (count || 0) > 0
        }

        // El permiso si tiene que seguir concedido: sin el, el telefono
        // no mostraria la notificacion aunque llegara.
        setActiva(permisoOk && (suscrito || (prefActiva && haySuscripcionGuardada)))

        // Foto de los tres estados, para poder mirarla si algo falla.
        setDiag({
          permiso: typeof Notification !== 'undefined' ? Notification.permission : 'sin soporte',
          navegador: suscrito,
          base: prefActiva,
        })
      }

      setCargando(false)
    }
    init()
  }, [])

  async function manejarActivar() {
    setProcesando(true)
    setError('')
    // El finally es lo importante: antes, si algo lanzaba un error,
    // setProcesando(false) nunca se ejecutaba y el botón quedaba en
    // "Activando..." para siempre, sin decir qué pasó.
    try {
      const resultado = await activarNotificaciones()
      if (!resultado.exito) {
        // Si el navegador devuelve el permiso como denegado justo en
        // este intento, actualizamos el aviso persistente también.
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          setPermisoDenegado(true)
        }
        setError(resultado.error || 'No se pudo activar.')
        return
      }
      // Si la preferencia no llega a la base, el cron nunca va a
      // encontrar a esta persona. Marcarla como activa en pantalla
      // sería mentirle.
      const guardado = await guardarPreferencia(true, hora)
      if (!guardado.ok) {
        setError(guardado.error || 'No se pudo guardar la preferencia.')
        return
      }
      setActiva(true)
    } catch (e: any) {
      setError('Ocurrió un error inesperado (' + String(e?.name || 'desconocido') + '). Cierra la app por completo e intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
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

  // Devuelve si el guardado funcionó DE VERDAD. Antes no se revisaba
  // el error: si la base rechazaba el cambio, la app decía "listo"
  // igual y al volver a entrar el recordatorio aparecía apagado.
  async function guardarPreferencia(activas: boolean, horaElegida: string): Promise<{ ok: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No se pudo verificar tu sesión.' }
    const { error: errPref } = await supabase.from('preferencias_usuario').upsert({
      user_id: user.id,
      hora_recordatorio: horaElegida,
      notificaciones_activas: activas,
    }, { onConflict: 'user_id' })
    if (errPref) {
      // El mensaje de Postgres viaja tal cual: es la única forma de
      // saber si falta la restricción única, la política de UPDATE,
      // o algo que todavía no hemos visto.
      return { ok: false, error: 'No se pudo guardar la preferencia: ' + (errPref.message || 'error desconocido') }
    }
    return { ok: true }
  }

  if (cargando) return null

  return (
    <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EEE2D4]">
        <div className="flex items-center gap-2 mb-1">
          <img src="/chiqui/chiqui_estrella.png" alt="" className="w-7 h-7 object-contain" />
          <h2 className="font-bold text-sm">Recordatorio diario</h2>
        </div>
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
              Para recibir notificaciones, primero agrega CHIQUI a tu pantalla de inicio: toca el botón de compartir (⬆️) en Safari, y elige "Agregar a inicio". Después abre la app desde ahí.
            </p>
          </div>
        )}

        {/* Diagnóstico: solo cuando el recordatorio está apagado.
            Permite mandar una captura que dice cuál de los tres
            eslabones falla, en vez de "no me funciona". */}
        {soportado && !activa && diag && (
          <p className="text-[10px] text-[#B5A38F] mb-2 leading-relaxed">
            Estado: permiso {diag.permiso === 'granted' ? '✓' : diag.permiso === 'denied' ? '✕ bloqueado' : '— sin pedir'}
            {' · '}navegador {diag.navegador ? '✓' : '✕'}
            {' · '}base {diag.base ? '✓' : '✕'}
          </p>
        )}
        {soportado && !iosNoInstalado && permisoDenegado && (
          <div className="bg-[#F07A30]/10 rounded-xl p-3 text-xs text-[#8C572F] leading-relaxed">
            <p className="font-semibold mb-1">🔕 Las notificaciones están bloqueadas</p>
            <p>
              Actívalas desde Configuración de tu teléfono → Apps → CHIQUI → Notificaciones, y vuelve a abrir la app.
            </p>
          </div>
        )}

        {soportado && !iosNoInstalado && !permisoDenegado && (
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
