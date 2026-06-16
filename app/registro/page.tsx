'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

interface Opcion { value: string; emoji: string; label: string; hasDetail?: boolean }
interface Categoria {
  id: string; nombre: string; icon: string; color: string
  opciones: Opcion[]
  detalle?: { titulo: string; opciones: Opcion[] }
}

const CATS: Categoria[] = [
  { id:'energia', nombre:'Energía', icon:'⚡', color:'#F5C842',
    opciones:[{value:'muy_alta',emoji:'⚡⚡',label:'Muy alta'},{value:'alta',emoji:'⚡',label:'Alta'},{value:'normal',emoji:'😊',label:'Normal'},{value:'baja',emoji:'😴',label:'Baja'},{value:'muy_baja',emoji:'🛌',label:'Muy baja'},{value:'decaido',emoji:'😟',label:'Decaído'}] },
  { id:'animo', nombre:'Ánimo', icon:'😄', color:'#E3A84A',
    opciones:[{value:'muy_feliz',emoji:'🥳',label:'Muy feliz'},{value:'feliz',emoji:'😄',label:'Feliz'},{value:'normal',emoji:'😐',label:'Normal'},{value:'ansioso',emoji:'😰',label:'Ansioso'},{value:'triste',emoji:'😢',label:'Triste'},{value:'irritable',emoji:'😤',label:'Irritable'}] },
  { id:'apetito', nombre:'Apetito', icon:'🍽️', color:'#3DD6B5',
    opciones:[{value:'mas',emoji:'😋',label:'Comió más'},{value:'normal',emoji:'✅',label:'Normal'},{value:'menos',emoji:'🍽️',label:'Comió menos'},{value:'nada',emoji:'❌',label:'No comió',hasDetail:true}],
    detalle:{titulo:'¿Cuántas comidas saltó?',opciones:[{value:'una',emoji:'1️⃣',label:'Una'},{value:'dos',emoji:'2️⃣',label:'Dos'},{value:'todo',emoji:'🚫',label:'Todo el día'}]} },
  { id:'agua', nombre:'Agua', icon:'💧', color:'#4AABDB',
    opciones:[{value:'mas',emoji:'💧💧',label:'Más de lo normal',hasDetail:true},{value:'normal',emoji:'💧',label:'Normal'},{value:'menos',emoji:'🏜️',label:'Menos'},{value:'nada',emoji:'⚠️',label:'No tomó',hasDetail:true}],
    detalle:{titulo:'¿Cuándo notaste el cambio?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓️',label:'Hace semanas'}]} },
  { id:'digestion', nombre:'Digestión', icon:'🫃', color:'#F39B35',
    opciones:[{value:'normal',emoji:'✅',label:'Normal'},{value:'gases',emoji:'💨',label:'Gases'},{value:'nauseas',emoji:'🤢',label:'Náuseas'},{value:'vomito',emoji:'🤮',label:'Vómito',hasDetail:true},{value:'diarrea',emoji:'💩',label:'Diarrea',hasDetail:true},{value:'estrenimiento',emoji:'😬',label:'Estreñimiento'}],
    detalle:{titulo:'¿Qué observaste?',opciones:[{value:'espuma',emoji:'🫧',label:'Espuma'},{value:'bilis',emoji:'🟡',label:'Bilis'},{value:'pasto',emoji:'🌿',label:'Pasto'},{value:'sangre',emoji:'🔴',label:'Con sangre'},{value:'blandas',emoji:'🟤',label:'Heces blandas'},{value:'liquidas',emoji:'💧',label:'Heces líquidas'}]} },
  { id:'pelaje', nombre:'Pelaje y piel', icon:'✨', color:'#4CCB7F',
    opciones:[{value:'brillante',emoji:'✨',label:'Brillante'},{value:'normal',emoji:'😊',label:'Normal'},{value:'opaco',emoji:'😐',label:'Opaco'},{value:'caida_leve',emoji:'🍂',label:'Caída leve'},{value:'caida_excesiva',emoji:'🍂🍂',label:'Caída excesiva',hasDetail:true},{value:'rasca',emoji:'🐾',label:'Se rasca',hasDetail:true}],
    detalle:{titulo:'¿Dónde?',opciones:[{value:'orejas',emoji:'👂',label:'Orejas'},{value:'patas',emoji:'🐾',label:'Patas'},{value:'barriga',emoji:'🫃',label:'Barriga'},{value:'lomo',emoji:'🐕',label:'Lomo'},{value:'cara',emoji:'🐶',label:'Cara'},{value:'general',emoji:'🔄',label:'General'}]} },
  { id:'conducta', nombre:'Conducta', icon:'🧠', color:'#E25D5D',
    opciones:[{value:'normal',emoji:'😊',label:'Normal'},{value:'sociable',emoji:'🤩',label:'Muy sociable'},{value:'ansioso',emoji:'😰',label:'Ansioso',hasDetail:true},{value:'temeroso',emoji:'😨',label:'Temeroso',hasDetail:true},{value:'reactivo',emoji:'⚡',label:'Reactivo',hasDetail:true}],
    detalle:{titulo:'¿Ante qué?',opciones:[{value:'perros',emoji:'🐕',label:'Perros'},{value:'personas',emoji:'🧍',label:'Personas'},{value:'ruidos',emoji:'🔊',label:'Ruidos'},{value:'solo',emoji:'🏠',label:'Solo en casa'}]} },
  { id:'movilidad', nombre:'Movilidad', icon:'🦴', color:'#8A8FA8',
    opciones:[{value:'normal',emoji:'🏃',label:'Normal'},{value:'rigidez',emoji:'🦾',label:'Rigidez'},{value:'cojera_leve',emoji:'🩹',label:'Cojera leve',hasDetail:true},{value:'cojera_marcada',emoji:'🚨',label:'Cojera marcada',hasDetail:true},{value:'costo_levantarse',emoji:'😓',label:'Le costó levantarse'}],
    detalle:{titulo:'¿Qué pata o zona?',opciones:[{value:'del_izq',emoji:'↖️',label:'Del. izq'},{value:'del_der',emoji:'↗️',label:'Del. der'},{value:'tras_izq',emoji:'↙️',label:'Tras. izq'},{value:'tras_der',emoji:'↘️',label:'Tras. der'},{value:'columna',emoji:'🦴',label:'Columna'}]} },
]

