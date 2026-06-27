'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const RANGOS = [
  { min: 0,   max: 15,  label: 'Muy baja', color: '#4AABDB', bg: '#EBF6FC' },
  { min: 15,  max: 30,  label: 'Normal',   color: '#4CAF7D', bg: '#EAF6EF' },
  { min: 30,  max: 40,  label: 'Atención', color: '#F5C842', bg: '#FEF9E7' },
  { min: 40,  max: 999, label: 'Urgente',  color: '#E05252', bg: '#FDEAEA' },
]

function getRango(rpm: number) {
  return RANGOS.find(r => rpm >= r.min && rpm < r.max) || RANGOS[1]
}

function getTexto(rpm: number, especie: string): string {
  const rango = getRango(rpm)
  if (rango.label === 'Muy baja') return 'Frecuencia inusualmente baja. Consulta con tu vet.'
  if (rango.label === 'Normal') return especie === 'Gato'
    ? 'Frecuencia normal. El movimiento debe ser suave e imperceptible.'
    : '¡Todo bien! Frecuencia normal en reposo.'
  if (rango.label === 'Atención') return especie === 'Gato'
    ? 'Monitorea varias veces al día. Si persiste, consulta al vet.'
    : 'Mantente alerta. Si se repite, consulta al vet.'
  return especie === 'Gato'
    ? 'Acude a urgencias de inmediato. Los gatos NUNCA deben jadear con la boca abierta — es señal crítica de falta de oxígeno o falla cardíaca.'
    : 'Visita al veterinario de inmediato.'
}

function fmt(fecha: string, conAnio = false) {
  const d = new Date(fecha + 'T00:00:00')
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const base = `${d.getDate()} ${ms[d.getMonth()]}`
  return conAnio ? `${base} ${d.getFullYear()}` : base
}

function multiAnio(fechas: string[]) {
  if (fechas.length < 2) return false
  const anios = new Set(fechas.map(f => new Date(f + 'T00:00:00').getFullYear()))
  return anios.size > 1
}

interface Props {
  mascotaId: string
  especie: string
}

