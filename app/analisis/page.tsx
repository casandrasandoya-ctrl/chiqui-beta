'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

const ESTADO_COLOR: Record<string, string> = {
  verde: '#4CAF7D', amarillo: '#F5C842', naranjo: '#F07A30', rojo: '#E05252'
}

export default function AnalisisPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascota, setMascota] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(30)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: m } = await supabase.from('mascotas').select('*').limit(1).single()
      if (!m) { router.push('/mascota/nueva'); return }
      setMascota(m)
      const desde = new Date()
      desde.setDate(desde.getDate() - 30)
      const { data: r } = await supabase
        .from('registros_diarios').select('*')
        .eq('mascota_id', m.id)
        .gte('fecha', desde.toISOString().split('T')[0])
        .order('fecha', { ascending: false })
      setRegistros(r || [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>

  const total = registros.length
  const verdes = registros.filter(r => r.estado_dia === 'verde').length
  const amarillos = registros.filter(r => r.estado_dia === 'amarillo').length
  const naranjos = registros.filter(r => r.estado_dia === 'naranjo').length
  const rojos = registros.filter(r => r.estado_dia === 'rojo').length
  const pctBien = total > 0 ? Math.round((verdes / total) * 100) : 0

  // Frecuencia por categoría
  function contarValor(campo: string, valor: string) {
    return registros.filter(r => r[campo] === valor).length
  }
  function modaCampo(campo: string) {
    const vals: Record<string, number> = {}
    registros.forEach(r => { if (r[campo]) vals[r[campo]] = (vals[r[campo]] || 0) + 1 })
    const sorted = Object.entries(vals).sort((a, b) => b[1] - a[1])
    return sorted[0] ? { val: sorted[0][0], count: sorted[0][1] } : null
  }

  const insights = []
  if (total === 0) {
    insights.push({ icon: '🐶', text: `Aún no hay registros. Empieza a registrar las señales de ${mascota?.nombre} para ver tendencias aquí.`, tipo: 'info' })
  } else {
    if (pctBien >= 80) insights.push({ icon: '✅', text: `Energía y ánimo normales o positivos en el ${pctBien}% de los días registrados.`, tipo: 'good' })
    if (naranjos > 0 || rojos > 0) insights.push({ icon: '👁️', text: `Se detectaron ${naranjos + rojos} días con síntomas notables en los últimos ${periodo} días. Vale la pena observar.`, tipo: 'warn' })
    const modaEnerg = modaCampo('energia')
    if (modaEnerg) insights.push({ icon: '⚡', text: `La señal de energía más frecuente fue "${modaEnerg.val.replace(/_/g,' ')}" (${modaEnerg.count} de ${total} días).`, tipo: 'info' })
    const vomitos = contarValor('digestion', 'vomito')
    if (vomitos > 0) insights.push({ icon: '🤮', text: `Se registraron ${vomitos} episodios de vómito. Si se repiten, sería bueno comentarlo con el veterinario.`, tipo: 'warn' })
    const rascado = contarValor('pelaje', 'rasca')
    if (rascado >= 3) insights.push({ icon: '🐾', text: `Noté ${rascado} días con rascado registrado. Quizás sería bueno comentarlo en la próxima consulta veterinaria.`, tipo: 'warn' })
  }

  const ultimos7 = registros.slice(0, 7).reverse()

  return (
    <div className="min-h-screen pb-24 fade-in">

      <div className="px-5 pt-6 pb-3">
        <h1 className="font-heading text-xl font-extrabold">Análisis</h1>
        <p className="text-xs text-[#8A7560]">{mascota?.nombre} · últimos 30 días</p>
      </div>

      {/* Insights Chiqui */}
      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEE2D4]">
          <span className="text-lg">🐶</span>
          <div>
            <p className="text-sm font-bold">Lo que observé este mes</p>
            <p className="text-xs text-[#8A7560]">{total} registros</p>
          </div>
        </div>
        {insights.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#8A7560]">Cargando insights...</div>
        ) : (
          insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[#EEE2D4] last:border-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${ins.tipo === 'good' ? 'bg-[#4CAF7D]/15' : ins.tipo === 'warn' ? 'bg-[#F07A30]/15' : 'bg-[#4AABDB]/15'}`}>
                {ins.icon}
              </div>
              <p className="text-xs text-[#3D2B1F] leading-relaxed">{ins.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Resumen estadístico */}
      {total > 0 && <>
        <div className="px-5 mb-2">
          <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Resumen del período</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 mx-4 mb-4">
          {[
            { label: 'Total', val: total, color: '#3DD6B5' },
            { label: 'Verdes', val: verdes, color: '#4CAF7D' },
            { label: 'Leve', val: amarillos, color: '#F5C842' },
            { label: 'Síntoma', val: naranjos + rojos, color: '#F07A30' },
          ].map(s => (
            <div key={s.label} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3 text-center">
              <div className="font-bold text-lg" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] text-[#8A7560] uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Últimos 7 días visual */}
        <div className="px-5 mb-2">
          <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Últimos 7 días</h2>
        </div>
        <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
          <div className="flex items-end justify-between gap-1 h-16">
            {Array(7).fill(null).map((_, i) => {
              const reg = ultimos7[i]
              const color = reg ? ESTADO_COLOR[reg.estado_dia] : 'rgba(140,87,47,0.08)'
              const d = new Date(); d.setDate(d.getDate() - (6 - i))
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-lg transition-all" style={{ height: reg ? '100%' : '20%', background: color, minHeight: '8px' }}/>
                  <span className="text-[9px] text-[#8A7560]">{d.getDate()}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3">
            {Object.entries(ESTADO_COLOR).map(([e, c]) => (
              <div key={e} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: c }}/>
                <span className="text-[9px] text-[#8A7560] capitalize">{e}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Historial reciente */}
        <div className="px-5 mb-2">
          <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Registros recientes</h2>
        </div>
        <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          {registros.slice(0, 10).map(r => {
            const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
            const d = new Date(r.fecha + 'T00:00:00')
            const color = ESTADO_COLOR[r.estado_dia]
            const labels: Record<string,string> = { verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' }
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#EEE2D4] last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
                <div className="flex-1">
                  <p className="text-xs font-semibold">{d.getDate()} {MESES[d.getMonth()]}</p>
                  <p className="text-xs mt-0.5" style={{ color }}>{labels[r.estado_dia]}</p>
                  {r.nota && <p className="text-[10px] text-[#8A7560] mt-0.5 italic">{r.nota}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </>}

      {total === 0 && (
        <div className="mx-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-sm text-[#8A7560] mb-4">Empieza a registrar para ver tendencias y análisis aquí.</p>
          <a href="/registro-diario" className="bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-3 rounded-xl text-sm inline-block">
            Registrar hoy →
          </a>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
