'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Valores de referencia por especie
// Perros:  Normal 37.5-39.2 / Atención 39.2-39.5 / Fiebre 39.5-41 / Emergencia +41
// Gatos:   Normal 38.0-39.3 / Atención 39.3-39.5 / Fiebre 39.5-41 / Emergencia +41
// Hipotermia (ambos): menos de 37.5

const RANGOS: Record<string, { min: number; max: number; label: string; color: string; bg: string; texto: string }[]> = {
  Perro: [
    { min: 0,    max: 37.5, label: 'Hipotermia', color: '#4AABDB', bg: '#EBF6FC', texto: 'Temperatura muy baja. Mantén a tu perro abrigado y consulta al vet.' },
    { min: 37.5, max: 39.2, label: 'Normal',     color: '#4CAF7D', bg: '#EAF6EF', texto: 'Temperatura normal. Todo bien.' },
    { min: 39.2, max: 39.5, label: 'Atención',   color: '#F5C842', bg: '#FEF9E7', texto: 'Ligeramente elevada. Monitorea y consulta si persiste.' },
    { min: 39.5, max: 41.0, label: 'Fiebre',     color: '#F07A30', bg: '#FEF0E7', texto: 'Fiebre confirmada. Consulta al veterinario pronto.' },
    { min: 41.0, max: 999,  label: 'Emergencia', color: '#E05252', bg: '#FDEAEA', texto: 'Emergencia. Temperatura peligrosa — acude al vet de inmediato.' },
  ],
  Gato: [
    { min: 0,    max: 37.5, label: 'Hipotermia', color: '#4AABDB', bg: '#EBF6FC', texto: 'Temperatura muy baja. Mantén a tu gato abrigado y consulta al vet.' },
    { min: 37.5, max: 38.0, label: 'Baja',       color: '#4AABDB', bg: '#EBF6FC', texto: 'Ligeramente baja. Observa si sube a rango normal en reposo.' },
    { min: 38.0, max: 39.3, label: 'Normal',     color: '#4CAF7D', bg: '#EAF6EF', texto: 'Temperatura normal para tu gato.' },
    { min: 39.3, max: 39.5, label: 'Atención',   color: '#F5C842', bg: '#FEF9E7', texto: 'Ligeramente elevada. Monitorea y consulta si persiste.' },
    { min: 39.5, max: 41.0, label: 'Fiebre',     color: '#F07A30', bg: '#FEF0E7', texto: 'Fiebre confirmada. Consulta al veterinario.' },
    { min: 41.0, max: 999,  label: 'Emergencia', color: '#E05252', bg: '#FDEAEA', texto: 'Emergencia. Temperatura peligrosa — acude al vet de inmediato.' },
  ],
}

const RANGOS_GENERAL = [
  { min: 0,    max: 37.5, label: 'Hipotermia', color: '#4AABDB', bg: '#EBF6FC', texto: 'Temperatura muy baja. Consulta al vet.' },
  { min: 37.5, max: 39.2, label: 'Normal',     color: '#4CAF7D', bg: '#EAF6EF', texto: 'Temperatura normal.' },
  { min: 39.2, max: 39.5, label: 'Atención',   color: '#F5C842', bg: '#FEF9E7', texto: 'Ligeramente elevada. Monitorea.' },
  { min: 39.5, max: 41.0, label: 'Fiebre',     color: '#F07A30', bg: '#FEF0E7', texto: 'Fiebre. Consulta al vet.' },
  { min: 41.0, max: 999,  label: 'Emergencia', color: '#E05252', bg: '#FDEAEA', texto: 'Emergencia — acude al vet de inmediato.' },
]

function getRango(temp: number, especie: string) {
  const rangos = RANGOS[especie] || RANGOS_GENERAL
  return rangos.find(r => temp >= r.min && temp < r.max) || rangos[2]
}

function fmt(fecha: string, conAnio = false) {
  const d = new Date(fecha + 'T00:00:00')
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const base = `${d.getDate()} ${ms[d.getMonth()]}`
  return conAnio ? `${base} ${d.getFullYear()}` : base
}

