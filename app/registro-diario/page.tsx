'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

interface DetalleSub { titulo: string; opciones: { value: string; emoji: string; label: string }[] }
interface Opcion { value: string; emoji: string; label: string; detalle?: DetalleSub[] }
interface Categoria {
  id: string; nombre: string; icon: string; color: string
  opciones: Opcion[]
}

// Construye las categorías de registro diario según la especie de la mascota.
// 'Perro' es el set base; cuando especie === 'Gato' se ajustan ciertas
// categorías (Pelaje, Conducta, Digestion) para reflejar señales felinas
// reales, y se agrega siempre (para ambas especies) la categoría Arenero.
function getCategorias(especie: string): Categoria[] {
  const esGato = especie === 'Gato'

  const energia: Categoria = { id:'energia', nombre:'Energía', icon:'⚡', color:'#F5C842',
    opciones:[
      {value:'muy_alta',emoji:'⚡⚡',label:'Muy alta'},
      {value:'alta',emoji:'⚡',label:'Alta'},
      {value:'normal',emoji:'😊',label:'Normal'},
      {value:'baja',emoji:'😴',label:'Baja'},
      {value:'muy_baja',emoji:'🛌',label:'Muy baja'},
      {value:'decaido',emoji:'😟',label:'Decaído'},
    ]}

  const animo: Categoria = { id:'animo', nombre:'Ánimo', icon:'😄', color:'#E8A84C',
    opciones:[
      {value:'muy_feliz',emoji:'🥳',label:'Muy feliz'},
      {value:'feliz',emoji:'😄',label:'Feliz'},
      {value:'normal',emoji:'😐',label:'Normal'},
      {value:'ansioso',emoji:'😰',label:'Ansioso'},
      {value:'triste',emoji:'😢',label:'Triste'},
      {value:'irritable',emoji:'😤',label:'Irritable'},
    ]}

  const apetito: Categoria = { id:'apetito', nombre:'Apetito', icon:'🍽️', color:'#3DD6B5',
    opciones:[
      {value:'mas',emoji:'😋',label:'Comió más'},
      {value:'normal',emoji:'✅',label:'Normal'},
      {value:'menos',emoji:'🍽️',label:'Comió menos'},
      {value:'nada',emoji:'❌',label:'No comió',detalle:[
        {titulo:'¿Cuántas comidas saltó?',opciones:[{value:'una',emoji:'1️⃣',label:'Una'},{value:'dos',emoji:'2️⃣',label:'Dos'},{value:'todo',emoji:'🚫',label:'Todo el día'}]}
      ]},
    ]}

  const agua: Categoria = { id:'agua', nombre:'Agua', icon:'💧', color:'#4AABDB',
    opciones:[
      {value:'mas',emoji:'💧💧',label:'Más de lo normal',detalle:[
        {titulo:'¿Cuándo notaste el cambio?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓️',label:'Hace semanas'}]}
      ]},
      {value:'normal',emoji:'💧',label:'Normal'},
      {value:'menos',emoji:'🏜️',label:'Menos'},
      {value:'nada',emoji:'⚠️',label:'No tomó',detalle:[
        {titulo:'¿Cuándo notaste el cambio?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓️',label:'Hace semanas'}]}
      ]},
    ]}

  // Digestión: el único cambio por especie es agregar "Bola de pelo" como
  // tipo de vómito en gato, ya que es un tipo de vómito normal/frecuente
  // en felinos que no existe en perro.
  const tiposVomito = [
    {value:'espuma',emoji:'🫧',label:'Espuma'},
    {value:'bilis',emoji:'🟡',label:'Bilis'},
    {value:'comida',emoji:'🍖',label:'Comida'},
    ...(esGato
      ? [{value:'bola_pelo',emoji:'🧶',label:'Bola de pelo'}]
      : [{value:'pasto',emoji:'🌿',label:'Pasto'}]),
    {value:'sangre_vomito',emoji:'🔴',label:'Con sangre'},
    {value:'otro_vomito',emoji:'❓',label:'Otro'},
  ]

  const digestion: Categoria = { id:'digestion', nombre:'Digestión', icon:'🫃', color:'#F07A30',
    opciones:[
      {value:'normal',emoji:'✅',label:'Normal'},
      {value:'gases',emoji:'💨',label:'Gases'},
      {value:'nauseas',emoji:'🤢',label:'Náuseas'},
      {value:'vomito',emoji:'🤮',label:'Vómito',detalle:[
        {titulo:'¿Qué tipo de vómito?',opciones:tiposVomito},
        {titulo:'¿Cuántas veces?',opciones:[
          {value:'1_vez',emoji:'1️⃣',label:'1 vez'},
          {value:'2_veces',emoji:'2️⃣',label:'2 veces'},
          {value:'3_mas_veces',emoji:'⚠️',label:'+3 veces'},
        ]},
      ]},
      {value:'diarrea',emoji:'💩',label:'Diarrea',detalle:[
        {titulo:'¿Cómo fueron las heces?',opciones:[
          {value:'blandas',emoji:'🟤',label:'Blandas'},
          {value:'liquidas',emoji:'💧',label:'Líquidas'},
          {value:'sangre_heces',emoji:'🔴',label:'Con sangre'},
          {value:'mucosidad',emoji:'🫧',label:'Con mucosidad'},
          {value:'muy_oscuras',emoji:'⚫',label:'Muy oscuras'},
          {value:'muy_claras',emoji:'⬜',label:'Muy claras'},
        ]},
      ]},
      {value:'estrenimiento',emoji:'😬',label:'Estreñimiento'},
    ]}

  // Arenero / Eliminación urinaria: categoría nueva, para AMBAS especies.
  // Es la señal más crítica que faltaba — en gato puede indicar una
  // obstrucción urinaria (emergencia real); en perro puede indicar
  // problemas renales, de próstata o infección urinaria.
  const arenero: Categoria = { id:'arenero', nombre: esGato ? 'Arenero' : 'Orina', icon:'🚽', color:'#8A6FD8',
    opciones:[
      {value:'normal',emoji:'✅',label:'Normal'},
      {value:'mas_orina',emoji:'💦',label:'Orinó más',detalle:[
        {titulo:'¿Desde cuándo?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓️',label:'Hace semanas'}]}
      ]},
      {value:'menos_costo',emoji:'😣',label: esGato ? 'Le costó / poca cantidad' : 'Le costó orinar',detalle:[
        {titulo:'¿Notaste sangre?',opciones:[{value:'si_sangre',emoji:'🔴',label:'Sí'},{value:'no_sangre',emoji:'⬜',label:'No'}]}
      ]},
      ...(esGato ? [{value:'fuera_arenero',emoji:'⚠️',label:'Fuera del arenero'} as Opcion] : [{value:'fuera_lugar',emoji:'⚠️',label:'Ensució dentro de casa'} as Opcion]),
      {value:'con_sangre',emoji:'🆘',label:'Con sangre'},
      {value:'no_orino',emoji:'🚨',label:'No orinó en todo el día'},
    ]}

  const tiposZonaCuerpo = [{value:'orejas',emoji:'👂',label:'Orejas'},{value:'patas',emoji:'🐾',label:'Patas'},{value:'barriga',emoji:'🫃',label:'Barriga'},{value:'lomo',emoji:'🐕',label:'Lomo'},{value:'cara',emoji:'🐶',label:'Cara'},{value:'general',emoji:'🔄',label:'General'}]

  // Pelaje y piel: en gato separamos "se lame en exceso" (acicalamiento
  // compulsivo, señal de estrés o dolor) de "se rasca" (más asociado a
  // picazón/parásitos), porque son conductas distintas y ambas relevantes.
  const pelajeOpciones: Opcion[] = [
    {value:'brillante',emoji:'✨',label:'Brillante'},
    {value:'normal',emoji:'😊',label:'Normal'},
    {value:'opaco',emoji:'😐',label:'Opaco'},
    {value:'caida_leve',emoji:'🍂',label:'Caída leve'},
    {value:'caida_excesiva',emoji:'🍂🍂',label:'Caída excesiva',detalle:[{titulo:'¿Dónde?',opciones:tiposZonaCuerpo}]},
    {value:'rasca',emoji:'🐾',label:'Se rasca',detalle:[{titulo:'¿Dónde?',opciones:tiposZonaCuerpo}]},
  ]
  if (esGato) {
    pelajeOpciones.push({value:'lame_exceso',emoji:'👅',label:'Se lame en exceso',detalle:[{titulo:'¿Dónde?',opciones:tiposZonaCuerpo}]})
  }
  const pelaje: Categoria = { id:'pelaje', nombre:'Pelaje y piel', icon:'✨', color:'#4CAF7D', opciones: pelajeOpciones }

  // Conducta: en gato, las causas de ansiedad/miedo cambian ("Otros gatos"
  // y "Visitas" en vez de "Perros"), y agregamos "Se esconde / se aísla",
  // la señal de malestar felino más citada y que antes no existía.
  const causasConducta = esGato
    ? [{value:'otros_gatos',emoji:'🐈',label:'Otros gatos'},{value:'personas',emoji:'🧍',label:'Personas'},{value:'ruidos',emoji:'🔊',label:'Ruidos'},{value:'visitas',emoji:'🚪',label:'Visitas en casa'},{value:'solo',emoji:'🏠',label:'Solo en casa'}]
    : [{value:'perros',emoji:'🐕',label:'Perros'},{value:'personas',emoji:'🧍',label:'Personas'},{value:'ruidos',emoji:'🔊',label:'Ruidos'},{value:'solo',emoji:'🏠',label:'Solo en casa'}]

  const conductaOpciones: Opcion[] = [
    {value:'normal',emoji:'😊',label:'Normal'},
    {value:'sociable',emoji:'🤩',label:'Muy sociable'},
    {value:'ansioso',emoji:'😰',label:'Ansioso',detalle:[{titulo:'¿Ante qué?',opciones:causasConducta}]},
    {value:'temeroso',emoji:'😨',label:'Temeroso',detalle:[{titulo:'¿Ante qué?',opciones:causasConducta}]},
    {value:'reactivo',emoji:'⚡',label:'Reactivo',detalle:[{titulo:'¿Ante qué?',opciones:causasConducta}]},
  ]
  if (esGato) {
    conductaOpciones.push({value:'esconde',emoji:'🙈',label:'Se esconde / se aísla',detalle:[
      {titulo:'¿Dónde se esconde?',opciones:[{value:'bajo_cama',emoji:'🛏️',label:'Bajo la cama'},{value:'closet',emoji:'🚪',label:'Closet / mueble'},{value:'lugar_alto',emoji:'🔼',label:'Lugar alto'},{value:'otro_lugar',emoji:'❓',label:'Otro lugar'}]}
    ]})
  }
  const conducta: Categoria = { id:'conducta', nombre:'Conducta', icon:'🧠', color:'#E05252', opciones: conductaOpciones }

  const movilidad: Categoria = { id:'movilidad', nombre:'Movilidad', icon:'🦴', color:'#8A8FA8',
    opciones:[
      {value:'normal',emoji:'🏃',label:'Normal'},
      {value:'rigidez',emoji:'🦾',label:'Rigidez'},
      {value:'cojera_leve',emoji:'🩹',label:'Cojera leve',detalle:[
        {titulo:'¿Qué pata o zona?',opciones:[{value:'del_izq',emoji:'↖️',label:'Del. izq'},{value:'del_der',emoji:'↗️',label:'Del. der'},{value:'tras_izq',emoji:'↙️',label:'Tras. izq'},{value:'tras_der',emoji:'↘️',label:'Tras. der'},{value:'columna',emoji:'🦴',label:'Columna'}]}
      ]},
      {value:'cojera_marcada',emoji:'🚨',label:'Cojera marcada',detalle:[
        {titulo:'¿Qué pata o zona?',opciones:[{value:'del_izq',emoji:'↖️',label:'Del. izq'},{value:'del_der',emoji:'↗️',label:'Del. der'},{value:'tras_izq',emoji:'↙️',label:'Tras. izq'},{value:'tras_der',emoji:'↘️',label:'Tras. der'},{value:'columna',emoji:'🦴',label:'Columna'}]}
      ]},
      {value:'costo_levantarse',emoji:'😓',label:'Le costó levantarse'},
    ]}

  return [energia, animo, apetito, agua, digestion, arenero, pelaje, conducta, movilidad]
}