export default function RespiracionTracker({ mascotaId, especie }: Props) {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [rpm, setRpm] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarInfo, setMostrarInfo] = useState(false)

  if (especie !== 'Perro' && especie !== 'Gato') return null

  useEffect(() => { cargar() }, [mascotaId])

  async function cargar() {
    const { data } = await supabase
      .from('frecuencia_respiratoria')
      .select('*')
      .eq('mascota_id', mascotaId)
      .order('fecha', { ascending: false })
      .limit(10)
    setRegistros(data || [])
  }

  async function guardar() {
    const n = parseInt(rpm)
    if (!n || n < 1 || n > 200) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }
    await supabase.from('frecuencia_respiratoria').insert({
      mascota_id: mascotaId,
      user_id: user.id,
      rpm: n,
      nota: nota || null,
      fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    })
    setRpm(''); setNota(''); setMostrarForm(false)
    await cargar()
    setGuardando(false)
  }

  async function eliminar(id: string) {
    await supabase.from('frecuencia_respiratoria').delete().eq('id', id)
    await cargar()
  }

  const ultimo = registros[0]
  const rangoActual = ultimo ? getRango(ultimo.rpm) : null
  const maxRpm = Math.max(...registros.map(r => r.rpm), 45)
  const rpmNum = parseInt(rpm)
  const rangoPreview = rpmNum > 0 ? getRango(rpmNum) : null

  return (
    <div className="border-t border-[#EEE2D4] pt-3">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider">🫁 Frecuencia respiratoria</p>
          {ultimo && rangoActual ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black" style={{ color: rangoActual.color }}>{ultimo.rpm} rpm</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: rangoActual.bg, color: rangoActual.color }}>
                {rangoActual.label}
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#8A7560] mt-0.5">Sin mediciones aún</p>
          )}
        </div>
        <button onClick={() => setMostrarForm(v => !v)} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-2 rounded-xl">
          + Registrar
        </button>
      </div>

      {/* Advertencia especial para gatos */}
      {especie === 'Gato' && (
        <div className="bg-[#FDEAEA] border border-[#E05252]/20 rounded-xl px-3 py-2 mb-3 flex gap-2">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-[#E05252] leading-relaxed">
            <strong>En gatos, jadear con la boca abierta es siempre una emergencia.</strong> A diferencia de los perros, los gatos nunca jadean por calor o cansancio normal.
          </p>
        </div>
      )}

      {/* Instrucciones */}
      <button onClick={() => setMostrarInfo(v => !v)} className="w-full text-left mb-3 bg-[#FBEAD9] rounded-xl px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8C572F]">📋 ¿Cómo medir correctamente?</span>
        <span className="text-[#8C572F] text-sm">{mostrarInfo ? '⌃' : '⌄'}</span>
      </button>
      {mostrarInfo && (
        <div className="bg-[#FBEAD9] rounded-xl px-3 py-3 mb-3 space-y-2">
          <p className="text-xs text-[#7A4A2F] font-semibold">Pasos para medir:</p>
          {[
            `1. Espera que tu ${especie === 'Gato' ? 'gato' : 'perro'} esté completamente dormido o en reposo total.`,
            '2. Observa cómo su pecho sube y baja. Cada subida+bajada = 1 respiración.',
            '3. Cuenta 15 segundos y multiplica por 4, o 30 segundos y multiplica por 2.',
          ].map((paso, i) => (
            <p key={i} className="text-xs text-[#7A4A2F] leading-relaxed">{paso}</p>
          ))}
          <div className="mt-2 pt-2 border-t border-[#CD7421]/20 space-y-1">
            <p className="text-xs font-semibold text-[#7A4A2F]">Valores de referencia (en reposo):</p>
            {RANGOS.slice(1).map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <p className="text-xs text-[#7A4A2F]">
                  <strong>{r.label}:</strong> {r.min === 40 ? '+40' : `${r.min}-${r.max}`} rpm
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl p-3 mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-[#8A7560] mb-1">Respiraciones por minuto</p>
              <input
                type="number"
                value={rpm}
                onChange={e => setRpm(e.target.value)}
                placeholder="ej. 22"
                min="1" max="200"
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-center text-2xl font-black text-[#3D2B1F] focus:outline-none"
              />
            </div>
            {rangoPreview && (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: rangoPreview.bg }}>
                <span className="text-xs font-bold text-center px-1" style={{ color: rangoPreview.color }}>{rangoPreview.label}</span>
              </div>
            )}
          </div>
          {rangoPreview && (
            <p className="text-xs leading-relaxed" style={{ color: rangoPreview.color }}>
              {getTexto(rpmNum, especie)}
            </p>
          )}
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Nota opcional (ej. estaba profundamente dormido)"
            className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2 text-xs text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando || !rpm || rpmNum < 1}
              className="flex-1 bg-[#8C572F] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setMostrarForm(false); setRpm(''); setNota('') }}
              className="px-4 bg-[#EEE2D4] text-[#8A7560] font-semibold py-2.5 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {registros.length > 0 && (
        <div className="mb-3">
          <div className="relative h-32 mb-1">
            <div className="absolute inset-x-0" style={{
              bottom: `${(15/maxRpm)*100}%`, height: `${((30-15)/maxRpm)*100}%`,
              background: 'rgba(76,175,125,0.08)',
              borderTop: '1px dashed rgba(76,175,125,0.4)',
              borderBottom: '1px dashed rgba(76,175,125,0.4)',
            }} />
            <div className="absolute inset-x-0" style={{
              bottom: `${(30/maxRpm)*100}%`, height: `${((40-30)/maxRpm)*100}%`,
              background: 'rgba(245,200,66,0.08)',
              borderTop: '1px dashed rgba(245,200,66,0.4)',
            }} />
            <div className="absolute inset-0 flex items-end gap-1 px-1">
              {[...registros].reverse().map(r => {
                const rang = getRango(r.rpm)
                const h = Math.max(4, (r.rpm / maxRpm) * 100)
                return (
                  <div key={r.id} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold" style={{ color: rang.color }}>{r.rpm}</span>
                    <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: rang.color, minHeight: '4px' }} />
                  </div>
                )
              })}
            </div>
          </div>
          {/* Eje X con fechas */}
          {(() => {
            const fechas = [...registros].reverse().map(r => r.fecha)
            const conAnio = multiAnio(fechas)
            return (
              <div className="flex gap-1 px-1">
                {fechas.map((f, i) => (
                  <div key={i} className="flex-1 text-center">
                    <p className="text-[9px] text-[#8A7560]">{fmt(f, conAnio)}</p>
                  </div>
                ))}
              </div>
            )
          })()}
          {/* Leyenda */}
          <div className="flex gap-3 mt-2 flex-wrap">
            {RANGOS.slice(1).map(r => (
              <div key={r.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                <span className="text-[10px] text-[#8A7560]">{r.label} {r.min === 40 ? '+40' : `${r.min}-${r.max}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {registros.length > 0 && (
        <div className="space-y-1.5">
          {registros.map(r => {
            const rang = getRango(r.rpm)
            const fechas = registros.map(x => x.fecha)
            return (
              <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-b border-[#EEE2D4] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rang.color }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#3D2B1F]">{r.rpm} rpm</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: rang.bg, color: rang.color }}>{rang.label}</span>
                  </div>
                  <p className="text-[10px] text-[#8A7560]">{fmt(r.fecha, multiAnio(fechas))}{r.nota ? ` · ${r.nota}` : ''}</p>
                </div>
                <button onClick={() => eliminar(r.id)} className="text-[#8A7560] text-xs px-2 py-1">✕</button>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
