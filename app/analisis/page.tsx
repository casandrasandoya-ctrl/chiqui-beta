'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
import { determinarMascotaActiva, guardarMascotaActivaId } from '@/utils/mascotaActiva'

const ESTADO_COLOR: Record<string, string> = {
  verde: '#4CAF7D', amarillo: '#F5C842', naranjo: '#F07A30', rojo: '#E05252'
}

export default function AnalisisPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascotas, setMascotas] = useState<any[]>([])
  const [mascota, setMascota] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(30)

  async function cargarRegistros(mascotaId: string) {
    const desde = new Date()
    desde.setDate(desde.getDate() - 30)
    const { data: r } = await supabase
      .from('registros_diarios').select('*')
      .eq('mascota_id', mascotaId)
      .gte('fecha', desde.toISOString().split('T')[0])
      .order('fecha', { ascending: false })
    setRegistros(r || [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: todasMascotas } = await supabase.from('mascotas').select('*').order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const m = determinarMascotaActiva(todasMascotas)!
      setMascota(m)
      await cargarRegistros(m.id)
      setLoading(false)
    }
    init()
  }, [])

  async function cambiarMascota(nueva: any) {
    setLoading(true)
    guardarMascotaActivaId(nueva.id)
    setMascota(nueva)
    await cargarRegistros(nueva.id)
    setLoading(false)
  }

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

  // --- Cálculos de Paseo (solo aplica a perros) ---
  // Mapeo de cada rango de duración a minutos estimados (punto medio del
  // rango), ya que el registro guarda un rango, no un numero exacto.
  const MINUTOS_POR_PASEO: Record<string, number> = {
    no_paseo: 0,
    '10_30min': 20,
    '30min_1h': 45,
    '1_2h': 90,
    '2_4h': 180,
  }

  const esPerro = mascota?.especie === 'Perro'

  // Minutos totales estimados de paseo en los ultimos 30 dias (todo el
  // periodo cargado).
  const minutosPaseoMes = registros.reduce((acc, r) => acc + (MINUTOS_POR_PASEO[r.paseo] || 0), 0)
  const horasPaseoMes = Math.floor(minutosPaseoMes / 60)
  const minRestantesPaseoMes = minutosPaseoMes % 60

  // Racha de dias CONSECUTIVOS paseados, contando hacia atras desde hoy.
  // Se corta apenas hay un dia sin registro o con "no_paseo".
  function calcularRachaPaseo(): number {
    let racha = 0
    const hoy = new Date()
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(fecha.getDate() - i)
      const fechaStr = fecha.toISOString().split('T')[0]
      const reg = registros.find(r => r.fecha === fechaStr)
      if (reg && reg.paseo && reg.paseo !== 'no_paseo') {
        racha++
      } else {
        break
      }
    }
    return racha
  }
  const rachaPaseo = calcularRachaPaseo()

  // Minutos de paseo por cada uno de los ultimos 7 dias, para el grafico.
  const paseoUltimos7 = Array(7).fill(null).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const fechaStr = d.toISOString().split('T')[0]
    const reg = registros.find(r => r.fecha === fechaStr)
    return { fecha: d, minutos: reg ? (MINUTOS_POR_PASEO[reg.paseo] || 0) : 0 }
  })
  const maxMinutosSemana = Math.max(...paseoUltimos7.map(p => p.minutos), 1)

  // --- Normalidad por categoría (últimos 30 días) ---
  // Para cada categoría, calcula el % de días donde el valor registrado
  // fue exactamente "normal", sobre el total de días donde esa
  // categoría SI tuvo algun valor (no sobre el total de registros, ya
  // que algunas categorias pueden quedar sin tocar algunos dias).
  const CATEGORIAS_NORMALIDAD = [
    { campo: 'energia', label: 'Energía', icon: '⚡' },
    { campo: 'animo', label: 'Ánimo', icon: '😄' },
    { campo: 'apetito', label: 'Apetito', icon: '🍽️' },
    { campo: 'agua', label: 'Agua', icon: '💧' },
    { campo: 'digestion', label: 'Digestión', icon: '🫃' },
    { campo: 'heces', label: 'Heces', icon: '💩' },
    { campo: 'arenero', label: esPerro ? 'Orina' : 'Arenero', icon: '🚽' },
    { campo: 'pelaje', label: 'Pelaje', icon: '✨' },
    { campo: 'conducta', label: 'Conducta', icon: '🧠' },
    { campo: 'movilidad', label: 'Movilidad', icon: '🦴' },
  ]

  const normalidadPorCategoria = CATEGORIAS_NORMALIDAD
    .map(cat => {
      const conValor = registros.filter(r => r[cat.campo])
      if (conValor.length === 0) return null
      const normales = conValor.filter(r => r[cat.campo] === 'normal').length
      const pct = Math.round((normales / conValor.length) * 100)
      return { ...cat, pct, dias: conValor.length }
    })
    .filter(Boolean) as { campo: string; label: string; icon: string; pct: number; dias: number }[]

  // Ordenado de mas irregular (pct mas bajo) a menos, para que lo que
  // merece mas atencion aparezca primero.
  normalidadPorCategoria.sort((a, b) => a.pct - b.pct)

  function colorNormalidad(pct: number): string {
    if (pct >= 80) return '#4CAF7D'
    if (pct >= 50) return '#F5C842'
    return '#E05252'
  }

  return (
    <div className="min-h-screen pb-24 fade-in">

      <div className="px-5 pt-6 pb-3 flex items-center gap-2.5">
        <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-9 h-9 object-contain" />
        <div>
          <h1 className="font-heading text-xl font-extrabold">Análisis</h1>
          <p className="text-xs text-[#8A7560]">{mascota?.nombre} · últimos 30 días</p>
        </div>
      </div>

      {/* Selector de mascota */}
      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}

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

        {/* Paseo (solo perros) */}
        {esPerro && (
          <>
            <div className="px-5 mb-2">
              <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Paseo</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mx-4 mb-3">
              <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🔥</span>
                  <span className="text-[10px] text-[#8A7560]">Racha de paseos</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{rachaPaseo} {rachaPaseo === 1 ? 'día' : 'días'}</div>
              </div>
              <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">⏱️</span>
                  <span className="text-[10px] text-[#8A7560]">Paseo este mes (estimado)</span>
                </div>
                <div className="font-bold text-lg text-[#3D2B1F]">{horasPaseoMes}h {minRestantesPaseoMes}m</div>
              </div>
            </div>

            <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
              <p className="text-xs font-semibold text-[#8A7560] mb-3">Paseo por día (últimos 7 días)</p>
              <div className="flex items-end justify-between gap-1.5 h-16">
                {paseoUltimos7.map((p, i) => {
                  const diasSemana = ['D','L','M','M','J','V','S']
                  const alturaPct = p.minutos > 0 ? Math.max((p.minutos / maxMinutosSemana) * 100, 8) : 4
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-lg transition-all"
                        style={{ height: `${alturaPct}%`, background: p.minutos > 0 ? '#FFBD59' : 'rgba(140,87,47,0.08)', minHeight: '4px' }}
                      />
                      <span className="text-[9px] text-[#8A7560]">{diasSemana[p.fecha.getDay()]}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-[#8A7560] mt-2 italic">Estimado a partir del rango de duración registrado cada día.</p>
            </div>
          </>
        )}

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

        {/* Normalidad por categoría */}
        {normalidadPorCategoria.length > 0 && (
          <>
            <div className="px-5 mb-2">
              <h2 className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Normalidad por categoría (30 días)</h2>
            </div>
            <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
              {normalidadPorCategoria.map((cat, i) => (
                <div key={cat.campo} className={`flex items-center gap-2.5 ${i < normalidadPorCategoria.length - 1 ? 'mb-2.5' : ''}`}>
                  <span className="text-sm flex-shrink-0 w-5">{cat.icon}</span>
                  <span className="text-xs text-[#3D2B1F] flex-1">{cat.label}</span>
                  <div className="w-20 h-1.5 bg-[#EEE2D4] rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: colorNormalidad(cat.pct) }} />
                  </div>
                  <span className="text-[11px] text-[#8A7560] w-9 text-right flex-shrink-0">{cat.pct}%</span>
                </div>
              ))}
              <p className="text-[10px] text-[#8A7560] mt-3 italic">% de días registrados como "Normal" en cada categoría.</p>
            </div>
          </>
        )}

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