function calcEstado(sel: Record<string,string>): string {
  const vals = Object.values(sel)
  const alertas = ['vomito','diarrea','nada','muy_baja','decaido','cojera_marcada','con_sangre','no_orino']
  const observar = ['menos','gases','nauseas','baja','ansioso','temeroso','cojera_leve','caida_excesiva','rasca','triste','irritable','rigidez','opaco','mas_orina','menos_costo','fuera_arenero','fuera_lugar','esconde','lame_exceso']
  if (vals.some(v => alertas.includes(v))) return 'naranjo'
  if (vals.some(v => observar.includes(v))) return 'amarillo'
  return 'verde'
}

function RegistroContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fechaUrl = searchParams.get('fecha')
  const supabase = createClient()
  const [mascotaId, setMascotaId] = useState('')
  const [mascotaNombre, setMascotaNombre] = useState('')
  const [especie, setEspecie] = useState('')
  const [sel, setSel] = useState<Record<string,string>>({})
  const [det, setDet] = useState<Record<string,string[]>>({})
  const [fechaRegistro, setFechaRegistro] = useState('')
  const [nota, setNota] = useState('')
  const [abierto, setAbierto] = useState('energia')
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [yaRegistro, setYaRegistro] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: m } = await supabase.from('mascotas').select('id,nombre,especie').limit(1).single()
      if (!m) { router.push('/mascota/nueva'); return }
      setMascotaId(m.id)
      setMascotaNombre(m.nombre)
      setEspecie(m.especie || '')
      const hoy = fechaUrl || new Date(new Date().toLocaleString('en-US',{timeZone:'America/Santiago'})).toISOString().split('T')[0]
      setFechaRegistro(hoy)
      const { data: r } = await supabase.from('registros_diarios').select('id').eq('mascota_id', m.id).eq('fecha', hoy).single()
      if (r) setYaRegistro(true)
      setCargando(false)
    }
    init()
  }, [fechaUrl])

  const CATS = getCategorias(especie)

  async function guardar() {
    if (!Object.keys(sel).length) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('registros_diarios').upsert({
      mascota_id: mascotaId, user_id: user.id, fecha: fechaRegistro,
      estado_dia: calcEstado(sel), nota: nota || null,
      energia: sel.energia || null, animo: sel.animo || null,
      apetito: sel.apetito || null, apetito_detalle: det.apetito?.join(', ') || null,
      agua: sel.agua || null, agua_detalle: det.agua?.join(', ') || null,
      digestion: sel.digestion || null, digestion_detalle: det.digestion?.join(', ') || null,
      arenero: sel.arenero || null, arenero_detalle: det.arenero?.join(', ') || null,
      pelaje: sel.pelaje || null, pelaje_detalle: det.pelaje?.join(', ') || null,
      conducta: sel.conducta || null, conducta_detalle: det.conducta?.join(', ') || null,
      movilidad: sel.movilidad || null, movilidad_detalle: det.movilidad?.join(', ') || null,
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
      <button onClick={() => router.push('/dashboard')} className="bg-[#E8A84C] text-[#1A1200] font-bold px-8 py-4 rounded-xl">
        Ir al inicio →
      </button>
      <BottomNav />
    </div>
  )

  const completadas = Object.keys(sel).length

  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 sticky top-0 bg-[#0F1117] z-10 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[#232840] flex items-center justify-center text-lg flex-shrink-0">←</button>
          <div className="flex-1">
            <p className="text-xs text-[#8A8FA8] capitalize">{fechaRegistro && new Date(fechaRegistro + 'T00:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</p>
            <h1 className="font-heading text-base font-extrabold">¿Cómo estuvo {mascotaNombre}?</h1>
          </div>
          <button onClick={guardar} disabled={loading || !completadas}
            className="bg-[#E8A84C] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 flex-shrink-0">
            {loading ? '...' : 'Guardar'}
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1 bg-[#1E2333] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{width:`${(completadas/CATS.length)*100}%`, background: 'linear-gradient(90deg, #3DD6B5, #4CAF7D)'}}/>
          </div>
          <span className="text-[11px] text-[#8A8FA8] whitespace-nowrap">{completadas}/{CATS.length}</span>
        </div>
      </div>

      <div className="mx-4 mt-3 mb-1 bg-[#1E2333] border border-[#3DD6B5]/15 rounded-xl p-3 flex gap-2.5">
        <span className="text-lg flex-shrink-0">{especie === 'Gato' ? '🐱' : '🐶'}</span>
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
                      {opSel?.emoji} {opSel?.label}{(det[cat.id]?.filter(Boolean).length) ? ` · ${det[cat.id].filter(Boolean).join(', ')}` : ''}
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
                          if (!op.detalle) setDet(p => { const n={...p}; delete n[cat.id]; return n })
                        }}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
                        style={selVal===op.value ? {borderColor:cat.color,background:'rgba(61,214,181,0.08)',borderWidth:'1.5px'} : {background:'#232840',borderColor:'rgba(255,255,255,0.07)',borderWidth:'1.5px'}}>
                        <span className="text-xl">{op.emoji}</span>
                        <span className="text-[10px] text-[#8A8FA8] leading-tight text-center">{op.label}</span>
                      </button>
                    ))}
                  </div>
                  {selVal && opSel?.detalle && (
                    <div className="bg-[#1E2333] rounded-xl p-3 border border-white/8 space-y-3">
                      {opSel.detalle.map((sub, subIdx) => (
                        <div key={subIdx}>
                          <p className="text-xs text-[#8A8FA8] uppercase tracking-wider font-semibold mb-2">{sub.titulo}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {sub.opciones.map(op2 => {
                              const seleccionadoSub = (det[cat.id] || [])[subIdx] === op2.value
                              return (
                                <button key={op2.value}
                                  onClick={() => setDet(p => {
                                    const arr = [...(p[cat.id] || [])]
                                    arr[subIdx] = arr[subIdx] === op2.value ? '' : op2.value
                                    return {...p, [cat.id]: arr}
                                  })}
                                  className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all"
                                  style={seleccionadoSub ? {borderColor:'#F07A30',background:'#F07A3015'} : {background:'#232840',borderColor:'rgba(255,255,255,0.1)'}}>
                                  <span className="text-base">{op2.emoji}</span>
                                  <span className="text-[10px] text-[#8A8FA8] leading-tight text-center">{op2.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
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
          className="w-full bg-[#232840] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none resize-none"/>
      </div>

      <div className="mx-4 mt-4">
        <button onClick={guardar} disabled={loading || !completadas}
          className="w-full bg-[#E8A84C] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">
          {loading ? 'Guardando...' : 'Guardar registro de hoy ✓'}
        </button>
        {!completadas && <p className="text-center text-xs text-[#8A8FA8] mt-2">Selecciona al menos una categoría para guardar</p>}
      </div>

      <BottomNav />
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>}>
      <RegistroContenido />
    </Suspense>
  )
}
