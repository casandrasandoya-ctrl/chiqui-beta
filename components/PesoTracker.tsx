'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface RegistroPeso {
  id: string
  peso: number
  fecha: string
  nota?: string
}

const MS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function fmtCorta(f: string) {
  const d = new Date(f + 'T00:00:00')
  return `${d.getDate()} ${MS[d.getMonth()]}`
}

export default function PesoTracker({ mascotaId, pesoActual }: { mascotaId: string; pesoActual?: number }) {
  const supabase = createClient()
  const [historial, setHistorial] = useState<RegistroPeso[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [mascotaId])

  async function cargar() {
    const { data } = await supabase
      .from('historial_peso')
      .select('id, peso, fecha, nota')
      .eq('mascota_id', mascotaId)
      .order('fecha', { ascending: true })
      .limit(12)
    setHistorial(data || [])
    setLoading(false)
  }

  async function guardar() {
    if (!nuevoPeso) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Si ya existe un registro para esa fecha, lo actualizamos en vez de duplicar
    const { data: existente } = await supabase
      .from('historial_peso')
      .select('id')
      .eq('mascota_id', mascotaId)
      .eq('fecha', nuevaFecha)
      .maybeSingle()

    if (existente) {
      await supabase.from('historial_peso').update({ peso: parseFloat(nuevoPeso) }).eq('id', existente.id)
    } else {
      await supabase.from('historial_peso').insert({
        mascota_id: mascotaId,
        user_id: user.id,
        peso: parseFloat(nuevoPeso),
        fecha: nuevaFecha,
      })
    }

    // También actualiza el peso_actual en la mascota para que se vea en todas partes
    await supabase.from('mascotas').update({ peso_actual: parseFloat(nuevoPeso) }).eq('id', mascotaId)

    await cargar()
    setModal(false)
    setNuevoPeso('')
    setSaving(false)
  }

  if (loading) return null

  const ultimo = historial[historial.length - 1]
  const anterior = historial[historial.length - 2]
  const cambio = ultimo && anterior ? +(ultimo.peso - anterior.peso).toFixed(1) : null

  // Generar puntos del gráfico SVG
  const W = 300, H = 70, PAD = 8
  let puntos: { x: number; y: number; peso: number; fecha: string }[] = []
  if (historial.length >= 2) {
    const pesos = historial.map(h => h.peso)
    const min = Math.min(...pesos)
    const max = Math.max(...pesos)
    const rango = max - min || 1
    puntos = historial.map((h, i) => ({
      x: PAD + (i / (historial.length - 1)) * (W - PAD * 2),
      y: H - PAD - ((h.peso - min) / rango) * (H - PAD * 2),
      peso: h.peso,
      fecha: h.fecha,
    }))
  }
  const pathD = puntos.length >= 2
    ? `M ${puntos.map(p => `${p.x},${p.y}`).join(' L ')}`
    : ''

  return (
    <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <div className="px-4 py-3.5 flex items-center justify-between">
        <div>
          <p className="font-heading text-sm font-bold">Peso</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-heading text-[22px] font-extrabold text-[#F07A30]">
              {ultimo ? ultimo.peso : pesoActual || '—'}
            </span>
            <span className="text-[13px] text-[#8A7560]">kg</span>
            {cambio !== null && cambio !== 0 && (
              <span className={`text-[11px] ml-1 ${cambio > 0 ? 'text-[#E05252]' : 'text-[#4CAF7D]'}`}>
                {cambio > 0 ? '+' : ''}{cambio} kg
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setModal(true)} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl">
          + Registrar
        </button>
      </div>

      {puntos.length >= 2 ? (
        <div className="px-4 pb-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 70, overflow: 'visible' }} preserveAspectRatio="none">
            <path d={pathD} fill="none" stroke="#F07A30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {puntos.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === puntos.length - 1 ? 4 : 3} fill="#F07A30" stroke={i === puntos.length - 1 ? '#FBEAD9' : 'none'} strokeWidth={i === puntos.length - 1 ? 2 : 0} />
            ))}
          </svg>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#8A7560]">{fmtCorta(historial[0].fecha)}</span>
            <span className="text-[10px] text-[#8A7560]">{fmtCorta(historial[historial.length - 1].fecha)}</span>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs text-[#8A7560]">
            {historial.length === 1 ? 'Registra un segundo peso para ver la tendencia.' : 'Registra el peso para empezar a ver su evolución.'}
          </p>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base">⚖️ Registrar peso</h2>
              <button onClick={() => setModal(false)} className="text-[#8A7560] text-xl">✕</button>
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Peso (kg)</label>
              <input
                type="number" step="0.1" autoFocus
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
                placeholder="ej. 16.2"
                value={nuevoPeso}
                onChange={e => setNuevoPeso(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha</label>
              <input
                type="date"
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
              />
            </div>
            <button onClick={guardar} disabled={saving || !nuevoPeso}
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar peso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
