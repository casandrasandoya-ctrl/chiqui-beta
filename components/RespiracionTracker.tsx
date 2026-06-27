'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Valores de referencia según cardiología veterinaria
// Medición debe hacerse con el perro dormido o en reposo total
const RANGOS = [
  { min: 0,  max: 15, label: 'Muy baja',  color: '#4AABDB', bg: '#EBF6FC', texto: 'Frecuencia inusualmente baja. Consulta con tu vet.' },
  { min: 15, max: 30, label: 'Normal',     color: '#4CAF7D', bg: '#EAF6EF', texto: '¡Todo bien! Frecuencia normal en reposo.' },
  { min: 30, max: 40, label: 'Atención',   color: '#F5C842', bg: '#FEF9E7', texto: 'Mantente alerta. Si se repite, consulta al vet.' },
  { min: 40, max: 999, label: 'Urgente',   color: '#E05252', bg: '#FDEAEA', texto: 'Visita al veterinario de inmediato.' },
]

function getRango(rpm: number) {
  return RANGOS.find(r => rpm >= r.min && rpm < r.max) || RANGOS[1]
}

function fmt(fecha: string) {
  const d = new Date(fecha + 'T00:00:00')
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${ms[d.getMonth()]}`
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
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(false)

  // Solo aplica a perros
  if (especie !== 'Perro') return null

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

  // Calcular max para el gráfico
  const maxRpm = Math.max(...registros.map(r => r.rpm), 45)

  return (
    <div className="border-t border-[#EEE2D4] pt-3">

      {/* Header con último valor */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider">🫁 Frecuencia respiratoria</p>
          {ultimo ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black" style={{ color: rangoActual?.color }}>
                {ultimo.rpm} rpm
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: rangoActual?.bg, color: rangoActual?.color }}>
                {rangoActual?.label}
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#8A7560] mt-0.5">Sin mediciones aún</p>
          )}
        </div>
        <button
          onClick={() => setMostrarForm(v => !v)}
          className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-2 rounded-xl"
        >
          + Registrar
        </button>
      </div>

      {/* Instrucciones desplegables */}
      <button
        onClick={() => setMostrarInstrucciones(v => !v)}
        className="w-full text-left mb-3 bg-[#FBEAD9] rounded-xl px-3 py-2 flex items-center justify-between"
      >
        <span className="text-xs font-semibold text-[#8C572F]">📋 ¿Cómo medir correctamente?</span>
        <span className="text-[#8C572F] text-sm">{mostrarInstrucciones ? '⌃' : '⌄'}</span>
      </button>
      {mostrarInstrucciones && (
        <div className="bg-[#FBEAD9] rounded-xl px-3 py-3 mb-3 space-y-2">
          <p className="text-xs text-[#7A4A2F] font-semibold">Pasos para medir:</p>
          {[
            '1. Espera que tu perro esté completamente dormido o en reposo total (no soñando).',
            '2. Observa cómo su pecho o abdomen sube y baja. Cada subida+bajada = 1 respiración.',
            '3. Usa un cronómetro: cuenta 15 segundos y multiplica por 4, o cuenta 30 segundos y multiplica por 2.',
          ].map((paso, i) => (
            <p key={i} className="text-xs text-[#7A4A2F] leading-relaxed">{paso}</p>
          ))}
          <div className="mt-2 pt-2 border-t border-[#CD7421]/20 space-y-1">
            <p className="text-xs font-semibold text-[#7A4A2F]">Valores de referencia (en reposo):</p>
            {RANGOS.slice(1).map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <p className="text-xs text-[#7A4A2F]">
                  <strong>{r.label}:</strong> {r.min === 40 ? '+40' : `${r.min}-${r.max}`} rpm — {r.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de registro */}
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
                min="1"
                max="200"
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-center text-2xl font-black text-[#3D2B1F] focus:outline-none"
              />
            </div>
            {rpm && parseInt(rpm) > 0 && (() => {
              const r = getRango(parseInt(rpm))
              return (
                <div className="flex-shrink-0 text-center">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: r.bg }}>
                    <span className="text-xs font-bold" style={{ color: r.color }}>{r.label}</span>
                  </div>
                </div>
              )
            })()}
          </div>
          {rpm && parseInt(rpm) > 0 && (
            <p className="text-xs leading-relaxed" style={{ color: getRango(parseInt(rpm)).color }}>
              {getRango(parseInt(rpm)).texto}
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
            <button
              onClick={guardar}
              disabled={guardando || !rpm || parseInt(rpm) < 1}
              className="flex-1 bg-[#8C572F] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => { setMostrarForm(false); setRpm(''); setNota('') }}
              className="px-4 bg-[#EEE2D4] text-[#8A7560] font-semibold py-2.5 rounded-xl text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Gráfico de barras */}
      {registros.length > 0 && (
        <div className="mb-3">
          {/* Líneas de referencia */}
          <div className="relative h-32 mb-1">
            {/* Zona normal */}
            <div className="absolute inset-x-0" style={{
              bottom: `${(15/maxRpm)*100}%`,
              height: `${((30-15)/maxRpm)*100}%`,
              background: 'rgba(76,175,125,0.08)',
              borderTop: '1px dashed rgba(76,175,125,0.4)',
              borderBottom: '1px dashed rgba(76,175,125,0.4)',
            }} />
            {/* Zona atención */}
            <div className="absolute inset-x-0" style={{
              bottom: `${(30/maxRpm)*100}%`,
              height: `${((40-30)/maxRpm)*100}%`,
              background: 'rgba(245,200,66,0.08)',
              borderTop: '1px dashed rgba(245,200,66,0.4)',
            }} />
            {/* Barras */}
            <div className="absolute inset-0 flex items-end gap-1 px-1">
              {[...registros].reverse().map((r, i) => {
                const rang = getRango(r.rpm)
                const h = Math.max(4, (r.rpm / maxRpm) * 100)
                return (
                  <div key={r.id} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold" style={{ color: rang.color }}>{r.rpm}</span>
                    <div
                      className="w-full rounded-t-md"
                      style={{ height: `${h}%`, background: rang.color, minHeight: '4px' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
          {/* Fechas */}
          <div className="flex gap-1 px-1">
            {[...registros].reverse().map(r => (
              <div key={r.id} className="flex-1 text-center">
                <p className="text-[9px] text-[#8A7560]">{fmt(r.fecha)}</p>
              </div>
            ))}
          </div>
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
            return (
              <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-b border-[#EEE2D4] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rang.color }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#3D2B1F]">{r.rpm} rpm</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: rang.bg, color: rang.color }}>{rang.label}</span>
                  </div>
                  <p className="text-[10px] text-[#8A7560]">{fmt(r.fecha)}{r.nota ? ` · ${r.nota}` : ''}</p>
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
