'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import UnirseComoCotutor from '@/components/UnirseComoCotutor'

// Genera un codigo corto tipo CHIQ-XXXX
function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'CHIQ-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

interface Props {
  mascotaId: string
  mascotaNombre: string
}

// ============================================================
// CO-TUTOR
// ============================================================
// QUE SE ARREGLO:
// revocar() cambiaba la pantalla a "sin_cotutor" SIN revisar si el
// update habia funcionado. Si Supabase devolvia un error, o si la
// politica RLS no dejaba tocar la fila (caso en que Supabase NO
// devuelve error: simplemente actualiza 0 filas), la persona veia que
// la invitacion se cancelaba... y al volver a entrar al Perfil el
// codigo seguia ahi. Un fallo silencioso.
//
// Ahora:
//  1. El update pide .select() de vuelta, asi sabemos CUANTAS filas se
//     actualizaron de verdad. Cero filas = no se pudo, aunque no haya
//     error.
//  2. Si algo falla, se muestra el motivo en pantalla en vez de fingir
//     que funciono.
//  3. Si funciona, el estado se vuelve a LEER de la base (cargar()) en
//     lugar de asumirlo. Lo que se ve es lo que hay guardado.

export default function GestionCotutor({ mascotaId, mascotaNombre }: Props) {
  const supabase = createClient()
  const [estado, setEstado] = useState<'cargando' | 'sin_cotutor' | 'pendiente' | 'activo'>('cargando')
  const [invitacion, setInvitacion] = useState<any>(null)
  const [copiado, setCopiado] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargar() }, [mascotaId])

  async function cargar() {
    setEstado('cargando')
    const { data } = await supabase
      .from('mascota_cotutores')
      .select('*')
      .eq('mascota_id', mascotaId)
      .in('estado', ['pendiente', 'activo'])
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) { setEstado('sin_cotutor'); setInvitacion(null); return }
    setInvitacion(data)
    setEstado(data.estado)
  }

  async function generarInvitacion() {
    setProcesando(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('No se pudo verificar tu sesión. Vuelve a entrar e intenta de nuevo.')
      setProcesando(false)
      return
    }

    // Revocar invitaciones anteriores pendientes
    await supabase.from('mascota_cotutores')
      .update({ estado: 'revocado' })
      .eq('mascota_id', mascotaId)
      .eq('estado', 'pendiente')

    const expira = new Date()
    expira.setDate(expira.getDate() + 7)

    const { error: errIns } = await supabase.from('mascota_cotutores').insert({
      mascota_id: mascotaId,
      dueno_user_id: user.id,
      codigo_invitacion: generarCodigo(),
      codigo_expira_en: expira.toISOString(),
      estado: 'pendiente',
    })

    if (errIns) {
      setError('No se pudo generar el código. Revisa tu conexión e intenta de nuevo.')
      setProcesando(false)
      return
    }

    // Se relee de la base en vez de asumir el resultado.
    await cargar()
    setProcesando(false)
  }

  async function revocar() {
    if (!invitacion) return
    setProcesando(true)
    setError('')

    // .select() devuelve las filas realmente actualizadas. Sin esto,
    // un update que no toca ninguna fila se ve igual que uno exitoso.
    const { data, error: errUpd } = await supabase
      .from('mascota_cotutores')
      .update({ estado: 'revocado' })
      .eq('id', invitacion.id)
      .select('id')

    if (errUpd) {
      setError('No se pudo cancelar: ' + errUpd.message)
      setProcesando(false)
      await cargar()
      return
    }

    if (!data || data.length === 0) {
      setError('No se pudo cancelar la invitación (la base no permitió el cambio). Avísale a soporte con este mensaje.')
      setProcesando(false)
      await cargar()
      return
    }

    // Solo aca damos por hecho el cambio, y aun asi lo confirmamos
    // releyendo el estado real.
    await cargar()
    setProcesando(false)
  }

  async function copiar() {
    if (!invitacion) return
    try {
      await navigator.clipboard.writeText(invitacion.codigo_invitacion)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // El código ya está visible en pantalla y es .copiable, así que
      // se puede seleccionar a mano.
      setError('Tu navegador no permitió copiar. Selecciona el código de arriba y cópialo a mano.')
    }
  }

  const diasRestantes = invitacion?.codigo_expira_en
    ? Math.max(0, Math.ceil((new Date(invitacion.codigo_expira_en).getTime() - Date.now()) / 86400000))
    : 0

  if (estado === 'cargando') return null

  return (
    <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <img src="/chiqui/chiqui_amor.png" alt="" className="w-6 h-6 object-contain flex-shrink-0" />
        <h3 className="font-bold text-[13px] text-[#3D2B1F]">Co-tutor</h3>
      </div>

      {estado === 'sin_cotutor' && (
        <>
          <p className="text-[11px] text-[#8A7560] mb-2 leading-snug">
            Invita a alguien que también cuide a {mascotaNombre}.
          </p>
          <button
            onClick={generarInvitacion}
            disabled={procesando}
            className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-[13px] disabled:opacity-40"
          >
            {procesando ? 'Generando...' : '+ Generar código'}
          </button>
          {/* "Tengo un código" vive AQUI, no suelto abajo: las dos cosas
              son parte del mismo tema — compartir el cuidado. */}
          <UnirseComoCotutor />
        </>
      )}

      {estado === 'pendiente' && invitacion && (
        <>
          <p className="text-xs text-[#8A7560] mb-3">
            Comparte este código — válido por <strong>{diasRestantes} días</strong>:
          </p>
          {/* Código visual grande */}
          <div className="bg-[#FBEAD9] rounded-xl p-4 text-center mb-3">
            <p className="copiable text-3xl font-black tracking-widest text-[#8C572F]">
              {invitacion.codigo_invitacion}
            </p>
            <p className="text-xs text-[#8A7560] mt-1">Código de {mascotaNombre}</p>
          </div>
          <button
            onClick={copiar}
            className="w-full bg-[#8C572F] text-white font-bold py-2.5 rounded-xl text-sm mb-2"
          >
            {copiado ? '✓ Copiado' : '📋 Copiar código'}
          </button>
          <button
            onClick={revocar}
            disabled={procesando}
            className="w-full bg-[#EEE2D4] text-[#8A7560] font-semibold py-2 rounded-xl text-sm disabled:opacity-40"
          >
            {procesando ? 'Cancelando...' : 'Cancelar invitación'}
          </button>
        </>
      )}

      {estado === 'activo' && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <p className="text-sm text-[#3D2B1F] font-semibold">Co-tutor activo</p>
          </div>
          <p className="text-xs text-[#8A7560] mb-3">
            Hay una persona con acceso compartido a {mascotaNombre}. Puede registrar síntomas y recibir notificaciones.
          </p>
          <button
            onClick={revocar}
            disabled={procesando}
            className="w-full bg-[#E05252]/10 text-[#E05252] font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 border border-[#E05252]/20"
          >
            {procesando ? 'Revocando...' : 'Revocar acceso'}
          </button>
        </>
      )}

      {error && (
        <p className="text-[11px] text-[#E05252] mt-3 leading-relaxed">{error}</p>
      )}
    </div>
  )
}
