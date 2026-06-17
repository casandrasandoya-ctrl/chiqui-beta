'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

const ESTADO_COLOR: Record<string, string> = {
  verde: '#4CAF7D',
  amarillo: '#F5C842',
  naranjo: '#F07A30',
  rojo: '#E05252',
}
const ESTADO_BG: Record<string, string> = {
  verde: 'rgba(76,203,127,0.18)',
  amarillo: 'rgba(245,200,66,0.15)',
  naranjo: 'rgba(243,155,53,0.18)',
  rojo: 'rgba(226,93,93,0.18)',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['L','M','M','J','V','S','D']

export default function CalendarioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascota, setMascota] = useState<any>(null)
  const [registros, setRegistros] = useState<Record<string, any>>({})
  const [mes, setMes] = useState(new Date().getMonth())
  const [año, setAño] = useState(new Date().getFullYear())
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: m } = await supabase.from('mascotas').select('*').limit(1).single()
      if (!m) { router.push('/mascota/nueva'); return }
      setMascota(m)
      await cargarRegistros(m.id, mes, año)
      setLoading(false)
    }
    cargar()
  }, [])

  async function cargarRegistros(mascotaId: string, m: number, a: number) {
    const ultimoDia = new Date(a, m + 1, 0).getDate()
    const inicio = `${a}-${String(m + 1).padStart(2, '0')}-01`
    const fin = `${a}-${String(m + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    const { data } = await supabase
      .from('registros_diarios')
      .select('fecha, estado_dia, nota, energia, animo, apetito, agua, digestion, pelaje, conducta, movilidad')
      .eq('mascota_id', mascotaId)
      .gte('fecha', inicio)
      .lte('fecha', fin)
    const map: Record<string, any> = {}
    data?.forEach(r => { map[r.fecha] = r })
    setRegistros(map)
  }

  async function cambiarMes(dir: number) {
    let nm = mes + dir
    let na = año
    if (nm < 0) { nm = 11; na-- }
    if (nm > 11) { nm = 0; na++ }
    setMes(nm); setAño(na)
    if (mascota) await cargarRegistros(mascota.id, nm, na)
  }

  const diasEnMes = new Date(año, mes + 1, 0).getDate()
  const primerDia = (new Date(año, mes, 1).getDay() + 6) % 7 // lunes=0
  const hoy = new Date()
  const esHoy = (d: number) => d === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear()

  const fechaKey = (d: number) => `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const regDia = diaSeleccionado ? registros[fechaKey(diaSeleccionado)] : null

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>

  return (
    <div className="min-h-screen pb-24 fade-in">

      {/* Header mes */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-[#0F1117] z-10 border-b border-white/5">
        <button onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-full bg-[#232840] flex items-center justify-center text-lg">‹</button>
        <div className="text-center">
          <h1 className="font-heading text-base font-extrabold">{MESES[mes]} {año}</h1>
          <p className="text-xs text-[#8A8FA8]">{mascota?.nombre}</p>
        </div>
        <button onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-full bg-[#232840] flex items-center justify-center text-lg">›</button>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 px-5 py-2 overflow-x-auto scrollbar-none">
        {[['verde','Todo bien'],['amarillo','Leve'],['naranjo','Síntoma'],['rojo','Alerta']].map(([e,l]) => (
          <div key={e} className="flex items-center gap-1.5 text-xs text-[#8A8FA8] whitespace-nowrap">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADO_COLOR[e] }}/>
            {l}
          </div>
        ))}
      </div>

      {/* Días semana */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-[#8A8FA8] py-1">{d}</div>
        ))}
      </div>

      {/* Grid días */}
      <div className="grid grid-cols-7 gap-1 px-3">
        {Array(primerDia).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array(diasEnMes).fill(null).map((_, i) => {
          const d = i + 1
          const key = fechaKey(d)
          const reg = registros[key]
          const esFuturo = new Date(año, mes, d) > hoy
          const seleccionado = diaSeleccionado === d

          return (
            <button
              key={d}
              onClick={() => setDiaSeleccionado(seleccionado ? null : d)}
              disabled={esFuturo}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative"
              style={{
                background: seleccionado ? 'rgba(255,255,255,0.15)' : reg ? ESTADO_BG[reg.estado_dia] : 'rgba(255,255,255,0.04)',
                border: esHoy(d) ? '1.5px solid #E8A84C' : seleccionado ? '1.5px solid white' : '1px solid transparent',
                opacity: esFuturo ? 0.25 : 1,
              }}
            >
              <span className="text-sm font-bold leading-none" style={{ color: reg ? ESTADO_COLOR[reg.estado_dia] : esHoy(d) ? '#E8A84C' : '#8A8FA8' }}>
                {d}
              </span>
              {reg?.nota && <div className="w-1 h-1 rounded-full bg-[#E8A84C]"/>}
            </button>
          )
        })}
      </div>

      {/* Panel día seleccionado */}
      {diaSeleccionado && (
        <div className="mx-4 mt-4 bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{diaSeleccionado} de {MESES[mes]}</p>
              {regDia && (
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: `${ESTADO_COLOR[regDia.estado_dia]}20`, color: ESTADO_COLOR[regDia.estado_dia] }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_COLOR[regDia.estado_dia] }}/>
                  {({ verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' } as Record<string,string>)[regDia.estado_dia]}
                </div>
              )}
            </div>
            <button onClick={() => setDiaSeleccionado(null)} className="text-[#8A8FA8] text-lg w-7 h-7 flex items-center justify-center">✕</button>
          </div>

          {regDia ? (
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  ['⚡','Energía',regDia.energia],
                  ['😄','Ánimo',regDia.animo],
                  ['🍽️','Apetito',regDia.apetito],
                  ['💧','Agua',regDia.agua],
                  ['🫃','Digestión',regDia.digestion],
                  ['✨','Pelaje',regDia.pelaje],
                  ['🧠','Conducta',regDia.conducta],
                  ['🦴','Movilidad',regDia.movilidad],
                ].map(([icon, label, val]) => val && (
                  <div key={label as string} className="bg-[#1E2333] rounded-xl p-2 text-center">
                    <div className="text-lg">{icon}</div>
                    <div className="text-[9px] text-[#8A8FA8] mt-0.5">{label}</div>
                    <div className="text-[10px] text-[#F0EEE8] font-semibold mt-0.5 leading-tight">{(val as string).replace(/_/g,' ')}</div>
                  </div>
                ))}
              </div>
              {regDia.nota && (
                <div className="bg-[#1E2333] rounded-xl p-3 text-xs text-[#8A8FA8] italic">
                  📝 {regDia.nota}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-[#8A8FA8] mb-3">Sin registro para este día</p>
              <Link href={`/registro-diario?fecha=${fechaKey(diaSeleccionado)}`} className="bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm inline-block">
                Registrar este día →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Resumen mes */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Registros', val: Object.keys(registros).length, color: '#3DD6B5' },
          { label: 'Días verdes', val: Object.values(registros).filter((r: any) => r.estado_dia === 'verde').length, color: '#4CAF7D' },
          { label: 'Con síntoma', val: Object.values(registros).filter((r: any) => ['naranjo','rojo'].includes(r.estado_dia)).length, color: '#F07A30' },
        ].map(item => (
          <div key={item.label} className="bg-[#232840] rounded-2xl border border-white/8 p-3 text-center">
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[10px] text-[#8A8FA8] mt-0.5 uppercase tracking-wider">{item.label}</div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