function multiAnio(fechas: string[]) {
  if (fechas.length < 2) return false
  return new Set(fechas.map(f => new Date(f + 'T00:00:00').getFullYear())).size > 1
}

interface Props {
  mascotaId: string
  especie: string
}

export default function TemperaturaTracker({ mascotaId, especie }: Props) {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [temp, setTemp] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarInfo, setMostrarInfo] = useState(false)

  // Solo perros y gatos
  if (especie !== 'Perro' && especie !== 'Gato') return null

  useEffect(() => { cargar() }, [mascotaId])

  async function cargar() {
    const { data } = await supabase
      .from('temperatura_corporal')
      .select('*')
      .eq('mascota_id', mascotaId)
      .order('fecha', { ascending: false })
      .limit(10)
    setRegistros(data || [])
  }

  async function guardar() {
    const n = parseFloat(temp.replace(',', '.'))
    if (!n || n < 30 || n > 45) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }
    await supabase.from('temperatura_corporal').insert({
      mascota_id: mascotaId,
      user_id: user.id,
      temperatura: n,
      nota: nota || null,
      fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }),
    })
    setTemp(''); setNota(''); setMostrarForm(false)
    await cargar()
    setGuardando(false)
  }

  async function eliminar(id: string) {
    await supabase.from('temperatura_corporal').delete().eq('id', id)
    await cargar()
  }

  const tempNum = parseFloat(temp.replace(',', '.'))
  const rangoPreview = !isNaN(tempNum) && tempNum > 30 ? getRango(tempNum, especie) : null
  const ultimo = registros[0]
  const rangoActual = ultimo ? getRango(ultimo.temperatura, especie) : null

  // Rangos normales por especie para el gráfico
  const normalMin = especie === 'Gato' ? 38.0 : 37.5
  const normalMax = especie === 'Gato' ? 39.3 : 39.2

  return (
    <div className="px-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider">🌡️ Temperatura corporal</p>
          {ultimo && rangoActual ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black" style={{ color: rangoActual.color }}>{ultimo.temperatura}°C</span>
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

      {/* Instrucciones */}
      <button onClick={() => setMostrarInfo(v => !v)} className="w-full text-left mb-3 bg-[#FBEAD9] rounded-xl px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#8C572F]">📋 ¿Cómo medir correctamente?</span>
        <span className="text-[#8C572F] text-sm">{mostrarInfo ? '⌃' : '⌄'}</span>
      </button>
      {mostrarInfo && (
        <div className="bg-[#FBEAD9] rounded-xl px-3 py-3 mb-3 space-y-2">
          <p className="text-xs text-[#7A4A2F] font-semibold">Pasos:</p>
          {[
            '1. Usa un termómetro digital de punta flexible. Nunca de mercurio.',
            '2. Lubrica la punta con vaselina.',
            '3. Introduce suavemente en el recto, unos 2 cm.',
            '4. Espera el pitido y registra el valor.',
            '⚠️ La nariz seca o caliente NO confirma fiebre — solo el termómetro lo hace.',
          ].map((paso, i) => (
            <p key={i} className="text-xs text-[#7A4A2F] leading-relaxed">{paso}</p>
          ))}
          <div className="mt-2 pt-2 border-t border-[#CD7421]/20 space-y-1">
            <p className="text-xs font-semibold text-[#7A4A2F]">Valores de referencia ({especie}):</p>
            {(RANGOS[especie] || RANGOS_GENERAL).map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <p className="text-xs text-[#7A4A2F]">
                  <strong>{r.label}:</strong> {r.min === 0 ? `< ${r.max}` : r.max === 999 ? `> ${r.min}` : `${r.min}–${r.max}`}°C
                </p>
              </div>
            ))}
            {especie === 'Gato' && (
              <p className="text-[10px] text-[#7A4A2F] italic mt-1">Los cachorros pueden tener hasta 39.5°C normalmente.</p>
            )}
          </div>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl p-3 mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-[#8A7560] mb-1">Temperatura (°C)</p>
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                placeholder="ej. 38.5"
                min="30" max="45"
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-center text-2xl font-black text-[#3D2B1F] focus:outline-none"
              />
            </div>
            {rangoPreview && (
              <div className="w-16 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: rangoPreview.bg }}>
                <span className="text-xs font-bold text-center px-1 leading-tight" style={{ color: rangoPreview.color }}>{rangoPreview.label}</span>
              </div>
            )}
          </div>
          {rangoPreview && (
            <p className="text-xs leading-relaxed" style={{ color: rangoPreview.color }}>{rangoPreview.texto}</p>
          )}
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Nota opcional (ej. después de paseo intenso)"
            className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-3 py-2 text-xs text-[#3D2B1F] placeholder-[#8A7560] focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando || !temp || isNaN(tempNum) || tempNum < 30}
              className="flex-1 bg-[#8C572F] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setMostrarForm(false); setTemp(''); setNota('') }}
              className="px-4 bg-[#EEE2D4] text-[#8A7560] font-semibold py-2.5 rounded-xl text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Gráfico de línea + puntos */}
      {registros.length >= 2 && (() => {
        const datos = [...registros].reverse()
        const W = 300, H = 80, PAD = 10
        const temps = datos.map(r => r.temperatura)
        const minVal = Math.min(...temps, normalMin) - 0.5
        const maxVal = Math.max(...temps, normalMax) + 0.5
        const rango = maxVal - minVal
        const puntos = datos.map((r, i) => ({
          x: PAD + (i / (datos.length - 1)) * (W - PAD * 2),
          y: H - PAD - ((r.temperatura - minVal) / rango) * (H - PAD * 2),
          temp: r.temperatura, fecha: r.fecha,
          color: getRango(r.temperatura, especie).color,
        }))
        const pathD = `M ${puntos.map(p => `${p.x},${p.y}`).join(' L ')}`
        const yNormMin = H - PAD - ((normalMin - minVal) / rango) * (H - PAD * 2)
        const yNormMax = H - PAD - ((normalMax - minVal) / rango) * (H - PAD * 2)
        const fechas = datos.map(r => r.fecha)
        const conAnio = multiAnio(fechas)
        return (
          <div className="mb-3">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90, overflow: 'visible' }} preserveAspectRatio="none">
              {/* Zona normal */}
              <rect x={0} y={yNormMax} width={W} height={yNormMin - yNormMax} fill="rgba(76,175,125,0.1)" />
              {/* Líneas de referencia */}
              <line x1={0} y1={yNormMin} x2={W} y2={yNormMin} stroke="rgba(76,175,125,0.5)" strokeWidth="1" strokeDasharray="4,3" />
              <line x1={0} y1={yNormMax} x2={W} y2={yNormMax} stroke="rgba(245,200,66,0.5)" strokeWidth="1" strokeDasharray="4,3" />
              {/* Línea de conexión */}
              <path d={pathD} fill="none" stroke="#8C572F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Puntos */}
              {puntos.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={i === puntos.length - 1 ? 5 : 4} fill={p.color} stroke="#FFFCF8" strokeWidth="1.5" />
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="7" fill={p.color} fontWeight="bold">{p.temp}</text>
                </g>
              ))}
            </svg>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[9px] text-[#8A7560]">{fmt(fechas[0], conAnio)}</span>
              <span className="text-[9px] text-[#8A7560]">{fmt(fechas[fechas.length - 1], conAnio)}</span>
            </div>
          </div>
        )
      })()}

      {/* Historial */}
      {registros.length > 0 && (
        <div className="space-y-1.5">
          {registros.map(r => {
            const rang = getRango(r.temperatura, especie)
            return (
              <div key={r.id} className="flex items-center gap-2.5 py-1.5 border-b border-[#EEE2D4] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rang.color }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#3D2B1F]">{r.temperatura}°C</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: rang.bg, color: rang.color }}>{rang.label}</span>
                  </div>
                  <p className="text-[10px] text-[#8A7560]">{fmt(r.fecha, multiAnio(registros.map(x => x.fecha)))}{r.nota ? ` · ${r.nota}` : ''}</p>
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