function calcEstado(sel: Record<string,string>): string {
  const vals = Object.values(sel)
  const alertas = ['vomito','diarrea','nada','muy_baja','decaido','cojera_marcada','sangre','liquidas']
  const observar = ['menos','gases','nauseas','baja','ansioso','temeroso','cojera_leve','caida_excesiva','rasca','triste','irritable','rigidez','opaco']
  if (vals.some(v => alertas.includes(v))) return 'naranjo'
  if (vals.some(v => observar.includes(v))) return 'amarillo'
  return 'verde'
}

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascotaId, setMascotaId] = useState('')
  const [mascotaNombre, setMascotaNombre] = useState('')
  const [sel, setSel] = useState<Record<string,string>>({})
  const [det, setDet] = useState<Record<string,string>>({})
  const [nota, setNota] = useState('')
  const [abierto, setAbierto] = useState('energia')
  const [fechaRegistro, setFechaRegistro] = useState(new Date(new Date().toLocaleString('en-US',{timeZone:'America/Santiago'})).toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [yaRegistro, setYaRegistro] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: m } = await supabase.from('mascotas').select('id,nombre').limit(1).single()
      if (!m) { router.push('/mascota/nueva'); return }
      setMascotaId(m.id)
      setMascotaNombre(m.nombre)
      const hoy = new Date(new Date().toLocaleString('en-US', {timeZone:'America/Santiago'})).toISOString().split('T')[0]
      const { data: r } = await supabase.from('registros_diarios').select('id').eq('mascota_id', m.id).eq('fecha', hoy).single()
      if (r) setYaRegistro(true)
      setCargando(false)
    }
    init()
  }, [])

  async function guardar() {
    if (!Object.keys(sel).length) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const hoy = new Date(new Date().toLocaleString('en-US', {timeZone:'America/Santiago'})).toISOString().split('T')[0]
    await supabase.from('registros_diarios').upsert({
      mascota_id: mascotaId, user_id: user.id, fecha: fechaRegistro,
      estado_dia: calcEstado(sel), nota: nota || null,
      energia: sel.energia || null, animo: sel.animo || null,
      apetito: sel.apetito || null, apetito_detalle: det.apetito || null,
      agua: sel.agua || null, agua_detalle: det.agua || null,
      digestion: sel.digestion || null, digestion_detalle: det.digestion || null,
      pelaje: sel.pelaje || null, pelaje_detalle: det.pelaje || null,
      conducta: sel.conducta || null, conducta_detalle: det.conducta || null,
      movilidad: sel.movilidad || null, movilidad_detalle: det.movilidad || null,
    }, { onConflict: 'mascota_id,fecha' })
    router.push('/dashboard')
    router.refresh()
  }

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>

  if (yaRegistro) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center pb-24">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-bold mb-2">Ya registraste hoy</h2>
      <p className="text-[#8A8FA8] text-sm mb-8">El registro de {mascotaNombre} para hoy ya está guardado.</p>
      <button onClick={() => router.push('/dashboard')} className="bg-[#E3A84A] text-[#1A1200] font-bold px-8 py-4 rounded-xl">
        Ir al inicio →
      </button>
      <BottomNav />
    </div>
  )

  const completadas = Object.keys(sel).length

  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 sticky top-0 bg-[#0B1020] z-10 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-[#8A8FA8]">{new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</p>
            <h1 className="text-base font-bold">¿Cómo estuvo {mascotaNombre}?</h1>
              <input type="date" value={fechaRegistro} onChange={e => setFechaRegistro(e.target.value)} className="text-xs bg-[#1E2848] border border-white/10 rounded-lg px-2 py-1 text-[#E3A84A] mt-1"/>
          </div>
          <button onClick={guardar} disabled={loading || !completadas}
            className="bg-[#E3A84A] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40">
            {loading ? '...' : 'Guardar'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#3DD6B5] rounded-full transition-all" style={{width:`${(completadas/CATS.length)*100}%`}}/>
          </div>
          <span className="text-xs text-[#8A8FA8]">{completadas}/{CATS.length}</span>
        </div>
      </div>

      <div className="mx-4 mt-3 mb-1 bg-[#1B2340] border border-[#3DD6B5]/15 rounded-xl p-3 flex gap-2.5">
        <span className="text-lg flex-shrink-0">🐶</span>
        <p className="text-xs text-[#F0EEE8] leading-relaxed">
          Toca las categorías que apliquen hoy. Si algo fue distinto, aparecerán más opciones. No necesitas registrar todo.
        </p>
      </div>

      <div className="space-y-0 mt-2">
        {CATS.map(cat => {
          const selVal = sel[cat.id]
          const opSel = cat.opciones.find(o => o.value === selVal)
          const open = abierto === cat.id
          return (
            <div key={cat.id} className="mx-4">
              <button onClick={() => setAbierto(open ? '' : cat.id)} className="w-full flex items-center gap-3 py-3 text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{background:`${cat.color}20`}}>
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{cat.nombre}</p>
                  {selVal && (
                    <p className="text-xs mt-0.5" style={{color:cat.color}}>
                      {opSel?.emoji} {opSel?.label}{det[cat.id] ? ` · ${det[cat.id]}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-[#8A8FA8] text-sm">{open ? '▾' : '›'}</span>
              </button>

              {open && (
                <div className="pb-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {cat.opciones.map(op => (
                      <button key={op.value}
                        onClick={() => {
                          setSel(p => {
                            if (p[cat.id] === op.value) { const n={...p}; delete n[cat.id]; return n }
                            return {...p, [cat.id]: op.value}
                          })
                          if (!op.hasDetail) setDet(p => { const n={...p}; delete n[cat.id]; return n })
                        }}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
                        style={selVal===op.value ? {borderColor:cat.color,background:`${cat.color}15`,borderWidth:'1.5px'} : {background:'#1E2848',borderColor:'rgba(255,255,255,0.1)'}}>
                        <span className="text-xl">{op.emoji}</span>
                        <span className="text-[10px] text-[#8A8FA8] leading-tight text-center">{op.label}</span>
                      </button>
                    ))}
                  </div>
                  {selVal && opSel?.hasDetail && cat.detalle && (
                    <div className="bg-[#1B2340] rounded-xl p-3 border border-white/8">
                      <p className="text-xs text-[#8A8FA8] uppercase tracking-wider font-semibold mb-2">{cat.detalle.titulo}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {cat.detalle.opciones.map(op => (
                          <button key={op.value}
                            onClick={() => setDet(p => ({...p, [cat.id]: p[cat.id]===op.value ? '' : op.value}))}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all"
                            style={det[cat.id]===op.value ? {borderColor:'#F39B35',background:'#F39B3515'} : {background:'#1E2848',borderColor:'rgba(255,255,255,0.1)'}}>
                            <span className="text-base">{op.emoji}</span>
                            <span className="text-[10px] text-[#8A8FA8] leading-tight text-center">{op.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="h-px bg-white/5"/>
            </div>
          )
        })}
      </div>

      <div className="mx-4 mt-4">
        <label className="text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2 block">
          Nota del día · opcional
        </label>
        <textarea value={nota} onChange={e => setNota(e.target.value)}
          placeholder="¿Algo que quieras recordar de hoy?" rows={3}
          className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none resize-none"/>
      </div>

      <div className="mx-4 mt-4">
        <button onClick={guardar} disabled={loading || !completadas}
          className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">
          {loading ? 'Guardando...' : 'Guardar registro de hoy ✓'}
        </button>
        {!completadas && <p className="text-center text-xs text-[#8A8FA8] mt-2">Selecciona al menos una categoría para guardar</p>}
      </div>

      <BottomNav />
    </div>
  )
}
