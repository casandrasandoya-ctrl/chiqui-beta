'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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

export default function GestionCotutor({ mascotaId, mascotaNombre }: Props) {
  const supabase = createClient()
  const [estado, setEstado] = useState<'cargando' | 'sin_cotutor' | 'pendiente' | 'activo'>('cargando')
  const [invitacion, setInvitacion] = useState<any>(null)
  const [copiado, setCopiado] = useState(false)
  const [procesando, setProcesando] = useState(false)

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProcesando(false); return }

    // Revocar invitaciones anteriores pendientes
    await supabase.from('mascota_cotutores')
      .update({ estado: 'revocado' })
      .eq('mascota_id', mascotaId)
      .eq('estado', 'pendiente')

    const expira = new Date()
    expira.setDate(expira.getDate() + 7)

    const { data, error } = await supabase.from('mascota_cotutores').insert({
      mascota_id: mascotaId,
      dueno_user_id: user.id,
      codigo_invitacion: generarCodigo(),
      codigo_expira_en: expira.toISOString(),
      estado: 'pendiente',
    }).select().single()

    if (!error) { setInvitacion(data); setEstado('pendiente') }
    setProcesando(false)
  }

  async function revocar() {
    if (!invitacion) return
    setProcesando(true)
    await supabase.from('mascota_cotutores')
      .update({ estado: 'revocado' })
      .eq('id', invitacion.id)
    setEstado('sin_cotutor')
    setInvitacion(null)
    setProcesando(false)
  }

  function copiar() {
    if (!invitacion) return
    navigator.clipboard.writeText(invitacion.codigo_invitacion)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const diasRestantes = invitacion?.codigo_expira_en
    ? Math.max(0, Math.ceil((new Date(invitacion.codigo_expira_en).getTime() - Date.now()) / 86400000))
    : 0

  if (estado === 'cargando') return null

  return (
    <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
      <div className="flex items-center gap-2 mb-3">
        <img src="/chiqui/chiqui_amor.png" alt="" className="w-7 h-7 object-contain" />
        <h3 className="font-bold text-sm text-[#3D2B1F]">Co-tutor</h3>
      </div>

      {estado === 'sin_cotutor' && (
        <>
          <p className="text-xs text-[#8A7560] mb-3 leading-relaxed">
            Invita a alguien de tu familia o pareja para que también pueda registrar a {mascotaNombre}.
          </p>
          <button
            onClick={generarInvitacion}
            disabled={procesando}
            className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
          >
            {procesando ? 'Generando...' : '+ Generar código de invitación'}
          </button>
        </>
      )}

      {estado === 'pendiente' && invitacion && (
        <>
          <p className="text-xs text-[#8A7560] mb-3">
            Comparte este código — válido por <strong>{diasRestantes} días</strong>:
          </p>
          {/* Código visual grande */}
          <div className="bg-[#FBEAD9] rounded-xl p-4 text-center mb-3">
            <p className="text-3xl font-black tracking-widest text-[#8C572F]">
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
            Cancelar invitación
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
    </div>
  )
}
